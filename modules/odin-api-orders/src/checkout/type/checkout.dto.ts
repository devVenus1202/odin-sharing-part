import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
    @ApiProperty()
    public addressId?: string;
    @ApiProperty()
    public contactId: string;
    @ApiProperty()
    public products: DbRecordAssociationCreateUpdateDto[];
    @ApiProperty()
    public discountCode?: string;
    @ApiProperty({ example: 'GOCARDLESS' })
    public identityName?: string;
    @ApiProperty({ example: '55779911' })
    public accountNumber: string;
    @ApiProperty({ example: '200000' })
    public branchCode: string;
    @ApiProperty()
    public authorizedDirectDebit?: boolean;
    @ApiProperty()
    public customerPhonePorting?: {
        AreaCode: string,
        CountryCode: string,
        SubscriberNumber: string,
        AuthorizedLOA: string
    }
    @ApiProperty()
    public orderStageKey: string;
    @ApiProperty()
    public contactProperties: object;
    @ApiProperty()
    public leadId?: string;
    /**
     * ODN-1474
     * Specify offer id to create OrderItem-to-Offer associations
     */
    @ApiProperty({ description: 'specify offer id to create OrderItem-to-Offer associations' })
    public offerId?: string;
}
