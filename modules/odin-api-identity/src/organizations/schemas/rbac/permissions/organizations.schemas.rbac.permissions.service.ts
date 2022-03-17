import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { OrganizationUserRbacPermissionEntity } from '@d19n/models/dist/identity/organization/user/rbac/permission/organization.user.rbac.permission.entity';
import { ORGANIZATION_USER_RBAC_PERMISSION_TYPE } from '@d19n/models/dist/identity/organization/user/rbac/permission/organization.user.rbac.permission.type';
import { RPC_GET_SCHEMA_BY_ID } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { OrganizationsUsersRbacPermissionsRepository } from 'src/organizations/users/rbac/permissions/organizations.users.rbac.permissions.repository';
import { OrganizationsUsersRbacPermissionsService } from 'src/organizations/users/rbac/permissions/organizations.users.rbac.permissions.service';
import { RBACPermissionCreate } from 'src/organizations/users/rbac/permissions/types/RBACPermissionCreate';
import { OrganizationsUsersRbacRolesService } from 'src/organizations/users/rbac/roles/organizations.users.rbac.roles.service';
import { RBACRoleCreate } from 'src/organizations/users/rbac/roles/types/RBACRoleCreate';
import { Connection } from 'typeorm';
import { RedisClient } from '../../../../common/RedisClient';
import { REDIS_CLIENT } from '../../../../utilities/Constants';

const { SCHEMA_MODULE } = SchemaModuleTypeEnums;

@Injectable()
export class OrganizationsSchemasRbacPermissionsService {

    private readonly amqpConnection: AmqpConnection;
    private readonly permissionsRepository: OrganizationsUsersRbacPermissionsRepository;
    private readonly permissionsService: OrganizationsUsersRbacPermissionsService;
    private redisService: RedisClient;
    private rolesService: OrganizationsUsersRbacRolesService;
    private readonly odinDb: Connection;

    constructor(
        amqpConnection: AmqpConnection,
        @InjectRepository(OrganizationsUsersRbacPermissionsRepository) permissionsRepository: OrganizationsUsersRbacPermissionsRepository,
        permissionsService: OrganizationsUsersRbacPermissionsService,
        @Inject(REDIS_CLIENT) private readonly redisClient: any,
        @Inject(forwardRef(() => OrganizationsUsersRbacRolesService))
            rolesService: OrganizationsUsersRbacRolesService,
        @InjectConnection('odinDbConnection') odinDb: Connection,
    ) {
        this.amqpConnection = amqpConnection;
        this.permissionsRepository = permissionsRepository;
        this.permissionsService = permissionsService;
        this.redisService = new RedisClient(redisClient);
        this.rolesService = rolesService;
        this.odinDb = odinDb
    }


    private async flushAllFromCache() {
        await this.redisService.flushCache();
    }

    public async getSchemaById(
        principal: OrganizationUserEntity,
        schemaId: any,
    ): Promise<SchemaEntity> {
        try {
            // Get schema by id over RPC
            const response = await this.amqpConnection.request<any>({
                exchange: SCHEMA_MODULE,
                routingKey: `${SCHEMA_MODULE}.${RPC_GET_SCHEMA_BY_ID}`,
                payload: {
                    principal,
                    schemaId,
                },
                timeout: 20000,
            });
            await this.flushAllFromCache();
            return response.data;

        } catch (e) {
            throw new ExceptionType(500, e.message);
        }
    }

    /**
     * Batch create new permissions for DB_RECORD.
     *
     * @param principal
     * @param body
     */
    public async batchCreateByPrincipal(
        principal: OrganizationUserEntity,
        schemaId: string,
    ): Promise<OrganizationUserRbacPermissionEntity[]> {
        try {
            let batchCreates = [];
            let adminPermissionIds = [];
            let readOnlyPermissionIds = [];
            const permissions = [
                'get',
                'update',
                'search',
                'delete',
                'create',
                'merge',
            ];
            // Get schema by id RPC call
            const schema: SchemaEntity = await this.getSchemaById(principal, schemaId);
            for(let i in permissions) {
                let data: RBACPermissionCreate = {
                    name:
                        schema.moduleName.toLocaleLowerCase() + '.' +
                        schema.entityName.toLocaleLowerCase() + '.' +
                        permissions[i],
                    description:
                        'OrganizationUserEntity can ' +
                        permissions[i] + ' ' +
                        schema.moduleName + ' ' +
                        schema.entityName + ' ',
                    type: ORGANIZATION_USER_RBAC_PERMISSION_TYPE.DB_RECORD,
                }
                const res: OrganizationUserRbacPermissionEntity = await this.permissionsService.create(
                    principal,
                    data,
                );

                await this.assignPermissionToSchemaEntity(principal, schema, res);

                if(res.name.indexOf('.search') > -1 || res.name.indexOf('.get') > -1) {
                    readOnlyPermissionIds.push(res.id)
                }
                adminPermissionIds.push(res.id)
                batchCreates.push(res);
            }

            const readOnlyRoleCreate: RBACRoleCreate = {
                name: schema.moduleName + schema.entityName + 'ReadOnly',
                description: schema.moduleName + ' ' + schema.entityName + ' ReadOnly',
            }
            console.log('readOnlyPermissionIds', readOnlyPermissionIds)
            console.log('adminPermissionIds', adminPermissionIds)
            // create Role for created Permisisons
            const readOnlyRole = await this.rolesService.createByPrincipal(principal, readOnlyRoleCreate);
            // assign Permisisons to new Role
            await this.rolesService.addPermissionsToRole(principal, readOnlyRole.id, readOnlyPermissionIds)


            const adminRoleCreate: RBACRoleCreate = {
                name: schema.moduleName + schema.entityName + 'Admin',
                description: schema.moduleName + ' ' + schema.entityName + ' Admin',
            }
            // create Role for created Permisisons
            const adminRole = await this.rolesService.createByPrincipal(principal, adminRoleCreate);
            // assign all Permisisons to admin role
            await this.rolesService.addPermissionsToRole(principal, adminRole.id, adminPermissionIds)
            // assin admin Role to User that created the Role
            await this.rolesService.assignToOrganizationUserEntity(principal, adminRole.id, principal.id)

            await this.flushAllFromCache();

            return batchCreates;
        } catch (e) {
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * Create all permissions for a single schema. when enabling access control
     *
     * @param principal
     * @param schema
     * @param permission
     *
     * @return {Promise<boolean>}
     */
    public async assignPermissionToSchemaEntity(
        principal: OrganizationUserEntity,
        schema: any,
        permission: any,
    ): Promise<any> {

        const existingLink = await this.odinDb.query(`
            select * FROM organizations_schemas_permissions_links
            where schema_id = '${schema.id}'
            and permission_id = '${permission.id}'
        `);

        if(!existingLink[0]) {
            const res = await this.permissionsRepository
                .createQueryBuilder()
                .relation(OrganizationUserRbacPermissionEntity, 'schema')
                .of(permission)
                .add(schema);

            await this.flushAllFromCache();
            return res;
        }
    }

    /**
     * Delete permisisons based on the schemaId.
     *
     *
     * @param principal
     * @param schemaId
     */
    public batchDeleteByPrincipalAndId(
        principal: OrganizationUserEntity,
        schemaId: string,
    ): Promise<{ affected: number }> {
        return new Promise(async (resolve, reject) => {
            try {
                const schema = await this.getSchemaById(principal, schemaId);
                let count = 0;
                for(let permission of schema.permissions) {
                    count++;
                    const id = permission.id;
                    const deleteResult = await this.permissionsRepository.delete(
                        { id, organization: principal.organization },
                    );
                }

                // delete Schemas permissions links
                const deletePermissionsLinks = await this.odinDb.query(`
                    DELETE FROM organizations_schemas_permissions_links
                    WHERE schema_id = '${schema.id}'
                    AND organization_id = '${principal.organization.id}'
                `);

                // delete Role connected to Schema
                await this.odinDb.query(`
                    DELETE FROM organizations_users_roles
                    WHERE name ILIKE '%${schema.moduleName + schema.entityName}%'
                    AND organization_id = '${principal.organization.id}'
                `);

                await this.flushAllFromCache();
                return resolve({ affected: count });
            } catch (e) {
                return reject(new ExceptionType(500, e.message));
            }
        });
    }

}
