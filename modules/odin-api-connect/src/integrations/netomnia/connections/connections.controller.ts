import { PrincipalGuard } from '@d19n/client/dist/guards/PrincipalGuard';
import { Principal } from '@d19n/common/dist/decorators/Principal';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { ApiResponseType } from '@d19n/common/dist/http/types/ApiResponseType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Body } from '@nestjs/common/decorators/http/route-params.decorator';
import { ApiBearerAuth, ApiConsumes, ApiParam, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';


@ApiTags('Automated Connections')
@ApiBearerAuth()
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 200, type: ApiResponseType, description: '' })
@ApiResponse({ status: 201, type: ApiResponseType, description: '' })
@ApiResponse({ status: 401, type: ExceptionType, description: 'Unauthorized' })
@ApiResponse({ status: 404, type: ExceptionType, description: 'Not found' })
@ApiResponse({ status: 422, type: ExceptionType, description: 'Unprocessable entity validation failed' })
@ApiResponse({ status: 500, type: ExceptionType, description: 'Internal server error' })
@Controller(`${process.env.MODULE_NAME}/connections`)
export class ConnectionsController {

    constructor(
        private readonly connectionsService: ConnectionsService,
    ) {
        this.connectionsService = connectionsService;
    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param exPolygonId
     */
    @Get('menu-options/:exPolygonId')
    @ApiParam({ name: 'exPolygonId', example: '41123', required: false })
    @UseGuards(PrincipalGuard)
    public async getFiberConnectionDropdownOptions(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('exPolygonId') exPolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.getFiberConnectionDropdownOptions(principal, exPolygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     * @param l2PolygonId
     */
    @Get('check/:l0ClosureId')
    @ApiParam({ name: 'l0ClosureId', example: '26157', required: false })
    @ApiQuery({ name: 'l1PolygonId', example: '26157', required: false })
    @ApiQuery({ name: 'l2PolygonId', example: '12342', required: false })
    @UseGuards(PrincipalGuard)
    public async checkClosures(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Query('l1PolygonId') l1PolygonId: string,
        @Query('l2PolygonId') l2PolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.checkClosures(principal, l0ClosureId, l1PolygonId, l2PolygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param pathName
     */
    @Post('filesByPath')
    @UseGuards(PrincipalGuard)
    public async listAllFilesByPathNameInBucket(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Body('pathName') pathName: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.listAllFilesByPathNameInBucket(principal, pathName);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }


    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param polygonId
     */
    @Get('files/:polygonId')
    @ApiParam({ name: 'polygonId', example: '26157', required: false })
    @UseGuards(PrincipalGuard)
    public async listAllFilesInBucket(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('polygonId') polygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.listAllFilesInBucket(principal, polygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l1PolygonId
     * @param featureType
     */
    @Post('import-features/:l1PolygonId/:featureType')
    @ApiParam({ name: 'l1PolygonId', example: '26157', required: false })
    @ApiParam({ name: 'featureName', example: 'CLOSURE', required: false })
    @UseGuards(PrincipalGuard)
    public async importFeaturesIntoOdin(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l1PolygonId') l1PolygonId: string,
        @Param('featureType') featureType: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.importFeaturesIntoOdinQueue(principal, l1PolygonId, featureType);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param pathName
     * @param format
     */
    @Post('export-file/:format')
    @ApiParam({ name: 'pathName', example: '26157', required: false })
    @UseGuards(PrincipalGuard)
    public async exportDataFromS3Path(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Body('pathName') pathName: string,
        @Param('format') format: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.exportDataFromS3Path(principal, pathName);

        if(format === 'csv') {
            response.header('Content-Type', 'text/csv');
            response.attachment(`${pathName}.csv`);
            return response.send(res)
        } else {
            response.header('Content-Type', 'application/json');
            response.attachment(`${pathName}.json`);
            return response.send(res)
        }

    }


    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param polygonId
     */
    @Get('generate-connection-csv/:polygonId')
    @ApiParam({ name: 'polygonId', example: '26157', required: false })
    @UseGuards(PrincipalGuard)
    public async exportConnectionsByPolygonId(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('polygonId') polygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.exportConnectionsByPolygonId(principal, polygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }


    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param closureId
     */
    @Get('connections/:closureId')
    @ApiParam({ name: 'closureId', example: '26157', required: false })
    @UseGuards(PrincipalGuard)
    public async getConnectionsByClosureId(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('closureId') closureId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.getConnectionsByClosureId(principal, closureId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     */
    @Post('trace/:l0ClosureId/:l1PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '26157', required: false })
    @ApiParam({ name: 'l1PolygonId', example: '26157', required: false })
    @UseGuards(PrincipalGuard)
    public async trace(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l1PolygonId') l1PolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.traceAndMapCables(principal, l0ClosureId, l1PolygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     */
    @Post('cable-mappings/:l0ClosureId/:l1PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '26157', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '26157', required: true })
    @UseGuards(PrincipalGuard)
    public async mapCables(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l1PolygonId') l1PolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createCableMappings(principal, l0ClosureId, l1PolygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     */
    @Post('cable-connections/:l0ClosureId/:l1PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '26157', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '26157', required: true })
    @UseGuards(PrincipalGuard)
    public async addCables(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l1PolygonId') l1PolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createCableConnections(principal, l0ClosureId, l1PolygonId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     * @param l2PolygonId
     */
    @Post('loop-cable-fiber-mappings/:l0ClosureId/:l1PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '26157', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '26157', required: true })
    @ApiQuery({ name: 'l2PolygonId', example: '26157', required: true })
    @UseGuards(PrincipalGuard)
    public async createLoopCableFiberMappings(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l1PolygonId') l1PolygonId: string,
        @Query('l2PolygonId') l2PolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createLoopCableFiberMappings(
            principal,
            l0ClosureId,
            l1PolygonId,
            l2PolygonId,
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     * @param query
     */
    @Post('loop-cable-fiber-connections/:l0ClosureId/:l1PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '26157', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '26157', required: true })
    @ApiQuery({ name: 'l2PolygonId', example: '12345', required: false })
    @UseGuards(PrincipalGuard)
    public async createLoopCableFiberConnections(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l1PolygonId') l1PolygonId: string,
        @Query() query: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createLoopCableFiberConnections(
            principal,
            l0ClosureId,
            l1PolygonId,
            query['l2PolygonId'],
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     * This API will create a new L4 connection template
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l2PolygonId
     * @param l1PolygonId
     * @param query
     */
    @Post('l4-fiber-connection-template/:l0ClosureId/:l1PolygonId/:l2PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '12345', required: true })
    @ApiParam({ name: 'l2PolygonId', example: '12345', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '12345', required: true })
    @ApiQuery({ name: 'l4ClosureId', example: '12345', required: false })
    @UseGuards(PrincipalGuard)
    public async createL4FiberConnectionRequest(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l2PolygonId') l2PolygonId: string,
        @Param('l1PolygonId') l1PolygonId: string,
        @Query() query: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createL4FiberConnectionRequest(
            principal,
            l0ClosureId,
            l2PolygonId,
            l1PolygonId,
            query['l4ClosureId'],
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     * This API will create an L2 fiber connection template
     * This should be run after the L4 fiber connections are created
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l2PolygonId
     * @param l1PolygonId
     * @param query
     */
    @Post('l2-fiber-connection-template/:l0ClosureId/:l1PolygonId/:l2PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '12345', required: true })
    @ApiParam({ name: 'l2PolygonId', example: '12345', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '12345', required: true })
    @ApiQuery({ name: 'l2ClosureId', example: '12345', required: false })
    @UseGuards(PrincipalGuard)
    public async createL2FiberConnectionRequest(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l2PolygonId') l2PolygonId: string,
        @Param('l1PolygonId') l1PolygonId: string,
        @Query() query: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createL2FiberConnectionRequest(
            principal,
            l0ClosureId,
            l2PolygonId,
            l1PolygonId,
            query['l2ClosureId'],
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     * This API will create an L1 fiber connection template
     * This should be run after the L2 fiber connections are created
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l1PolygonId
     * @param query
     */
    @Post('l1-fiber-connection-template/:l0ClosureId/:l1PolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '12345', required: true })
    @ApiParam({ name: 'l1PolygonId', example: '12345', required: true })
    @ApiQuery({ name: 'l1ClosureId', example: '12345', required: false })
    @UseGuards(PrincipalGuard)
    public async createL1FiberConnectionRequest(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l1PolygonId') l1PolygonId: string,
        @Query() query: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createL1FiberConnectionRequest(
            principal,
            l0ClosureId,
            l1PolygonId,
            query['l1ClosureId'],
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     * This API will create an L0 fiber connection template
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param exPolygonId
     * @param query
     */
    @Post('l0-fiber-connection-template/:l0ClosureId/:exPolygonId')
    @ApiParam({ name: 'l0ClosureId', example: '12345', required: true })
    @ApiParam({ name: 'exPolygonId', example: '12345', required: true })
    @UseGuards(PrincipalGuard)
    public async createL0FiberConnectionRequest(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('exPolygonId') exPolygonId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.createL0FiberConnectionRequest(
            principal,
            exPolygonId,
            l0ClosureId,
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }


    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param polygonId
     * @param closureType
     * @param closureId
     */
    @Delete('fiber-connections/:polygonId/:closureType')
    @ApiParam({ name: 'polygonId', example: '12345', required: true })
    @ApiParam({ name: 'closureType', example: 'L4', required: false })
    @ApiQuery({ name: 'closureId', example: '2323', required: false })
    @UseGuards(PrincipalGuard)
    public async resetFiberConnections(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('polygonId') polygonId: string,
        @Param('closureType') closureType: string,
        @Query('closureId') closureId: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.resetFiberConnections(principal, polygonId, closureType, closureId);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param polygonId
     * @param closureType
     */
    @Delete('fiber-connection-templates/:polygonId/:closureType')
    @ApiParam({ name: 'polygonId', example: '12345', required: true })
    @ApiParam({ name: 'closureType', example: 'L4', required: false })
    @UseGuards(PrincipalGuard)
    public async deleteS3Templates(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('polygonId') polygonId: string,
        @Param('closureType') closureType: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.connectionsService.deleteS3Templates(principal, polygonId, closureType);
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }


    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param l0ClosureId
     * @param l2PolygonId
     * @param closureType
     */
    @Post('apply-template/:l0ClosureId/:l2PolygonId/:closureType')
    @ApiParam({ name: 'l2PolygonId', example: '12345', required: true })
    @ApiParam({ name: 'closureType', example: 'L4', required: false })
    @UseGuards(PrincipalGuard)
    public async applyFiberConnectionTemplate(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Param('l0ClosureId') l0ClosureId: string,
        @Param('l2PolygonId') l2PolygonId: string,
        @Param('closureType') closureType: string,
    ): Promise<ApiResponseType<any>> {

        if(closureType === 'L0') {
            const res = await this.connectionsService.applyFiberConnectionTemplateForL0(principal, l0ClosureId)
            const apiResponse = new ApiResponseType<any>(200, 'success', res);
            return response.status(apiResponse.statusCode).json(apiResponse);
        } else {
            const res = await this.connectionsService.applyFiberConnectionTemplate(principal, l2PolygonId, closureType);
            const apiResponse = new ApiResponseType<any>(200, 'success', res);
            return response.status(apiResponse.statusCode).json(apiResponse);
        }

    }
}
