import { ApiProperty } from '@nestjs/swagger';

export class MetadataLinks {

  @ApiProperty()
  public title: string;
  @ApiProperty()
  public id: string;
  @ApiProperty()
  public dbRecordAssociationId: string;
  @ApiProperty()
  public relatedAssociationId: string;
  @ApiProperty()
  public createdAt: string;
  @ApiProperty()
  public updatedAt: string;
  @ApiProperty()
  public recordNumber?: string;
  @ApiProperty()
  public entity: string;
  @ApiProperty()
  public type: string;
  @ApiProperty()
  public relation: 'child' | 'parent';
}
