import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length, IsUUID, IsOptional } from "class-validator";

export class IdentityOrganizationUserRegister {

    @ApiProperty()
    @IsNotEmpty()
    @Length(2, 32)
    public organizationName: string;

    @ApiProperty()
    @IsEmail()
    public email: string;

    @ApiProperty()
    @IsNotEmpty()
    @Length(8, 15)
    public password: string;

    @ApiProperty()
    @IsNotEmpty()
    @Length(2, 32)
    public firstname: string;

    @ApiProperty()
    @IsNotEmpty()
    @Length(2, 32)
    public lastname: string;

    @ApiProperty()
    @IsUUID()
    @IsOptional()
    public contactId?: string;

}

export class IdentityOrganizationUserSendRegistrationLink {
    @ApiProperty()
    @IsEmail()
    email: string;
    @ApiProperty()
    @IsUUID()
    @IsOptional()
    roleId: string;
    @ApiProperty()
    @IsUUID()
    @IsOptional()
    public contactId?: string;
}

export class IdentityOrganizationUserCompleteRegistration {
    @ApiProperty()
    @IsNotEmpty()
    @Length(2, 32)
    firstname: string;
    @ApiProperty()
    @IsNotEmpty()
    @Length(2, 32)
    lastname: string;
    @ApiProperty()
    @IsNotEmpty()
    @Length(8, 15)
    password: string;
    @ApiProperty()
    @IsUUID()
    @IsOptional()
    public contactId?: string;
}