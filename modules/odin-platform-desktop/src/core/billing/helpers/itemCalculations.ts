import { Calculations } from '@d19n/common/dist/helpers/Calculations';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';

/**
 * ODN-2150 computes the unit price with an item-level discount
 * 
 * @param item OrderItem / InvoiceItem / Product
 */
export function computeItemDiscountedUnitPrice(item: DbRecordEntityTransform): number {
  const unitPrice = getProperty(item, 'UnitPrice');
    const discountType = getProperty(item, 'DiscountType');
    const discountValue = getProperty(item, 'DiscountValue');
    let unitPriceWithDiscount = Number(unitPrice);
    if (discountType === 'PERCENT') {
      const discountAmount = Calculations.computePercentValueOfNumber(unitPriceWithDiscount, Number(discountValue));
      unitPriceWithDiscount = unitPriceWithDiscount - discountAmount;
    } else if (discountType === 'AMOUNT') {
      unitPriceWithDiscount = unitPriceWithDiscount - Number(discountValue);
    }
  return unitPriceWithDiscount;
}
