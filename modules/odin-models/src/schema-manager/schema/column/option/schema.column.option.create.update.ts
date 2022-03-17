import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Length } from 'class-validator';


export class SchemaColumnOptionCreateUpdate {

  @ApiProperty()
  @Length(1, 55)
  public label: string;

  @ApiProperty()
  @Length(1, 55)
  public value: string;

  @ApiProperty()
  @IsOptional()
  @Length(1, 255)
  public description?: string;

  @ApiProperty()
  @IsNumber()
  public position: number;

}
