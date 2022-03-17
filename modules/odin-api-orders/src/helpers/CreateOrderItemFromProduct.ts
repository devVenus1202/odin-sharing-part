import { OrderItemDto } from '@d19n/models/dist/orders/items/order.item.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';

export class CreateOrderItemFromProduct {

    public static construct(
        product: DbRecordEntityTransform,
        quantity: number,
        order: DbRecordEntityTransform,
    ) {

        const orderItem = new OrderItemDto();
        orderItem.ActivationStatus = 'OPEN';
        orderItem.Description = getProperty(product, 'Description');
        orderItem.UnitPrice = getProperty(product, 'UnitPrice');
        orderItem.DiscountValue = getProperty(product, 'DiscountValue'); // used in calculations
        orderItem.DiscountType = getProperty(product, 'DiscountType'); // used in calculations
        orderItem.TaxRate = getProperty(product, 'TaxRate');
        orderItem.Taxable = getProperty(product, 'Taxable');
        orderItem.TaxIncluded = getProperty(product, 'TaxIncluded');
        orderItem.Quantity = quantity || 1;
        orderItem.ProductRef = product.id;
        orderItem.ProductType = getProperty(product, 'Type');
        orderItem.ProductCategory = getProperty(product, 'Category');
        orderItem.ProductCustomerType = getProperty(product, 'CustomerType');

        // ODN-1660 the order level AMOUNT discount can be applied incorrectly
        //   need to recalculate all the items on the caller side if the order level AMOUNT discount exists

        // ODN-1542 compute total price ignoring discount expiration
        orderItem.TotalPrice = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalPriceForPeriodType(
            undefined,
            {
                id: undefined,
                schema: undefined,
                properties: orderItem,
            },
            order,
            {
                DiscountType: order.properties.DiscountType,
                DiscountValue: order.properties.DiscountValue,
            },
        ));

        // ODN-1542 compute tax ignoring discount expiration
        orderItem.TotalTaxAmount = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalTaxAmountForPeriodType(
            undefined,
            {
                id: undefined,
                schema: undefined,
                properties: orderItem,
            },
            order,
            {
                DiscountType: order.properties.DiscountType,
                DiscountValue: order.properties.DiscountValue,
            },
        ));

        return orderItem;

    }

}
