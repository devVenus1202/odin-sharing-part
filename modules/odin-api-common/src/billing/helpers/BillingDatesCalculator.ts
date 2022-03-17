import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty, getPropertyFromRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import * as dayjs from 'dayjs';

export class BillingDatesCalculator {
    /**
     * Shifts billingStartDate relative to the current date using intervalUnit.
     *
     * currentDate: 2021-06-11, billingStartDate: 2021-06-02, intervalUnit: days => 2021-06-11
     * currentDate: 2021-06-11, billingStartDate: 2021-06-02, intervalUnit: months => 2021-06-02
     * currentDate: 2021-06-11, billingStartDate: 2021-05-03, intervalUnit: months => 2021-06-03
     * currentDate: 2021-06-11, billingStartDate: 2021-06-20, intervalUnit: months => 2021-06-20
     *
     * @param billingStartDate
     * @param intervalUnit
     * @param overriddenCurrentDate
     * @returns
     */
    public static getBillingStartDateWithDiffFromToday(
        billingStartDate: string,
        intervalUnit,
        overriddenCurrentDate?: string,
    ) {

        let date;

        const currentDate = overriddenCurrentDate ?? dayjs().format('YYYY-MM-DD');

        // get the billing start date difference from the current day and the billing start date
        // in the billing intervalUnit MONTHS || DAYS
        const billingStartDiff = dayjs(currentDate).diff(billingStartDate, intervalUnit);

        // if there is a difference adjust the billingStartDate with the difference
        if (billingStartDiff > 0) {

            // add the difference to the billing start date
            // this gives us the starting date to set future dates from
            date = dayjs(billingStartDate)
                .add(billingStartDiff, intervalUnit)
                .format('YYYY-MM-DD');

        } else {

            // billing start date is in the future, do nothing.
            date = billingStartDate;
        }

        return date;
    }

    /**
     * Calculates trialEndDate from billingStartDate
     * using trialLength and trialUnit.
     *
     * @param billingStartDate
     * @param trialLength
     * @param trialUnit
     * @returns
     */
    public static calculateTrialEndDate(
        billingStartDate: string,
        trialLength: string,
        trialUnit,
    ) {
        let trialEndDate;

        if (billingStartDate && Number(trialLength) && Number(trialLength) > 0) {
            const parsedStartDate = dayjs(billingStartDate);
            if (parsedStartDate.isValid) {
                trialEndDate = parsedStartDate
                    .add(Number(trialLength), trialUnit.toLowerCase())
                    .format('YYYY-MM-DD');
            }
        }

        return trialEndDate;

    }

    /**
     * Calculates discount period start/end dates after trial period
     * using discountLength and discountUnit.
     *
     * @param billingStartDate
     * @param trialEndDate
     * @param discountLength
     * @param discountUnit
     * @returns
     */
    public static calculateDiscountPeriodDates(
        billingStartDate: string,
        trialEndDate: string,
        discountLength,
        discountUnit,
    ) {
        let discountEndDate;

        const discountStartDate = trialEndDate || billingStartDate;

        if (discountStartDate && Number(discountLength) && Number(discountLength) > 0) {
            const parsedStartDate = dayjs(discountStartDate);
            if (parsedStartDate.isValid) {
                discountEndDate = parsedStartDate
                    .add(discountLength, discountUnit)
                    .format('YYYY-MM-DD');
            }
        }

        return { discountStartDate, discountEndDate };
    }

    /**
     * ODN-1542 Calculates current period type
     *
     * @param onDate
     * @param trialEndDate
     * @param discountEndDate
     * @returns
     */
    public static calculateCurrentPeriodType(
        onDate: string,
        trialEndDate,
        discountEndDate,
    ) {

        if (this.isCurrentPeriodWithinTrialPeriod(trialEndDate, onDate)) {

            return 'FREE';

        } else if (this.isCurrentPeriodWithinDiscountPeriod(discountEndDate, onDate)) {

            return 'DISCOUNT'

        } else {

            return 'STANDARD';

        }
    }

    /**
     * Check if the current period is in the trial period
     * Can be used to flag if this item is in a trial period
     * @param trialPeriodEndDate
     * @param onDate
     * @private
     */
    public static isCurrentPeriodWithinTrialPeriod(trialPeriodEndDate: string, onDate: string) {

        if (trialPeriodEndDate && dayjs(trialPeriodEndDate).isValid()) {

            // for in advance billing isBefore
            return dayjs(onDate).isBefore(trialPeriodEndDate);

            // TODO: we need to have organization level billing settings to specify the billing
            //  for in arrears billing isSameOrBefore

        } else {

            return false;

        }

    }

    /**
     * Check if the current period is in the discount period
     * Can be used to flag if this item is in a discount period
     * @param discountEndDate
     * @param onDate
     * @private
     */
    public static isCurrentPeriodWithinDiscountPeriod(discountEndDate: string, onDate: string) {

        if (discountEndDate && dayjs(discountEndDate).isValid()) {

            // for in advance billing isBefore
            return dayjs(onDate).isBefore(discountEndDate);

            // TODO: we need to have organization level billing settings to specify the billing
            //  for in arrears billing isSameOrBefore

        } else {

            return false;

        }

    }

    /**
     * ODN-1542 Calculates trial / discount period dates, and current period type relative to onDate
     *
     * @param billingStartDate
     * @param onDate
     * @param trialDiscountPeriodSettings
     * @returns
     */
    public static calculateCurrentTrialDiscountPeriod(
        billingStartDate: string,
        onDate: string,
        trialDiscountPeriodSettings: {
            TrialLength: string,
            TrialUnit: string,
            DiscountLength: string,
            DiscountUnit: string,
        },
    ): { periodType: string, trialEndDate: string, discountStartDate: string, discountEndDate: string } {

        console.log('trialDiscountPeriodSettings', trialDiscountPeriodSettings);

        // calculate the trial period end date to adjust the next billing date
        const trialEndDate = this.calculateTrialEndDate(
            billingStartDate,
            trialDiscountPeriodSettings.TrialLength,
            trialDiscountPeriodSettings.TrialUnit,
        );

        // the discount startDate would be after any trial periods
        const { discountStartDate, discountEndDate } = this.calculateDiscountPeriodDates(
            billingStartDate,
            trialEndDate,
            trialDiscountPeriodSettings.DiscountLength,
            trialDiscountPeriodSettings.DiscountUnit,
        );

        // get the billing period type
        const periodType = this.calculateCurrentPeriodType(onDate, trialEndDate, discountEndDate);

        console.log(`calculateCurrentTrialDiscountPeriod: onDate=${onDate}, ` + 
            `trialEndDate=${trialEndDate}, ` +
            `discountStartDate=${discountStartDate}, ` +
            `discountEndDate=${discountEndDate}, ` +
            `periodType=${periodType}`
        );

        return { periodType, trialEndDate, discountStartDate, discountEndDate }
    }

    /**
     * ODN-1542 Calculates trial / discount period dates, and current period type
     * relative to the DueDate if orderOrInvoice is Invoice
     * or relative to the current date if orderOrInvoice is Order
     *
     * @param orderOrInvoice
     * @param overriddenCurrentDate
     * @returns
     */
    public static calculateCurrentTrialDiscountPeriodForOrderOrInvoice(
        orderOrInvoice: DbRecordEntityTransform,
        overriddenCurrentDate?: string,
    ): { periodType: string, trialEndDate: string, discountStartDate: string, discountEndDate: string } {

        // get trial / discount period settings
        const trialDiscountPeriodSettings = {
            TrialLength: getProperty(orderOrInvoice, 'TrialLength'),
            TrialUnit: getProperty(orderOrInvoice, 'TrialUnit'),
            DiscountLength: getProperty(orderOrInvoice, 'DiscountLength'),
            DiscountUnit: getProperty(orderOrInvoice, 'DiscountUnit'),
        };

        // by default get billing start date as for the Order
        let billingStartDate = this.getAdjustedBillingStartDateToBillingDay(orderOrInvoice);
        // and use the current date as onDate
        let onDate = overriddenCurrentDate ?? dayjs().format('YYYY-MM-DD');

        // if this is an Invoice use the BillingPeriodStart as onDate
        //   and to get correct billing day
        if (orderOrInvoice.entity === 'BillingModule:Invoice') {
            const billingPeriodStart = getProperty(orderOrInvoice, 'BillingPeriodStart');
            const billingPeriodStartDate = dayjs(billingPeriodStart);
            if (billingPeriodStartDate.isValid) {
                const billingDay = billingPeriodStartDate.date();
                billingStartDate = dayjs(billingStartDate).date(billingDay).format('YYYY-MM-DD');
                onDate = billingPeriodStart;
            }
        }

        //console.log('calculateCurrentTrialDiscountPeriod: billingStartDate', billingStartDate);
        //console.log('calculateCurrentTrialDiscountPeriod: onDate', onDate);


        const currentPeriod = this.calculateCurrentTrialDiscountPeriod(
            billingStartDate,
            onDate,
            trialDiscountPeriodSettings,
        );

        // ODN-1542 for the backward compatibility:
        //   consider the current period type is DISCOUNT
        //   when order / invoice has DiscountType and DicountValues specified
        //   but discountEndDate is undefined and calculated periodType is STANDARD
        if (currentPeriod?.periodType === 'STANDARD' && !currentPeriod.discountEndDate) {
            const discountType = getProperty(orderOrInvoice, 'DiscountType');
            const discountValue = getProperty(orderOrInvoice, 'DiscountValue');
            if (discountType && discountValue) {
                currentPeriod.periodType = 'DISCOUNT';
            }
        }

        //console.log('calculateCurrentTrialDiscountPeriod: fixed periodType', currentPeriod.periodType);

        return currentPeriod;
    }

    /**
     * Calculates nextInvoiceDate from billingStartDate relative to the current date
     * using intervalLength and intervalUnit.
     *
     * @param billingStartDate
     * @param chargeType
     * @param intervalLength
     * @param intervalUnit
     * @param overriddenCurrentDate
     * @returns
     */
    public static calculateNextInvoiceDate(
        billingStartDate: string,
        chargeType,
        intervalLength,
        intervalUnit,
        overriddenCurrentDate?: string,
    ) {

        let nextInvoiceDate;

        const adjustedStartDate = this.getBillingStartDateWithDiffFromToday(
            billingStartDate,
            intervalUnit,
            overriddenCurrentDate,
        );

        const currentDate = overriddenCurrentDate ?? dayjs().format('YYYY-MM-DD');

        console.log('------SET_NEXT_INVOICE_DATE');
        console.log('billingStartDate', billingStartDate);
        console.log('adjustedStartDate', adjustedStartDate);
        console.log('currentDate', currentDate);
        console.log('beforeCurrentDate', dayjs(adjustedStartDate).isBefore(currentDate));

        if (adjustedStartDate && dayjs(adjustedStartDate).isValid() && dayjs(adjustedStartDate).isBefore(currentDate)) {

            // If the next billing date is the same as the billing start date and the billing start date is in the past
            if (chargeType === 'RECURRING') {
                // if the nextBillingDate is the same or before today we need to set the next billing date using the
                // interval unit ( days, months ) and the interval length ( 1,2 3 ...)
                nextInvoiceDate = dayjs(adjustedStartDate)
                    .add(intervalLength, intervalUnit)
                    .format('YYYY-MM-DD');

            } else if (chargeType === 'ONE_TIME') {

                nextInvoiceDate = dayjs(adjustedStartDate)
                    .format('YYYY-MM-DD');

            } else if (chargeType === 'USAGE') {

                nextInvoiceDate = dayjs(adjustedStartDate)
                    .add(intervalLength, intervalUnit)
                    .format('YYYY-MM-DD');

            }

        } else if (billingStartDate && dayjs(billingStartDate).isBefore(adjustedStartDate)) {

            nextInvoiceDate = adjustedStartDate;

        } else {
            // this is to match if the billing start date is set to a future date
            nextInvoiceDate = billingStartDate;
        }

        return nextInvoiceDate;
    }

    /**
     * Calculates nextBillingDate from billingStartDate based on trial period info
     * relative to the current date using intervalLength and intervalUnit.
     *
     * @param billingStartDate
     * @param adjustedStartDate
     * @param trialEndDate
     * @param currentPeriodType
     * @param chargeType
     * @param intervalLength
     * @param intervalUnit
     * @returns
     */
    public static calculateNextBillingDate(
        billingStartDate: string,
        adjustedStartDate: string,
        trialEndDate: string,
        currentPeriodType: string,
        chargeType,
        intervalLength,
        intervalUnit,
    ) {

        const currentDay = dayjs().format('YYYY-MM-DD');

        let nextBillingDate = currentPeriodType === 'FREE' ? trialEndDate : adjustedStartDate;

        if (nextBillingDate && dayjs(nextBillingDate).isValid() && dayjs(nextBillingDate).isBefore(currentDay)) {
            // If the next billing date is the same as the billing start date and the billing start date is in the
            // keep the nextBillingDate as the billing start date
            if (chargeType === 'RECURRING') {
                // if the nextBillingDate is the same or before today we need to set the next billing date using the
                // interval unit ( days, months ) and the interval length ( 1,2 3 ...)
                nextBillingDate = dayjs(nextBillingDate).add(intervalLength, intervalUnit).format('YYYY-MM-DD');

            } else if (chargeType === 'ONE_TIME') {

                nextBillingDate = dayjs(billingStartDate).format('YYYY-MM-DD');

            } else if (chargeType === 'USAGE') {

                nextBillingDate = dayjs(nextBillingDate).add(intervalLength, intervalUnit).format('YYYY-MM-DD');

            }
        }

        return nextBillingDate;
    }

    /**
     * Gets the order billing start date adjusted to the BillingDay.
     *
     * @param order
     * @returns
     */
    public static getAdjustedBillingStartDateToBillingDay(
        order: DbRecordEntityTransform,
    ) {
        let res = getProperty(order, 'BillingStartDate');
        const billingDay = Number(getProperty(order, 'BillingDay'));
        if (!Number.isNaN(billingDay) && billingDay > 0 && billingDay < 29) {
            res = dayjs(res).date(billingDay).format('YYYY-MM-DD');
        }
        return res;
    }

    /**
     * Calculates nextInvoiceDate of orderItem from adjustedBillingStartDate
     * relative to the currentDate.
     *
     * @param orderItem
     * @param adjustedBillingStartDate
     * @param overriddenCurrentDate
     * @returns
     */
    public static calculateOrderItemNextInvoiceDate(
        orderItem: DbRecordEntityTransform,
        adjustedBillingStartDate: string,
        overriddenCurrentDate?: string,
    ) {
        const { PRODUCT } = SchemaModuleEntityTypeEnums;

        const chargeType = getPropertyFromRelation(orderItem, PRODUCT, 'ChargeType');
        const intervalUnit = getPropertyFromRelation(orderItem, PRODUCT, 'IntervalUnit');
        const intervalLength = getPropertyFromRelation(orderItem, PRODUCT, 'IntervalLength');

        // the next invoice date is the next time the customer will receive an invoice
        const nextInvoiceDate = this.calculateNextInvoiceDate(
            adjustedBillingStartDate,
            chargeType,
            intervalLength,
            intervalUnit,
            overriddenCurrentDate,
        );

        return nextInvoiceDate;
    }

    /**
     * ODN-1542 Computes the billing period type and dates for the order item
     *
     * @param billingStartDate
     * @param orderItem
     * @param overriddenCurrentDate
     * @returns
     */
    public static computeBillingPeriodDates(
        billingStartDate: string,
        orderItem: DbRecordEntityTransform,
        overriddenCurrentDate?: string,
    ) {

        const { PRODUCT } = SchemaModuleEntityTypeEnums;

        const chargeType = getPropertyFromRelation(orderItem, PRODUCT, 'ChargeType');
        const intervalUnit = getPropertyFromRelation(orderItem, PRODUCT, 'IntervalUnit');
        const intervalLength = getPropertyFromRelation(orderItem, PRODUCT, 'IntervalLength');
        const trialUnit = getPropertyFromRelation(orderItem, PRODUCT, 'TrialUnit');
        const trialLength = getPropertyFromRelation(orderItem, PRODUCT, 'TrialLength');
        const discountUnit = getPropertyFromRelation(orderItem, PRODUCT, 'DiscountUnit');
        const discountLength = getPropertyFromRelation(orderItem, PRODUCT, 'DiscountLength');
        const staticDiscountStartDate = getPropertyFromRelation(orderItem, PRODUCT, 'TrialEndDate')

        // Check the billing start date difference from today and set the adjusted start date
        // if the billing start date is in the past then adjusted start date is the current
        const adjustedStartDate = this.getBillingStartDateWithDiffFromToday(
            billingStartDate,
            intervalUnit,
            overriddenCurrentDate,
        );

        // the next invoice date is the next time the customer will receive an invoice
        const nextInvoiceDate = this.calculateNextInvoiceDate(
            billingStartDate,
            chargeType,
            intervalLength,
            intervalUnit,
            overriddenCurrentDate,
        );

        // calculate current trial / discount period
        const { periodType, trialEndDate, discountStartDate, discountEndDate } = this.calculateCurrentTrialDiscountPeriod(
            billingStartDate,
            nextInvoiceDate,
            {
                TrialLength: trialLength,
                TrialUnit: trialUnit,
                DiscountLength: discountLength,
                DiscountUnit: discountUnit,
            },
        );

        // the next billing date is the next time the customer will be charged if there are charges.
        const nextBillingDate = this.calculateNextBillingDate(
            billingStartDate,
            adjustedStartDate,
            trialEndDate,
            periodType,
            chargeType,
            intervalLength,
            intervalUnit,
        );

        return { nextInvoiceDate, nextBillingDate, periodType, trialEndDate, discountStartDate, discountEndDate, staticDiscountStartDate };
    }

    /**
     * ODN-1542 Computes the billing period type and dates for the order item relative to the onDate
     *
     * @param onDate
     * @param orderItem
     */
    public static computeAbsoluteBillingPeriodDates(
        onDate: string,
        orderItem: DbRecordEntityTransform,
    ) {

        const { PRODUCT } = SchemaModuleEntityTypeEnums;

        const discountUnit = getPropertyFromRelation(orderItem, PRODUCT, 'DiscountUnit');
        const discountLength = getPropertyFromRelation(orderItem, PRODUCT, 'DiscountLength');
        const trialEndDate = getProperty(orderItem, 'TrialEndDate');

        // the discount startDate would be after any trial periods
        const { discountStartDate, discountEndDate } = BillingDatesCalculator.calculateDiscountPeriodDates(
            onDate,
            trialEndDate,
            discountLength,
            discountUnit,
        );

        const isInTrialPeriod = BillingDatesCalculator.isCurrentPeriodWithinTrialPeriod(trialEndDate, onDate);

        // set the billing period type
        const periodType = BillingDatesCalculator.calculateCurrentPeriodType(onDate, trialEndDate, discountEndDate);

        return { periodType, trialEndDate, discountStartDate, discountEndDate, isInTrialPeriod };
    }

    /**
     * Gets or calculates the next invoice date from order items
     * 
     * @param orderItems 
     * @param billingStartDate 
     * @returns 
     */
    public static getNextInvoiceDateFromOrderItems(orderItems: DbRecordEntityTransform[], billingStartDate: string) {
        // get the earliest NextInvoiceDate from orderItems
        let nextInvoiceDates = orderItems.map(elem => getProperty(elem, 'NextInvoiceDate'));
        if (nextInvoiceDates.findIndex(elem => elem && dayjs(elem).isValid) < 0) {
            // if the NextInvoiceDate is not set on any item calculate it
            nextInvoiceDates = orderItems.map(elem => this.calculateOrderItemNextInvoiceDate(
                elem,
                billingStartDate,
            ));
        }
        let nextInvoiceDate = nextInvoiceDates.reduce((p, c) => {
            if (p && dayjs(p).isValid && c && dayjs(c).isValid) {
                return dayjs(p).isBefore(c) ? p : c;
            } else if (p && dayjs(p).isValid && (!c || !dayjs(c).isValid)) {
                return p;
            } else if ((!p || !dayjs(p).isValid) && c && dayjs(c).isValid) {
                return c;
            } else {
                return p;
            }
        });
        return nextInvoiceDate;
    }
}
