import { DbRecordEntityTransform } from "@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform";
import { getProperty } from "@d19n/models/dist/schema-manager/helpers/dbRecordHelpers";
import { SchemaModuleEntityTypeEnums } from "@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types";

export class BillingAdjustmentHelper {

    public static constructBillingAdjustmentInfo(
        adjustment: DbRecordEntityTransform,
        currentInvoiceId?: string,
    ): { id: string, title: string, BillingPeriodType: string, DiscountType?: string, DiscountValue?: string } {
        const { INVOICE } = SchemaModuleEntityTypeEnums;

        if (!adjustment) return;

        const freePeriodLength = getProperty(adjustment, 'FreePeriodLength') || 0;
        const discountLength = getProperty(adjustment, 'DiscountLength') || 0;
        const discountType = getProperty(adjustment, 'DiscountType');
        const discountValue = getProperty(adjustment, 'DiscountValue');

        let adjustmentInvoices = adjustment[INVOICE]?.dbRecords;
        // check if the billing adjustments have applied to the invoices
        if (adjustmentInvoices) {

            // ODN-1542 exclude the current invoice
            if (currentInvoiceId) {
                adjustmentInvoices = adjustmentInvoices.filter(elem => elem.id !== currentInvoiceId);
            }
            // exclude voided invoices
            const invoicesNotVoided = adjustmentInvoices.filter(elem => getProperty(elem, 'Status') !== 'VOID');
            // check if the interval < the number of times the adjustment has been applied to an invoice
            if (freePeriodLength && invoicesNotVoided.length < Number(freePeriodLength)) {
                // the adjustment should be applied
                return {
                    id: adjustment.id,
                    title: adjustment.title,
                    BillingPeriodType: 'FREE',
                }
            }
            if (discountType && discountValue && invoicesNotVoided.length < Number(freePeriodLength) + Number(
                discountLength)) {
                return {
                    id: adjustment.id,
                    title: adjustment.title,
                    BillingPeriodType: 'DISCOUNT',
                    DiscountType: discountType,
                    DiscountValue: discountValue,

                }
            }
        }
        // adjustment has no invoices add it to this invoice
        else if (Number(freePeriodLength) > 0) {
            return {
                id: adjustment.id,
                title: adjustment.title,
                BillingPeriodType: 'FREE',
            }
        } else if (discountType && discountValue && Number(discountLength) > 0) {
            return {
                id: adjustment.id,
                title: adjustment.title,
                BillingPeriodType: 'DISCOUNT',
                DiscountType: discountType,
                DiscountValue: discountValue,

            }
        }
    }
}