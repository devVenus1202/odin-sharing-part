import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

enum WorkOrderTypeEnum {
    INSTALL = 'INSTALL',
    SERVICE = 'SERVICE',
    BUILD = 'BUILD',
}

export class ServiceAppointmentCreateDto {
    @ApiProperty()
    public addressId?: string;
    @ApiProperty()
    public Date?: string;
    @ApiProperty()
    public TimeBlock?: string;
    @ApiProperty()
    public ExPolygonId?: string;
    @ApiProperty()
    @IsOptional()
    @IsEnum(WorkOrderTypeEnum)
    public Type?: WorkOrderTypeEnum;
    @ApiProperty()
    public skipCustomerNotification?: boolean = false;
}
