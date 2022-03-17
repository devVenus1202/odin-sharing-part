import { PrincipalGuard } from '@d19n/client/dist/guards/PrincipalGuard';
import { Principal } from '@d19n/common/dist/decorators/Principal';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { ApiResponseType } from '@d19n/common/dist/http/types/ApiResponseType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImportsService } from './imports.service';


@ApiTags('Data Importing')
@ApiBearerAuth()
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 200, type: ApiResponseType, description: '' })
@ApiResponse({ status: 201, type: ApiResponseType, description: '' })
@ApiResponse({ status: 401, type: ExceptionType, description: 'Unauthorized' })
@ApiResponse({ status: 404, type: ExceptionType, description: 'Not found' })
@ApiResponse({ status: 422, type: ExceptionType, description: 'Unprocessable entity validation failed' })
@ApiResponse({ status: 500, type: ExceptionType, description: 'Internal server error' })
@Controller(`${process.env.MODULE_NAME}/imports`)
export class ImportsController {

    constructor(
        private readonly importsService: ImportsService,
    ) {
        this.importsService = importsService;
    }

    /**
     *
     * @param principal
     * @param request
     * @param response
     * @param interval
     * @param buildStatus
     * @param addressStatus
     * @param opsStatus
     */
    @Get('addresses')
    @ApiQuery({ name: 'interval', example: '1 days', required: true })
    @ApiQuery({ name: 'buildStatus', example: '8-RFS', required: true })
    @ApiQuery({ name: 'addressStatus', example: 'ORDER', required: true })
    @ApiQuery({ name: 'opsStatus', example: '1', required: true })
    @UseGuards(PrincipalGuard)
    public async getFiberConnectionDropdownOptions(
        @Principal() principal: OrganizationUserEntity,
        @Req() request,
        @Res() response,
        @Query('interval') interval: string,
        @Query('buildStatus') buildStatus: string,
        @Query('addressStatus') addressStatus: string,
        @Query('opsStatus') opsStatus: string,
    ): Promise<ApiResponseType<any>> {

        const res = await this.importsService.importAddressesFromNetomniaRequest(
            principal,
            interval,
            buildStatus,
            addressStatus,
            opsStatus,
        );
        const apiResponse = new ApiResponseType<any>(200, 'success', res);
        return response.status(apiResponse.statusCode).json(apiResponse);

    }

}
