import { ZendeskUsersService } from '@d19n/client/dist/zendesk/users/zendesk.users.service';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationEntity } from '@d19n/models/dist/identity/organization/organization.entity';
import { OrganizationUserCreate } from '@d19n/models/dist/identity/organization/user/organization.user.create';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { OrganizationUserStatus } from '@d19n/models/dist/identity/organization/user/organization.user.status';
import { OrganizationUserUpdate } from '@d19n/models/dist/identity/organization/user/organization.user.update';
import { IdentityOrganizationUserChangePassword } from '@d19n/models/dist/identity/organization/user/types/identity.organization.user.change.password';
import { IdentityOrganizationUserForgotPassword } from '@d19n/models/dist/identity/organization/user/types/identity.organization.user.forgot.password';
import { IdentityOrganizationUserLogin } from '@d19n/models/dist/identity/organization/user/types/identity.organization.user.login';
import {
    IdentityOrganizationUserCompleteRegistration,
    IdentityOrganizationUserRegister,
    IdentityOrganizationUserSendRegistrationLink,
} from '@d19n/models/dist/identity/organization/user/types/identity.organization.user.register';
import { IdentityOrganizationUserResetPassword } from '@d19n/models/dist/identity/organization/user/types/identity.organization.user.reset.password';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { SUB_SEND_DYNAMIC_EMAIL } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { DeleteResult, In } from 'typeorm';
import { RedisClient } from '../../common/RedisClient';
import { REDIS_CLIENT } from '../../utilities/Constants';
import { OrganizationEntitysService } from '../organizations.service';
import { OrganizationsUsersGroupsService } from './groups/organizations.users.groups.service';
import { SanitizeUser } from './helpers/sanitize.user';
import { OrganizationUserEntityRepository } from './organizations.users.repository';
import { OrganizationsUsersRbacService } from './rbac/organizations.users.rbac.service';
import { OrganizationsUsersRbacRolesService } from './rbac/roles/organizations.users.rbac.roles.service';

const { NOTIFICATION_MODULE } = SchemaModuleTypeEnums;

dotenv.config();

@Injectable()
export class OrganizationUsersService extends SanitizeUser {
    public readonly userRepository: OrganizationUserEntityRepository;
    private readonly organizationsService: OrganizationEntitysService;
    private groupsService: OrganizationsUsersGroupsService;
    private rbacService: OrganizationsUsersRbacService;
    private redisService: RedisClient;
    private rolesService: OrganizationsUsersRbacRolesService;
    private readonly amqpConnection: AmqpConnection;
    private zendeskUsersService: ZendeskUsersService;

    public constructor(
        @InjectRepository(OrganizationUserEntity) userRepository: OrganizationUserEntityRepository,
        @Inject(forwardRef(() => OrganizationsUsersRbacService)) rbacService: OrganizationsUsersRbacService,
        @Inject(forwardRef(() => OrganizationsUsersRbacRolesService)) rolesService: OrganizationsUsersRbacRolesService,
        @Inject(REDIS_CLIENT) private readonly redisClient: any, organizationsService: OrganizationEntitysService,
        @Inject(forwardRef(() => OrganizationsUsersGroupsService)) groupsService: OrganizationsUsersGroupsService,
        amqpConnection: AmqpConnection,
        @Inject(forwardRef(() => ZendeskUsersService)) zendeskUsersService: ZendeskUsersService,
    ) {
        super();

        this.rbacService = rbacService;
        this.userRepository = userRepository;
        this.organizationsService = organizationsService;
        this.groupsService = groupsService;
        this.redisService = new RedisClient(redisClient);
        this.rolesService = rolesService;
        this.amqpConnection = amqpConnection;
        this.zendeskUsersService = zendeskUsersService;
    }

    public async removeAllFromCache(userId: string) {
        const cacheKey1 = `/my/${userId}`;
        await this.redisService.removeFromCache(cacheKey1);
    }

    /**
     * Creates a user account only if the email address doesn't exist.
     *
     * @param {OrganizationUserEntity} user
     * @returns {Promise<OrganizationUserEntity>}
     *
     */
    public async create(
        user: OrganizationUserEntity,
    ): Promise<OrganizationUserEntity> {
        if (await this.getByEmail(user.email)) {
            throw new ExceptionType(409, 'conflict, email already exists');
        } else {
            return this.userRepository.save(user);
        }
    }

    /**
     * Returns a user object (typically used for getting a profile via /my).
     *
     */
    public getOrganizationUserEntityById(
        userId: string,
    ): Promise<OrganizationUserEntity> {
        return new Promise(async (resolve, reject) => {
            try {

                const cacheKey = `/my/${userId}`;
                console.log('getOrganizationUserEntityById check', cacheKey)
                const cached = await this.redisService.getFromCache<OrganizationUserEntity>(cacheKey);

                if (cached) {
                    return resolve(cached);
                }

                console.log('getOrganizationUserEntityById get user::112')

                // find the user
                const user = await this.userRepository.findOne({
                    where: { id: userId },
                });

                console.log('getOrganizationUserEntityById get groups::119')
                const groupIds = await this.groupsService.getGroupsAndLinkedGroupsByUserId(userId);
                const groups = await this.groupsService.getByOrganizationAndGroupIds(groupIds);
                user.groups = groups;

                console.log('getOrganizationUserEntityById get roles::124')
                const roleIds = await this.rolesService.getRolesAndLinkedRolesByUserId(userId);
                const roles = await this.rolesService.getByOrganizationAndRoleIds(roleIds);
                user.roles = roles;

                if (!user) {
                    return reject(
                        new ExceptionType(404, 'could not locate user'),
                    );
                }
                const sanitized = this.sanitizeUser(user);
                // save to cache
                await this.redisService.saveToCache<OrganizationUserEntity>(cacheKey, sanitized);
                return resolve(sanitized);
            } catch (e) {
                console.error(e);
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Retrieve a user object ONLY if the email and password matches.
     * Note: This will take the plaintext password and automatically encrypt it!
     * @param {string} email
     *
     */
    public async getByEmail(email: string): Promise<OrganizationUserEntity> {
        try {
            return this.userRepository.findOne({
                where: { email },
            });
        } catch (e) {
            console.error(e)
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Retrieve an existing user by contactId.
     *
     * @param {string} contactId
     *
     */
    public getByContactId(
        contactId: string,
    ): Promise<OrganizationUserEntity> {
        try {
            return this.userRepository.findOne({
                where: { contactId },
            });
        } catch (e) {
            console.error(e)
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Retrieve all users based on the owning organization.
     * @param {OrganizationEntity} organization
     */
    public async getByOrganizationEntity(
        organization: OrganizationEntity,
    ): Promise<OrganizationUserEntity[]> {
        try {
            const res = await this.userRepository.find({
                where: { organization },
            });
            return this.sanitizeUsers(res);
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Retrieve an existing users by organization and userIds.
     *
     * @param {OrganizationEntity} organization
     * @param {string[]} userIds
     *
     */
    public getByOrganizationAndUserIds(
        organization: OrganizationEntity,
        userIds: string[],
    ): Promise<OrganizationUserEntity[]> {
        return new Promise(async (resolve, reject) => {
            const users = await this.userRepository.find({
                where: { id: In(userIds) },
            });
            if (!!users) {
                return resolve(users);
            } else {
                return reject(new NotFoundException('could not locate user'));
            }
        });
    }

    /**
     * Retrieve a specific user based on the owning organization.
     * @param {OrganizationEntity} organization
     * @param id
     */
    public async getByIdAndPrincipalOrganizationEntity(
        organization: OrganizationEntity,
        id: string,
    ): Promise<OrganizationUserEntity> {
        try {
            const res = await this.userRepository.findOne({
                where: { id, organization },
            });
            return this.sanitizeUser(res);
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * OrganizationUserEntity login.
     */
    public async login(
        userLogin: IdentityOrganizationUserLogin,
    ): Promise<OrganizationUserEntity> {
        return new Promise(async (resolve, reject) => {

            console.log('email', userLogin.email.trim().toLowerCase())

            const user = await this.getByEmail(userLogin.email.trim().toLowerCase());

            if (user) {
                const verifyPassword = await bcrypt.compare(
                    userLogin.password.trim(),
                    user.password,
                );
                if (!verifyPassword) {
                    return reject(new ExceptionType(401, 'password incorrect'));
                }

                // remove the previous users cached key
                await this.removeAllFromCache(user.id);

                if (user.contactId && !user.zendeskUserId) {
                    const zdUsers = await this.zendeskUsersService.searchUsers(user, { external_id: user.contactId })
                    if (zdUsers.length > 0) {
                        user.zendeskUserId = zdUsers[0].id;
                        this.userRepository.save(user);
                    }
                }
                return resolve(user);
            } else {
                console.log(`cannot find user with email address ${userLogin.email.trim().toLowerCase()}`)
                return reject(new ExceptionType(
                    404,
                    `cannot find user with email address ${userLogin.email.trim().toLowerCase()}`,
                ))
            }
        });
    }

    /**
     * Registers a new user by creating both the organization and user.
     */
    public async register(
        userRegister: IdentityOrganizationUserRegister,
    ): Promise<OrganizationUserEntity> {
        try {
            //
            // First create organization so we can later assignToOrganizationUserEntity it to the
            // user record that we'll created.
            //
            const _organization: OrganizationEntity = new OrganizationEntity();
            _organization.name = userRegister.organizationName;
            let organization: OrganizationEntity = await this.organizationsService.create(
                _organization,
            );
            //
            // Create user assigning the organization to it.
            //
            const _user: OrganizationUserEntity = new OrganizationUserEntity();
            _user.status = OrganizationUserStatus.PENDING_CONFIRMATION;
            _user.organization = organization;
            _user.email = userRegister.email.trim().toLowerCase();
            _user.firstname = userRegister.firstname;
            _user.lastname = userRegister.lastname;
            _user.password = userRegister.password;

            const res: OrganizationUserEntity = await this.create(_user);

            await this.rbacService.initializeAdmin(res);
            // generate token with an expiration of 24 hours
            const token = jwt.sign(
                { id: res.id },
                process.env.JWT_TOKEN_SECRET,
                { expiresIn: 86400 },
            );

            jwt.verify(token, process.env.JWT_TOKEN_SECRET);

            return this.sanitizeUser(res);
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * update a user
     * @param principal
     * @param userId
     * @param body
     */
    public async updateByPrincipalAndId(
        principal: OrganizationUserEntity,
        userId: string,
        body: OrganizationUserUpdate,
    ): Promise<OrganizationUserEntity> {
        try {
            const userRecord = await this.getByIdAndPrincipalOrganizationEntity(principal.organization, userId);
            userRecord.firstname = body.firstname;
            userRecord.lastname = body.lastname;
            userRecord.status = OrganizationUserStatus[body.status];
            userRecord.email = !!body.email ? body.email.trim().toLowerCase() : null;
            if (body.zendeskUserId) {
                userRecord.zendeskUserId = Number(body.zendeskUserId);
            }
            const res = await this.userRepository.save(userRecord);
            await this.removeAllFromCache(userId);
            return this.sanitizeUser(res);
        } catch (e) {
            throw new ExceptionType(
                404,
                'could not locate any user with that email',
            );
        }
    }

    /**
     * activate a user after registration by Id
     * @param userId
     */
    public async activateOrganizationUserEntityById(
        userId: string,
    ): Promise<OrganizationUserEntity> {
        try {
            const userRecord = await this.userRepository.findOne({
                id: userId,
            });
            if (!userRecord) {
                throw new ExceptionType(404, 'could not activate user');
            }

            userRecord.status = OrganizationUserStatus.ACTIVE;
            userRecord.emailVerified = true;

            const res = await this.userRepository.save(userRecord);
            await this.removeAllFromCache(userId);
            return this.sanitizeUser(res);
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * changing users password
     * @param principal
     * @param changePassword
     */
    public async changePassword(
        principal: OrganizationUserEntity,
        changePassword: IdentityOrganizationUserChangePassword,
    ): Promise<OrganizationUserEntity> {
        try {
            const user = await this.getByEmail(changePassword.email);
            if (!user) {
                throw new ExceptionType(
                    404,
                    'could not locate user with that email',
                );
            }

            if (changePassword.password !== changePassword.confirmPassword) {
                throw new ExceptionType(404, 'passwords do not match');
            }

            user.password = changePassword.password;
            const res = await this.userRepository.save(user);

            await this.removeAllFromCache(user.id);

            return this.sanitizeUser(res);
        } catch (e) {
            console.error(e);
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * changing users password
     * @param body
     */
    public async forgotPasswordByEmail(
        body: IdentityOrganizationUserForgotPassword,
    ): Promise<OrganizationUserEntity> {
        try {
            const user = await this.getByEmail(body.email);
            if (!user) {
                throw new ExceptionType(
                    404,
                    'could not locate user with that email',
                );
            }
            // generate token with an expiration of 15 minutes
            const token = jwt.sign(
                { id: user.id },
                process.env.JWT_TOKEN_SECRET,
                { expiresIn: 900 },
            );

            const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);

            // send the email with password reset link
            const resetLink = `${user.organization.webUrl}reset-password/${token}`;

            const response = await this.amqpConnection.request<any>({
                exchange: NOTIFICATION_MODULE,
                routingKey: `${NOTIFICATION_MODULE}.SendResetPasswordEmail`,
                payload: {
                    principal: user,
                    body: {
                        to: user.email,
                        from: 'no-reply@odinsystems.com',
                        subject: `${user.organization.name} password reset`,
                        body: 'link expires in 15 minutes',
                        resetLink: resetLink,
                    },
                },
                timeout: 10000,
            });

            return this.sanitizeUser(user);

        } catch (e) {
            console.error(e);
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * changing users password
     * @param userId
     * @param resetPassword
     */
    public async resetPassword(
        userId: string,
        resetPassword: IdentityOrganizationUserResetPassword,
    ): Promise<OrganizationUserEntity> {
        try {
            const user = await this.userRepository.findOne({
                id: userId,
            });

            if (resetPassword.password !== resetPassword.confirmPassword) {
                throw new ExceptionType(404, 'no user found with that id');
            }

            user.password = resetPassword.password;
            const res = await this.userRepository.save(user);
            await this.removeAllFromCache(user.id);

            return this.sanitizeUser(res);
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Sending registration link for new user
     * @param body
     */
    public async sendRegistrationLink(
        principal: OrganizationUserEntity,
        body: IdentityOrganizationUserSendRegistrationLink,
        currentUserId: string,
    ): Promise<{ expiresIn: number, token: string }> {
        try {

            // check if user with specified already exists
            if (body.email) {
                const user = await this.getByEmail(body.email);
                if (user) {
                    throw new ExceptionType(
                        400,
                        'user with that email already exists',
                    );
                }
            } else {
                throw new ExceptionType(
                    400,
                    'email was not specified',
                );
            }
            /**/
            // check if role exists
            if (body.roleId) {
                const roles = await this.rolesService.getByOrganizationAndRoleIds([ body.roleId ]);
                if (roles.length === 0) {
                    throw new ExceptionType(
                        404,
                        'role does not exist',
                    );
                }
            } else if (body.contactId) {  // For external users
                const externalUserRole = await this.rolesService.getByOrganizationAndName(
                    principal.organization,
                    'ExternalCustomerAccess',
                );
                if (!externalUserRole) {
                    throw new ExceptionType(
                        404,
                        'role does not exist',
                    );
                }
                body.roleId = externalUserRole.id; //set roleId to the body
            } else {
                throw new ExceptionType(
                    404,
                    'role does not exist',
                );
            }
            // generate token
            const expiresInDays = 7;
            const expiresIn = 60 * 60 * 24 * expiresInDays;
            const token = jwt.sign(
                { email: body.email, roleId: body.roleId, organizationId: principal.organization.id },
                process.env.JWT_TOKEN_SECRET,
                { expiresIn },
            );

            const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);

            // send the email with registration link
            let registrationLink = '';
            if (body.contactId) {
                const contactIdUser = await this.getByContactId(body.contactId);
                if (contactIdUser) {
                    throw new ExceptionType(
                        400,
                        'user with that contact id already exists',
                    );
                }
                const expiresIn = 86400;
                const tempAuthToken = jwt.sign(
                    { id: currentUserId },
                    process.env.JWT_TOKEN_SECRET,
                    { expiresIn },
                );
                registrationLink = `${principal.organization.webUrl}register/${token}/${tempAuthToken}/${body.contactId}`;
            } else {
                registrationLink = `${principal.organization.webUrl}register/${token}`;
            }

            const newEmail = new SendgridEmailEntity();
            newEmail.to = body.email;
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL';
            newEmail.dynamicTemplateData = {
                recordId: body.contactId,
                subject: `Registration link`,
                body: `Link expires in ${expiresInDays} days: ${registrationLink}`,
            };

            await this.amqpConnection.publish(NOTIFICATION_MODULE, `${NOTIFICATION_MODULE}.${SUB_SEND_DYNAMIC_EMAIL}`,
                {
                    principal,
                    body: newEmail,
                },
            );
            /**/

            return { expiresIn, token };

        } catch (e) {
            console.error(e);
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Generate registration link for new user
     * @param body
     */
    public async generateRegistrationLink(
        body: any,
    ): Promise<{ expiresIn: number, token: string }> {
        try {

            // check if user with specified already exists
            if (body.email) {
                const user = await this.getByEmail(body.email);
                if (user) {
                    throw new ExceptionType(
                        400,
                        'user with that email already exists',
                    );
                }
            } else {
                throw new ExceptionType(
                    400,
                    'email was not specified',
                );
            }
            /**/
            // check if role exists
            if (body.roleId) {
                const roles = await this.rolesService.getByOrganizationAndRoleIds([ body.roleId ]);
                if (roles.length === 0) {
                    throw new ExceptionType(
                        404,
                        'role does not exist',
                    );
                }
            }
            // generate token
            const expiresInDays = 7;
            const expiresIn = 60 * 60 * 24 * expiresInDays;
            const token = jwt.sign(
                { email: body.email, roleId: body.roleId, organizationId: body.organizationId },
                process.env.JWT_TOKEN_SECRET,
                { expiresIn },
            );

            return { expiresIn, token };

        } catch (e) {
            console.error(e);
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Creating a new user and assign them to role and organization
     * @param body
     * @param email
     * @param roleId
     * @param organizationId
     */
    public async registerAndAssignToRoleAndOrganization(
        body: IdentityOrganizationUserCompleteRegistration,
        email: string,
        roleId: string,
        organizationId: string,
    ): Promise<OrganizationUserEntity> {
        try {
            // get organization
            const organization = await this.organizationsService.getOrganizationByPrincipalAndId(
                undefined,
                organizationId,
            );
            if (!organization) {
                throw new ExceptionType(
                    404,
                    'organization does not exist',
                );
            }

            // check if role exists
            const roles = await this.rolesService.getByOrganizationAndRoleIds([ roleId ]);
            if (roles.length === 0) {
                throw new ExceptionType(
                    404,
                    'role does not exist',
                );
            }

            // check if user with specified already exists
            const checkUser = await this.getByEmail(email);
            if (checkUser) {
                throw new ExceptionType(
                    400,
                    'user with that email already exists',
                );
            }

            // create user assigning the organization and role to it
            const user = new OrganizationUserEntity();
            user.status = OrganizationUserStatus.ACTIVE;
            user.organization = organization;
            user.roles = roles;
            user.email = email.trim().toLowerCase();
            user.emailVerified = true;
            user.firstname = body.firstname;
            user.lastname = body.lastname;
            user.password = body.password;
            user.contactId = body.contactId ?? null;
            const res = await this.create(user);

            return this.sanitizeUser(res);
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param body
     */
    public createByOrganizationEntity(
        principal: OrganizationUserEntity,
        body: OrganizationUserCreate,
    ): Promise<OrganizationUserEntity> {
        return new Promise(async (resolve, reject) => {
            try {
                const user = new OrganizationUserEntity();
                user.organization = principal.organization;
                user.status = OrganizationUserStatus.ACTIVE;
                user.firstname = body.firstname;
                user.lastname = body.lastname;
                user.email = body.email.trim().toLowerCase();
                user.password = body.password;
                user.isBetaTester = false;

                const res = await this.create(user);
                return resolve(this.sanitizeUser(res));
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Add a group assignment to user by owning principal organization.
     *
     * @param {OrganizationUserEntity} principal
     * @param {string} userId
     * @param groupIds
     *
     * @return {Promise<void>}
     */
    public async groupAdd(
        principal: OrganizationUserEntity,
        userId: string,
        groupIds: string[],
    ): Promise<OrganizationUserEntity> {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getByIdAndPrincipalOrganizationEntity(
                    principal.organization,
                    userId,
                );

                if (groupIds && groupIds.length) {
                    const groups = await this.groupsService.getByOrganizationAndIds(
                        principal.organization,
                        groupIds,
                    );
                    user.groups = groups;
                } else {
                    user.groups = [];
                }
                const res = await this.userRepository.save(user);

                await this.removeAllFromCache(user.id);
                return resolve(res);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Remove a group assignment from user by owning principal organization.
     *
     * @param {OrganizationUserEntity} principal
     * @param {string} userId
     * @param {string} groupId
     *
     * @return {Promise<void>}
     */
    public async groupRemove(
        principal: OrganizationUserEntity,
        userId: string,
        groupId: string,
    ): Promise<boolean> {
        try {
            await this.userRepository
                .createQueryBuilder()
                .delete()
                .from(OrganizationUserEntity)
                .relation(OrganizationUserEntity, 'groups')
                .of(
                    await this.getByIdAndPrincipalOrganizationEntity(
                        principal.organization,
                        userId,
                    ),
                )
                .remove(
                    await this.groupsService.getByOrganizationAndId(
                        principal.organization,
                        groupId,
                    ),
                );

            await this.removeAllFromCache(userId);

            return true;
        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Delete schema by id and owning organization.
     *
     * @param principal
     * @param userId
     *
     */
    public deleteByPrincipalAndId(
        principal: OrganizationUserEntity,
        userId: string,
    ): Promise<{ affected: number }> {
        return new Promise(async (resolve, reject) => {
            try {
                const deleteResult: DeleteResult = await this.userRepository.delete(
                    {
                        id: userId,
                    },
                );
                if (deleteResult.affected < 1) {
                    return reject(new ExceptionType(500, 'no records deleted'));
                }

                await this.removeAllFromCache(userId);
                return resolve({ affected: deleteResult.affected });
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

    /**
     * Add a multiple roles to a user.
     *
     * @param principal
     * @param userId
     * @param roleIds
     *
     * @return {Promise<OrganizationUserEntity>}
     */
    public async addRolesToUser(
        principal: OrganizationUserEntity,
        userId: string,
        roleIds: string[],
    ): Promise<OrganizationUserEntity> {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getByIdAndPrincipalOrganizationEntity(
                    principal.organization,
                    userId,
                );

                if (roleIds && roleIds.length) {
                    const roles = await this.rolesService.getByOrganizationAndRoleIds(
                        roleIds,
                    );
                    user.roles = roles;
                } else {
                    user.roles = [];
                }
                const res = await this.userRepository.save(user);

                await this.removeAllFromCache(userId);

                return resolve(res);
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }
}
