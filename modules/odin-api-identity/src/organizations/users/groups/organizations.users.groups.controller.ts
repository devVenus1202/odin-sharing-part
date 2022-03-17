import { PermissionsGuard } from '@d19n/client/dist/guards/PermissionsGuard';
import { PrincipalGuard } from '@d19n/client/dist/guards/PrincipalGuard';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { HasPermissions } from '@d19n/common/dist/decorators/HasPermissions';
import { Principal } from '@d19n/common/dist/decorators/Principal';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { ApiResponseType } from '@d19n/common/dist/http/types/ApiResponseType';
import { OrganizationUserGroupCreateUpdate } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.create.update';
import { OrganizationUserGroupEntity } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.entity';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { OrganizationUserRbacRoleEntity } from '@d19n/models/dist/identity/organization/user/rbac/role/organization.user.rbac.role.entity';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsUsersGroupsService } from './organizations.users.groups.service';


@ApiTags('Groups')
@ApiBearerAuth()
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 200, type: ApiResponseType, description: '' })
@ApiResponse({ status: 201, type: ApiResponseType, description: '' })
@ApiResponse({ status: 401, type: ExceptionType, description: 'Unauthorized' })
@ApiResponse({ status: 404, type: ExceptionType, description: 'Not found' })
@ApiResponse({ status: 422, type: ExceptionType, description: 'Unprocessable entity validation failed' })
@ApiResponse({ status: 500, type: ExceptionType, description: 'Internal server error' })
@Controller(`/${SERVICE_NAME.IDENTITY_MODULE}/v1.0/rbac/groups`)
export class OrganizationsUsersGroupsController {

    private readonly groupsService: OrganizationsUsersGroupsService;

    public constructor(groupsService: OrganizationsUsersGroupsService) {
        this.groupsService = groupsService;
    }


    @Get()
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.search', 'groups.assign')
    public async getByOrganizationEntity(@Principal() principal: OrganizationUserEntity): Promise<OrganizationUserGroupEntity[]> {
        return await this.groupsService.getByOrganizationEntity(principal.organization);
    }


    @Post()
    @ApiResponse({ status: 201, type: ApiResponseType, description: '' })
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.create')
    public async createByOrganizationEntity(
        @Principal() principal: OrganizationUserEntity,
        @Body() body: OrganizationUserGroupCreateUpdate,
    ): Promise<OrganizationUserGroupEntity> {
        return await this.groupsService.createByOrganizationEntity(principal.organization, body);
    }


    @Post('/:groupId/users/:userId')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.create')
    public async addOrganizationUserEntityByGroupIdAndOrganizationEntity(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<boolean> {
        return await this.groupsService.addOrganizationUserEntityByGroupIdAndOrganizationEntity(
            principal.organization,
            groupId,
            userId,
        );
    }

    @Get('/:groupId/users')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.create')
    public async getOrganizationUserEntitiesByGroupIdAndOrganizationEntity(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
    ): Promise<OrganizationUserGroupEntity[]> {
        return await this.groupsService.getOrganizationUserEntitiesByGroupIdAndOrganizationEntity(
            principal.organization,
            groupId,
        );
    }

    /**
     *
     * @param principal
     * @param groupId
     * @param userIds
     */
    @Post('/:groupId/users')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.create')
    public async assignRoleToUsers(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
        @Body('userIds') userIds: string[],
    ): Promise<OrganizationUserGroupEntity> {
        return await this.groupsService.assignUsersToGroup(principal, groupId, userIds);
    }

    /**
     *
     * @param principal
     * @param groupId
     * @param userIds
     * @param groupIds
     */

    @Post(':groupId/move-users')
    @UseGuards(PrincipalGuard)
    @HasPermissions('groups.create')
    public async moveUsersToGroup(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
        @Body('userIds') userIds: string[],
        @Body('groupIds') groupIds: string[],
    ): Promise<OrganizationUserGroupEntity[]> {
        return await this.groupsService.moveUsersToGroup(principal, groupId, userIds, groupIds);
    }

    @Post('/assign-users')
    @UseGuards(PrincipalGuard)
    @HasPermissions('groups.create')
    public async assignUsersToGroups(
        @Principal() principal: OrganizationUserEntity,
        @Body('userIds') userIds: string[],
        @Body('groupIds') groupIds: string[],
    ): Promise<OrganizationUserGroupEntity[]> {
        return await this.groupsService.assignUsersToGroups(principal, userIds, groupIds);
    }

    @Post('/update-bulk-users')
    @UseGuards(PrincipalGuard)
    @HasPermissions('groups.create')
    public async updateBulkUsers(
        @Principal() principal: OrganizationUserEntity,
        @Body('userIds') userIds: string[],
        @Body('overrideGroups') overrideGroups: string[],
        @Body('addGroups') addGroups: string[],
        @Body('removeGroups') removeGroups: string[],
    ): Promise<OrganizationUserEntity[]> {
        return await this.groupsService.updateBulkUsers(principal, userIds, overrideGroups, addGroups, removeGroups);
    }

    @Get(':groupId')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.get')
    public async getByOrganizationAndId(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId') groupId: string,
    ): Promise<OrganizationUserGroupEntity> {
        return await this.groupsService.getByOrganizationAndId(principal.organization, groupId);
    }

    @Delete(':groupId')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.delete')
    public async deleteByPrincipalAndId(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId') groupId: string,
    ): Promise<any> {
        return await this.groupsService.deleteByPrincipalAndId(principal.organization, groupId);
    }

    //
    // Group links (children)
    //

    /**
     *
     * @param principal
     * @param groupId
     */
    @Get('/:groupId/links')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.get')
    public async listRolesAssignedRoles(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
    ): Promise<OrganizationUserRbacRoleEntity[]> {
        return await this.groupsService.linksGet(principal.organization, groupId);
    }


    /**
     *
     * @param principal
     * @param groupId
     * @param body
     */
    @Post('/:groupId/links')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.create')
    public async assignRoleToRole(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
        @Body() body: any,
    ): Promise<boolean> {
        return await this.groupsService.linkGroupsToGroup(principal, groupId, body.groupIds);
    }


    /**
     *
     * @param principal
     * @param groupId
     * @param linkedGroupId
     */
    @Delete('/:groupId/links/:linkedGroupId')
    @UseGuards(PrincipalGuard, PermissionsGuard)
    @HasPermissions('groups.delete')
    public async removeRoleFromRole(
        @Principal() principal: OrganizationUserEntity,
        @Param('groupId', ParseUUIDPipe) groupId: string,
        @Param('linkedGroupId', ParseUUIDPipe) linkedGroupId: string,
    ): Promise<boolean> {
        return await this.groupsService.linkRemove(principal, groupId, linkedGroupId);
    }

}
