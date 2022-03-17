import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationEntity } from '@d19n/models/dist/identity/organization/organization.entity';
import { OrganizationUserGroupCreateUpdate } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.create.update';
import { OrganizationUserGroupEntity } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.entity';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { OrganizationUserRbacRoleEntity } from '@d19n/models/dist/identity/organization/user/rbac/role/organization.user.rbac.role.entity';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, In } from 'typeorm';
import { RedisClient } from '../../../common/RedisClient';
import { REDIS_CLIENT } from '../../../utilities/Constants';
import { OrganizationUsersService } from '../organizations.users.service';
import { OrganizationsUsersGroupsRepository } from './organizations.users.groups.repository';
import { OrganizationUserEntityRepository } from '../organizations.users.repository';


@Injectable()
export class OrganizationsUsersGroupsService {
    private readonly groupsRepository: OrganizationsUsersGroupsRepository;
    private readonly usersRepository: OrganizationUserEntityRepository;
    private readonly usersService: OrganizationUsersService;
    private redisService: RedisClient;
    private readonly odinDb: Connection;

    public constructor(
        @InjectConnection('odinDbConnection') odinDb: Connection,
        @Inject(REDIS_CLIENT) private readonly redisClient: any,
        groupsRepository: OrganizationsUsersGroupsRepository,
        usersService: OrganizationUsersService,
        usersRepository: OrganizationUserEntityRepository
    ) {
        this.groupsRepository = groupsRepository;
        this.usersService = usersService;
        this.redisService = new RedisClient(redisClient);
        this.usersRepository = usersRepository;
        this.odinDb = odinDb
    }

    private async flushAllFromCache() {
        await this.redisService.flushCache();
    }

    /**
     *
     * @param organization
     */
    public getByOrganizationEntity(
        organization: OrganizationEntity,
    ): Promise<Array<OrganizationUserGroupEntity>> {
        return new Promise(async (resolve, reject) => {
            const response: void | Array<OrganizationUserGroupEntity> = await this.groupsRepository
                .find({ where: { organization } })
                .catch(reject);
            if (response) {
                return resolve(response);
            }
        });
    }

    /**
     * Retrieve many roles by organization and groupIds
     *
     * @param {OrganizationEntity} organization
     * @param {string[]} groupIds
     *
     * @return {Promise<OrganizationUserRbacRoleEntity>}
     */
    public async getByOrganizationAndGroupIds(
        groupIds: string[],
    ): Promise<OrganizationUserRbacRoleEntity[]> {
        return new Promise(async (resolve, reject) => {
            const groups = await this.groupsRepository.find({
                where: { id: In(groupIds) },
            });
            if (!!groups) {
                return resolve(groups);
            } else {
                return reject(new NotFoundException('could not locate group'));
            }
        });
    }

    /**
     *
     * @param organization
     * @param body
     */
    public createByOrganizationEntity(
        organization: OrganizationEntity,
        body: OrganizationUserGroupCreateUpdate,
    ): Promise<OrganizationUserGroupEntity> {
        return new Promise(async (resolve, reject) => {
            try {
                const group: OrganizationUserGroupEntity = await this.groupsRepository.findOne(
                    { name: body.name },
                );

                if (!!group) {
                    return reject(
                        new ExceptionType(
                            409,
                            'a group with that name already exists',
                        ),
                    );
                }
                const newGroup = new OrganizationUserGroupEntity();
                newGroup.organization = organization;
                newGroup.name = body.name;
                newGroup.description = body.description;
                // newGroup.groups = body.groups;
                const response: OrganizationUserGroupEntity = await this.groupsRepository.save(
                    newGroup,
                );
                return resolve(response);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     *
     * @param organization
     * @param groupId
     */
    public getByOrganizationAndId(
        organization: OrganizationEntity,
        groupId: string,
    ): Promise<OrganizationUserGroupEntity> {
        return new Promise(async (resolve, reject) => {
            const response: void | OrganizationUserGroupEntity = await this.groupsRepository
                .findOne({
                    where: {
                        organization,
                        id: groupId,
                    },
                    join: {
                        alias: 'group',
                        leftJoinAndSelect: {
                            users: 'group.users',
                        },
                    },
                })
                .catch(reject);
            if (response) {
                return resolve(response);
            }
        });
    }

    /**
     *
     * @param organization
     * @param groupIds
     */
    public getByOrganizationAndIds(
        organization: OrganizationEntity,
        groupIds: string[],
    ): Promise<OrganizationUserGroupEntity[]> {
        return new Promise(async (resolve, reject) => {
            const response = await this.groupsRepository
                .find({
                    where: {
                        organization,
                        id: In(groupIds),
                    },
                })
                .catch(reject);
            if (response) {
                return resolve(response);
            }
        });
    }

    /**
     * Get by user id and organization.
     *
     * @param organization
     * @param user
     *
     */
    public getAllByOrganizationUserEntityAndOrganizationEntity(
        organization: OrganizationEntity,
        user: OrganizationUserEntity,
    ): Promise<Array<OrganizationUserGroupEntity>> {
        return new Promise(async (resolve, reject) => {
            const response: void | Array<OrganizationUserGroupEntity> = await this.groupsRepository
                .find({
                    where: {
                        organization,
                        user,
                    },
                })
                .catch(() => {
                    reject(new NotFoundException('could not locate group'));
                });

            if (response) {
                return resolve(response);
            } else {
                reject(new NotFoundException('could not locate group'));
            }
        });
    }

    // /**
    //  *
    //  * @param principal
    //  * @param roleId
    //  * @param userId
    //  */
    // public async assignToOrganizationUserEntity(principal: OrganizationUserEntity, groupId:
    // string, userId: string): Promise<boolean> {  const group = await
    // this.getByOrganizationAndId(principal.organization, groupId); const user = await
    // this.usersService.getOrganizationUserEntityById(userId); user.groups.push(group);
    // console.log(await this.usersService.userRepository.save(user)); return true;  }

    /**
     * Get users belonging to a group id and owning organization.
     *
     * @param organization
     * @param groupId
     * @param userId
     *
     * @return {Promise<OrganizationUserGroupEntity>}
     */
    public async getOrganizationUserEntitiesByGroupIdAndOrganizationEntity(
        organization: OrganizationEntity,
        groupId: string,
    ): Promise<OrganizationUserEntity[]> {
        const group = await this.groupsRepository.findOne({
            where: { organization, id: groupId },
            join: {
                alias: 'group',
                leftJoinAndSelect: {
                    users: 'group.users',
                },
            },
        });
        return group.users;
    }

    /**
     * Add a user to an existing group by owning organization.
     *
     * @param {OrganizationEntity} organization
     * @param {string} groupId
     * @param {string} userId
     *
     * @return {Promise<boolean>}
     */
    public async addOrganizationUserEntityByGroupIdAndOrganizationEntity(
        organization: OrganizationEntity,
        groupId: string,
        userId: string,
    ): Promise<boolean> {
        console.log(1);
        console.log(await this.getByOrganizationAndId(organization, groupId));
        console.log(2);
        console.log(userId);
        // console.log(await this.usersService.getByIdAndPrincipalOrganizationEntity(organization,
        // userId));
        console.log(9999);
        // await this.groupsRepository
        //           .createQueryBuilder()
        //           .relation(OrganizationUserGroupEntity, 'users')
        //           .of(await this.getByOrganizationAndId(organization, groupId))
        //           .add(await
        // this.usersService.getByIdAndPrincipalOrganizationEntity(organization, userId));
        return true;
    }

    /**
     *
     * @param organization
     * @param recordId
     */
    public async deleteByPrincipalAndId(
        organization: OrganizationEntity,
        recordId: string,
    ): Promise<any> {
        return new Promise(async resolve => {
            // Delete the record
            const dbRecord = await this.groupsRepository.delete({
                id: recordId,
            });
            if (!dbRecord) {
                return resolve({
                    status: 'FAILED',
                    message: 'failed to delete group',
                });
            }
            return resolve({
                status: 'DELETED',
                message: 'successfully deleted group',
            });
        });
    }

    //
    // Group links (children)
    //

    /**
     * Retrieve the children of a specific group.
     *
     * @param {OrganizationEntity} organization
     * @param {string} groupId
     *
     * @returns {Promise<Array<OrganizationUserGroupEntity>>}
     */
    public async childrenGet(
        organization: OrganizationEntity,
        groupId: string,
    ): Promise<Array<OrganizationUserGroupEntity>> {
        // await
        // this.groupsRepository.createQueryBuilder('group').innerJoinAndSelect('group.groups',
        // 'children').getMany().then(v => console.log(v)).catch(e => console.log(e));  await
        // this.groupsRepository.find({  where: { id: groupId, organization }, relations: [
        // 'groups' ]  }).catch(e => console.log(e));
        const group = await this.groupsRepository.findOne({
            where: { id: groupId, organization },
            relations: ['groups'],
        });
        console.log(group);
        return group.groups;
    }

    /**
     * Add a child group to an existing group.
     *
     * @param {OrganizationEntity} organization
     * @param {string} groupId
     * @param {string} childGroupId
     *
     * @returns {Promise<OrganizationUserGroupEntity>}
     */
    public async childAdd(
        organization: OrganizationEntity,
        groupId: string,
        childGroupId: string,
    ): Promise<boolean> {
        await this.groupsRepository
            .createQueryBuilder()
            .relation(OrganizationUserGroupEntity, 'groups')
            .of(await this.getByOrganizationAndId(organization, groupId))
            .add(await this.getByOrganizationAndId(organization, childGroupId));

        return true;
    }

    /**
     * Remove a child group from an existing group.
     *
     * @param {OrganizationEntity} organization
     * @param {string} groupId
     * @param {string} childGroupId
     *
     * @returns {Promise<OrganizationUserGroupEntity>}
     */
    public async childRemove(
        organization: OrganizationEntity,
        groupId: string,
        childGroupId: string,
    ): Promise<boolean> {
        await this.groupsRepository
            .createQueryBuilder()
            .delete()
            .from(OrganizationUserGroupEntity)
            .relation(OrganizationUserGroupEntity, 'groups')
            .of(await this.getByOrganizationAndId(organization, groupId))
            .remove(
                await this.getByOrganizationAndId(organization, childGroupId),
            );
        return true;
    }

    /**
     * Add a multiple users to a group.
     *
     * @param principal
     * @param groupId
     * @param userIds
     *
     * @return {Promise<OrganizationUserGroupEntity>}
     */
    public async assignUsersToGroup(
        principal: OrganizationUserEntity,
        groupId: string,
        userIds: string[],
    ): Promise<OrganizationUserGroupEntity> {
        return new Promise(async (resolve, reject) => {
            try {
                const group = await this.getByOrganizationAndId(
                    principal.organization,
                    groupId,
                );
                if (userIds && userIds.length) {
                    const users = await this.usersService.getByOrganizationAndUserIds(
                        principal.organization,
                        userIds,
                    );
                    group.users = users;
                } else {
                    group.users = [];
                }
                const res = await this.groupsRepository.save(group);
                return resolve(res);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Move a multiple users from one group to another group.
     *
     * @param principal
     * @param groupId
     * @param userIds
     * @param groupIds
     * @return {Promise<OrganizationUserGroupEntity[]>}
     */
    public async moveUsersToGroup(
        principal: OrganizationUserEntity,
        groupId: string,
        userIds: string[],
        groupIds: string[]
    ): Promise<OrganizationUserGroupEntity[]> {
        return new Promise(async (resolve, reject) => {
            try {
                let results = [];
                if (userIds && userIds.length && groupIds && groupIds.length) {
                    results = await this.assignUsersToGroups(principal, userIds, groupIds);
                    const orignalGroup = await this.getByOrganizationAndId(
                        principal.organization,
                        groupId,
                    );
                    orignalGroup.users = orignalGroup.users.filter(user => userIds.indexOf(user.id) < 0);
                    await this.groupsRepository.save(orignalGroup);
                }
                return resolve(results);
            } catch (e) {
                console.log("e", e.message);
                return reject(new ExceptionType(500, e.message));
            }
        });

    }

    /**
     * Add a multiple users to multiple group.
     *
     * @param principal
     * @param groupId
     * @param userIds
     * @param groupIds
     * @return {Promise<OrganizationUserGroupEntity[]>}
     */
    public async assignUsersToGroups(
        principal: OrganizationUserEntity,
        userIds: string[],
        groupIds: string[]
    ): Promise<OrganizationUserGroupEntity[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const results = [];
                if (userIds && userIds.length && groupIds && groupIds.length) {
                    const groups = await this.getByOrganizationAndIds(
                        principal.organization,
                        groupIds,
                    );
                    const users = await this.usersService.getByOrganizationAndUserIds(
                        principal.organization,
                        userIds,
                    );
                    for (let group of groups) {
                        if (group.users) {
                            users.forEach(user => {
                                if (group.users.findIndex(it => it.id === user.id) < 0) {
                                    group.users.push(user);
                                }
                            })
                        } else {
                            group.users = users;
                        }
                        const res = await this.groupsRepository.save(group);
                        results.push(res);
                    }
                }
                return resolve(results);
            } catch (e) {
                console.log("e", e.message);
                return reject(new ExceptionType(500, e.message));
            }
        });

    }


    /**
     * Add a multiple users to multiple group.
     *
     * @param principal
     * @param groupId
     * @param userIds
     * @param overrideGroups
     * @param addGroups
     * @param removeGroups
     * @return {Promise<OrganizationUserGroupEntity[]>}
     */
    public async updateBulkUsers(
        principal: OrganizationUserEntity,
        userIds: string[],
        overrideGroups: string[],
        addGroups: string[],
        removeGroups: string[],
    ): Promise<OrganizationUserEntity[]> {
        return new Promise(async (resolve, reject) => {
            console.log("user", userIds)
            try {
                const users = await this.usersService.getByOrganizationAndUserIds(
                    principal.organization,
                    userIds,
                );
                for (let user of users) {
                    if (overrideGroups && overrideGroups.length > 0) {
                        const groups = await this.getByOrganizationAndIds(
                            principal.organization,
                            overrideGroups,
                        );
                        user.groups = groups;
                        this.usersRepository.save(user);
                    } else {
                        if (removeGroups && removeGroups.length > 0) {
                            user.groups = user.groups.filter(group => removeGroups.indexOf(group.id) < 0)
                        }
                        if (addGroups) {
                            const newGroupIds = addGroups.filter(groupId => user.groups.findIndex(group => group.id === groupId) < 0)
                            const newGroups = await this.getByOrganizationAndIds(
                                principal.organization,
                                newGroupIds,
                            );
                            user.groups = [...user.groups, ...newGroups];
                            this.usersRepository.save(user);
                        }
                    }
                }

                return resolve(users);
            } catch (e) {
                console.error(e);
                return reject(new ExceptionType(500, e.message));
            }
        });

    }


    /**
     *
     * @param organization
     * @param groupId
     */
    async linksGet(organization: OrganizationEntity, groupId: string): Promise<Array<OrganizationUserGroupEntity>> {
        return new Promise(async (resolve, reject) => {
            try {
                const entity = await this.groupsRepository.findOne({
                    where: { id: groupId, organization },
                    relations: ['groups'],
                });
                return resolve(entity.groups);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Link a group to a group.
     *
     * @param {OrganizationUserEntity} principal
     * @param groupId
     * @param {string} linkedGroupIds
     *
     * @return {Promise<boolean>}
     */
    public async linkGroupsToGroup(
        principal: OrganizationUserEntity,
        groupId: string,
        linkedGroupIds: string[],
    ): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {

                await this.groupsRepository
                    .createQueryBuilder()
                    .relation(OrganizationUserGroupEntity, 'groups')
                    .of(groupId)
                    .add(linkedGroupIds);

                await this.flushAllFromCache();

                return resolve(true);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Remove a linked group from a group
     *
     * @param {OrganizationUserEntity} principal
     * @param {string} parentRoleId
     * @param {string} linkedGroupId
     *
     * @return {Promise<boolean>}
     */
    public async linkRemove(
        principal: OrganizationUserEntity,
        parentRoleId: string,
        linkedGroupId: string,
    ): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                const parentRole: OrganizationUserGroupEntity = await this.getByOrganizationAndId(
                    principal.organization,
                    parentRoleId,
                );
                const childRole: OrganizationUserGroupEntity = await this.getByOrganizationAndId(
                    principal.organization,
                    linkedGroupId,
                );
                await this.groupsRepository
                    .createQueryBuilder()
                    .delete()
                    .from(OrganizationUserGroupEntity)
                    .relation(OrganizationUserGroupEntity, 'groups')
                    .of(parentRole)
                    .remove(childRole);

                await this.flushAllFromCache();

                return resolve(true);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Retrieve an existing role by userId
     *
     * @param {string} userIds
     *
     * @return {Promise<string[]>}
     */
    public async getGroupsAndLinkedGroupsByUserId(
        userId: string,
    ): Promise<string[]> {
        return new Promise(async (resolve, reject) => {

            const groups = await this.odinDb.query(`
            SELECT organizations_users_groups_id
            FROM organizations_users_groups_assignments
            WHERE organizations_users_id = '${userId}'`)

            const linkedGroups = await this.odinDb.query(`
            SELECT id_2
            FROM organizations_users_groups_children_links
            WHERE id_1 IN (
                    SELECT organizations_users_groups_id
                    FROM organizations_users_groups_assignments
                    WHERE organizations_users_id = '${userId}'
            )`)

            const allGroups = [];

            // add group ids
            for (const group of groups) {
                allGroups.push(group.organizations_users_groups_id);
            }

            // add linked group ids
            for (const linkedGroup of linkedGroups) {
                allGroups.push(linkedGroup.id_2);
            }

            const uniqueGroups = [...new Set(allGroups)];

            if (!!groups) {

                return resolve(uniqueGroups);

            } else {

                return reject(new NotFoundException('could not locate group'));

            }
        });
    }


}
