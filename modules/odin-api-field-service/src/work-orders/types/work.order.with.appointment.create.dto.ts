import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

enum WorkOrderTypeEnum {
    INSTALL = 'INSTALL',
    SERVICE = 'SERVICE',
}

export class WorkOrderWithAppointmentCreateDto {

    @ApiProperty()
    public Date?: string;

    @ApiProperty()
    public TimeBlock?: string;

    /**
     * ODN-1539 - being deprecated in favor of properties: {}
     */
    @ApiProperty()
    @IsOptional()
    @IsEnum(WorkOrderTypeEnum)
    public Type?: WorkOrderTypeEnum;

    /**
     * New in ODN-1539
     */
    @ApiProperty()
    @IsOptional()
    public properties?: {};

    @ApiProperty()
    public skipCustomerNotification?: boolean = false;

    @ApiProperty()
    public orderItems: DbRecordAssociationCreateUpdateDto[]
}
