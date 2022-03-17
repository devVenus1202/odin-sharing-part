import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { hasPermission } from '@d19n/models/dist/identity/organization/user/helpers/HasPermission';
import { hasRole } from '@d19n/models/dist/identity/organization/user/helpers/HasRole';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { SUB_SEND_DYNAMIC_EMAIL } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { IDbRecordCreateUpdateRes } from '@d19n/models/dist/schema-manager/db/record/interfaces/interfaces';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import {
    getFirstRelation,
    getProperty,
    getPropertyFromRelation,
} from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { DbRecordsService } from '@d19n/schema-manager/dist/db/records/db.records.service';
import { SchemasService } from '@d19n/schema-manager/dist/schemas/schemas.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import * as dotenv from 'dotenv';
import { getFullWeekDateRangeFromStartAndEnd } from '../helpers/DateRangeFromStartAndEnd';
import { ServiceAppointmentCreateDto } from './types/service.appointment.create.dto';

dayjs.extend(weekday)

dotenv.config();

const { NOTIFICATION_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;
const { ADDRESS, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

interface IServiceAppointmentAvailability {
    Date: string,
    AM: boolean,
    PM: boolean,
    AMCount?: number,
    PMCount?: number,
    Config?: DbRecordEntityTransform
}

@Injectable()
export class ServiceAppointmentsService {

    private dbService: DbService;
    private dbRecordsService: DbRecordsService;
    private schemasService: SchemasService;
    private amqpConnection: AmqpConnection;

    constructor(
        @Inject(forwardRef(() => DbService)) dbService: DbService,
        @Inject(forwardRef(() => DbRecordsService)) dbRecordsService: DbRecordsService,
        @Inject(forwardRef(() => SchemasService)) schemasService: SchemasService,
        amqpConnection: AmqpConnection,
    ) {
        this.dbService = dbService;
        this.dbRecordsService = dbRecordsService;
        this.schemasService = schemasService;
        this.amqpConnection = amqpConnection;
    }


    /**
     *
     * @param principal
     * @param query
     * @param options
     * @private
     */
    public async getAvailabilityByOrganization(
        principal: OrganizationUserEntity,
        query: { start: string, end: string, type?: string, addressId?: string, exPolygonId?: string, isOverview?: string },
        options: { isOverview: boolean },
    ) {
        try {

            console.log('GET_AVAILABILITY_BY_ORGANIZATION')

            let skipFirstAvailableCheck = false;

            // set the overview to true for reporting permissions
            if (hasPermission(principal, 'fieldservice.reporting')) {
                options.isOverview = true;
            }

            let exPolygonId = query['exPolygonId']
            let aptType = query.type || 'INSTALL';

            console.log('query', query)
            // construct date range
            const dateRange = this.constructDateRange(principal, query);

            if (query['addressId']) {
                const address = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    query['addressId'],
                    [],
                );

                console.log('address', address)

                exPolygonId = getProperty(address, 'ExPolygonId')
            }

            // if the calendar API passes in an exPolygonId then override the isOverview
            if (exPolygonId && options && options.isOverview) {
                options.isOverview = false
            }

            console.log('exPolygonId', exPolygonId)
            console.log('options', options)

            // verify that we have teh required exPolygonId
            if ((!exPolygonId || exPolygonId === '0') && (options && !options.isOverview)) {
                throw new ExceptionType(400, 'missing region please add an addressId or exPolygonId')
            }

            // if the API query has isOverview=true && the user has the reporting role
            // set the overview to true for reporting permissions
            if (hasPermission(principal, 'fieldservice.reporting') && query['isOverview'] === 'true') {
                skipFirstAvailableCheck = true;
            }

            // Get global restrictions for the date range and type
            const globalConfigurations = await this.dbService.getManyDbRecordsByPropertiesTransformed(principal, {
                entity: `${SchemaModuleTypeEnums.FIELD_SERVICE_MODULE}:ServiceAppointmentConfig`,
                type: aptType,
                properties: [
                    {
                        columnName: 'ExPolygonId',
                        operator: 'EQ',
                        value: '0',
                    },
                ],
            });
            // the default global configuration for all areas
            let globalConfig = globalConfigurations.find(elem => getProperty(elem, 'IsDefault') === 'true')

            // Get restrictions for the date range and region
            const areaConfigurations = await this.dbService.getManyDbRecordsByPropertiesTransformed(principal, {
                entity: `${SchemaModuleTypeEnums.FIELD_SERVICE_MODULE}:ServiceAppointmentConfig`,
                type: aptType,
                properties: [
                    {
                        columnName: 'ExPolygonId',
                        operator: 'VECTOR',
                        value: exPolygonId,
                    },
                ],
            });

            // the area specific configuration
            let areaConfig = this.getAreaConfig(query['start'], areaConfigurations);
            console.log('areaConfig', areaConfig)

            if (!globalConfig && !areaConfig && (options && !options.isOverview)) {
                console.log('NO GLOBAL OR AREA CONFIG')
                throw new ExceptionType(400, 'There are no available appointments in this area, please contact support')
            }

            // Find all existing appointments for the given date range
            let existingAppointments = await this.constructExistingAppointmentsByDate(
                principal,
                dateRange,
                aptType,
                exPolygonId,
                areaConfigurations,
                options,
            );

            console.log('existingAppointments', existingAppointments)

            console.log('options', options)
            console.log('query', query)
            console.log('aptType', aptType)
            // Build availability by date
            let availableAppointments = await this.constructAvailableAppointmentsByDate(
                principal,
                dateRange,
                existingAppointments,
                globalConfigurations,
                areaConfigurations,
                options,
            );

            // Check availability
            let hasAvailability = await this.isFirstSelectableDateAvailable(availableAppointments);
            let maxChecks = 0;
            let start = query.start;
            let end = query.end;
            // find the difference of the query start date and 14 days from now
            const diffInDays = dayjs(end).diff(start, 'day');


            while (!hasAvailability) {

                console.log('diffInDays', diffInDays)

                start = dayjs(start).add(0, 'day').format('YYYY-MM-DD');
                end = dayjs(end).add(0, 'day').format('YYYY-MM-DD');

                console.log('start', start)
                console.log('end', end)

                const dateRange = this.constructDateRange(principal, { start, end });

                console.log('QUERY_NEXT_DATE_RANGE', dateRange)
                // Find all existing appointments for the given date range
                existingAppointments = await this.constructExistingAppointmentsByDate(
                    principal,
                    dateRange,
                    aptType,
                    exPolygonId,
                    areaConfigurations,
                    options,
                );
                // Build availability by date
                availableAppointments = await this.constructAvailableAppointmentsByDate(
                    principal,
                    dateRange,
                    existingAppointments,
                    globalConfigurations,
                    areaConfigurations,
                    options,
                );

                if (!skipFirstAvailableCheck) {
                    const firstAvailableApt = await this.getFirstAvailableAppointmentInRange(availableAppointments)
                    console.log('firstAvailableApt', firstAvailableApt)
                    // set the start date to the first available apt or
                    if (firstAvailableApt) {
                        console.log('new start', start)
                        start = firstAvailableApt['Date']

                        end = dayjs(start).add(diffInDays, 'day').format('YYYY-MM-DD');
                        console.log('new end', dayjs(start).add(diffInDays, 'day').format('YYYY-MM-DD'))
                        hasAvailability = false;
                    } else {
                        // set the start to the last date in the range
                        const lastAvail = availableAppointments[availableAppointments.length - 1]
                        console.log('lastAvail', lastAvail)
                        if (lastAvail) {
                            console.log('new start', start)
                            start = lastAvail['Date']
                            end = dayjs(start).add(diffInDays, 'day').format('YYYY-MM-DD');
                            hasAvailability = false;
                        }
                    }

                    hasAvailability = await this.isFirstSelectableDateAvailable(availableAppointments);
                    maxChecks = maxChecks + 1;

                    console.log('hasAvailability', hasAvailability)
                    console.log('maxChecks', maxChecks)
                    if (hasAvailability) {
                        break;
                    } else if (maxChecks > 15) {
                        hasAvailability = false;
                        break;
                    }
                } else {
                    break
                }
            }

            console.log('getAvailabilityByOrganization', availableAppointments);
            return availableAppointments;
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation, e.data);
        }
    }

    /**
     *
     * @param principal
     * @param dateRange
     * @param existingAptCountByDate
     * @param globalConfigurations
     * @param areaConfigurations
     * @paramareaConfigurations
     * @param options
     */
    private async constructAvailableAppointmentsByDate(
        principal: OrganizationUserEntity,
        dateRange,
        existingAptCountByDate: {},
        globalConfigurations: DbRecordEntityTransform[],
        areaConfigurations: DbRecordEntityTransform[],
        options: { isOverview: boolean },
    ) {

        const availableAppointments = [];

        console.log('dateRange', dateRange)

        for(const date of dateRange) {

            const dayOfWeek = dayjs(date).format('dddd')
            console.log('dayOfWeek', dayOfWeek)

            // the default global configuration for all areas
            let globalConfig = globalConfigurations.find(elem => getProperty(elem, 'IsDefault') === 'true')
            let maxDailyAM: string = globalConfig ? getProperty(globalConfig, `${dayOfWeek}_AM`) : undefined
            let maxDailyPM: string = globalConfig ? getProperty(globalConfig, `${dayOfWeek}_PM`) : undefined
            console.log('globalConfig', globalConfig)
            console.log('maxDailyAM', maxDailyAM)
            console.log('maxDailyPM', maxDailyPM)

            // the area specific configuration
            let areaConfig = this.getAreaConfig(date, areaConfigurations);
            console.log('areaConfig', areaConfig)

            maxDailyAM = areaConfig ? getProperty(areaConfig, `${dayOfWeek}_AM`) : maxDailyAM
            maxDailyPM = areaConfig ? getProperty(areaConfig, `${dayOfWeek}_PM`) : maxDailyPM
            console.log('areaConfig', areaConfig)
            console.log('maxDailyAM', maxDailyAM)
            console.log('maxDailyPM', maxDailyPM)

            if (!globalConfig && !areaConfig && (options && !options.isOverview)) {
                console.log('NO GLOBAL OR AREA CONFIG')
                throw new ExceptionType(400, 'There are no available appointments in this area, please contact support')
            }

            // If you need to block out a number of appointments on a particular day in any area
            // the global configurations will be used
            const overrideOnDate = globalConfigurations.find(elem => getProperty(elem, 'Date') === date)
            maxDailyAM = overrideOnDate ? getProperty(overrideOnDate, 'AM') : maxDailyAM
            maxDailyPM = overrideOnDate ? getProperty(overrideOnDate, 'PM') : maxDailyPM

            console.log('overrideOnDate', overrideOnDate)
            console.log('maxDailyAM', maxDailyAM)
            console.log('maxDailyPM', maxDailyPM)

            // If you need to block out a number of appointments on a particular day in a specific area
            // the area config will be used with a date
            const areaOverrideOnDate = areaConfigurations.find(elem => getProperty(elem, 'Date') === date)
            maxDailyAM = areaOverrideOnDate ? getProperty(areaOverrideOnDate, 'AM') : maxDailyAM
            maxDailyPM = areaOverrideOnDate ? getProperty(areaOverrideOnDate, 'PM') : maxDailyPM
            console.log('areaOverrideOnDate', areaOverrideOnDate)
            console.log('maxDailyAM', maxDailyAM)
            console.log('maxDailyPM', maxDailyPM)

            const existingBookings = existingAptCountByDate[date];
            const hasExistingBookingsAM: boolean = existingBookings && existingBookings['AM'];
            const hasExistingBookingsPM: boolean = existingBookings && existingBookings['PM'];

            console.log('hasExistingBookingsAM', hasExistingBookingsAM)
            console.log('existingBookingsAM', existingBookings ? existingBookings['AM'] : 0)
            console.log('hasExistingBookingsPM', hasExistingBookingsPM)
            console.log('existingBookingsPM', existingBookings ? existingBookings['PM'] : 0)

            // if this is the overview
            if (options && options.isOverview) {
                maxDailyAM = '100000'
                maxDailyPM = '100000'
            }

            console.log('options', options)

            let availability: IServiceAppointmentAvailability;

            console.log('maxDailyAM', maxDailyAM)
            console.log('maxDailyPM', maxDailyPM)

            // for the reporting permission show the total number of scheduled appointments
            if (hasPermission(principal, 'fieldservice.reporting')) {
                availability = {
                    Date: date,
                    AM: hasExistingBookingsAM ? existingBookings['AM'] < Number(maxDailyAM) : Number(maxDailyAM) > 0,
                    PM: hasExistingBookingsPM ? existingBookings['PM'] < Number(maxDailyPM) : Number(maxDailyPM) > 0,
                    AMCount: hasExistingBookingsAM ? existingBookings['AM'] : 0,
                    PMCount: hasExistingBookingsPM ? existingBookings['PM'] : 0,
                    Config: areaConfig || globalConfig,
                };
            } else {
                availability = {
                    Date: date,
                    AM: hasExistingBookingsAM ? existingBookings['AM'] < Number(maxDailyAM) : Number(maxDailyAM) > 0,
                    PM: hasExistingBookingsPM ? existingBookings['PM'] < Number(maxDailyPM) : Number(maxDailyPM) > 0,
                };

            }

            availableAppointments.push(availability);
        }

        return availableAppointments;
    }

    /**
     *
     * @param principal
     * @param dateRange
     * @param type
     * @param exPolygonId
     * @param areaConfigurations
     * @param options
     */
    private async constructExistingAppointmentsByDate(
        principal: OrganizationUserEntity,
        dateRange: any,
        type: string,
        exPolygonId: string,
        areaConfigurations: DbRecordEntityTransform[],
        options: { isOverview: boolean },
    ) {
        const { existingAppointments } = await this.findExistingAppointmentsByDateRange(
            principal,
            dateRange,
            type,
            exPolygonId,
            areaConfigurations,
            options,
        );

        let existingAptCountByDate = {};
        for(const parsedApt of existingAppointments) {

            const date = getProperty(parsedApt, 'Date');
            const timeBlock = getProperty(parsedApt, 'TimeBlock');

            if (existingAptCountByDate[date]) {
                if (existingAptCountByDate[date][timeBlock]) {
                    // increment existing type
                    existingAptCountByDate[date][timeBlock] += 1;
                } else {
                    // Set initial type
                    existingAptCountByDate[date][timeBlock] = 1;
                }
            } else {
                // Set initial date and type
                existingAptCountByDate = Object.assign({}, existingAptCountByDate, {
                    [date]: {
                        [timeBlock]: 1,
                    },
                });
            }
        }

        return existingAptCountByDate;
    }

    /**
     *
     * @param principal
     * @param query
     */
    private constructDateRange(principal: OrganizationUserEntity, query: { start: string, end: string }): string[] {
        let dateRange;

        const now = dayjs().format('YYYY-MM-DD');

        if (!dayjs(query.start).isValid() || !dayjs(query.end).isValid()) {
            throw new ExceptionType(400, 'date is not in correct format YYYY-MM-DD');
        }

        // Dates should not be less than 14 days from the query start
        if (dayjs(now).add(14, 'day').isAfter(query.start) && !hasRole(principal, 'FieldServiceAdmin')) {

            // find the difference of the query start date and 14 days from now
            const diffInDays = dayjs(dayjs(now).add(14, 'day')).diff(query.start, 'day');

            // if the difference is a positive number then the query start date is in inside of 14 days and we want to
            // add the difference so the startDate is a minimum of 14 days from today.
            const adjStartDate = dayjs(query.start).add(diffInDays, 'day').format('YYYY-MM-DD');

            // get the end date which would be 7 days from the start date
            const adjEndDate = dayjs(adjStartDate).add(7, 'day').format('YYYY-MM-DD');

            dateRange = getFullWeekDateRangeFromStartAndEnd(adjStartDate, adjEndDate);

        } else {
            dateRange = getFullWeekDateRangeFromStartAndEnd(query.start, query.end);
        }

        // Validation
        if (dateRange.length > 31) {
            throw new ExceptionType(500, 'maximum range of 1 month');
        }
        return dateRange;
    }

    /**
     *
     * @param principal
     * @param dateRange
     * @param type
     * @param exPolygonId
     * @param areaConfigurations
     * @param options
     */
    private async findExistingAppointmentsByDateRange(
        principal: OrganizationUserEntity,
        dateRange: string[],
        type: string,
        exPolygonId: string,
        areaConfigurations: DbRecordEntityTransform[],
        options: { isOverview: boolean },
    ) {

        const serviceAppointmentSchema = await this.schemasService.getSchemaByOrganizationAndEntity(
            principal,
            `${SchemaModuleTypeEnums.FIELD_SERVICE_MODULE}:${SchemaModuleEntityTypeEnums.SERVICE_APPOINTMENT}`,
        );

        let areaConfig = areaConfigurations[0]

        if (options && !options.isOverview) {
            console.log('exPolygonId.split(\',\')', getProperty(areaConfig, 'ExPolygonId').split(','))
        }

        // Get the existing appointments
        const existingAppointments = await this.dbService.getManyDbRecordsByPropertiesTransformed(principal, {
            entity: `${SchemaModuleTypeEnums.FIELD_SERVICE_MODULE}:${SchemaModuleEntityTypeEnums.SERVICE_APPOINTMENT}`,
            properties: options.isOverview ?
                [
                    {
                        columnName: 'Type',
                        operator: 'EQ',
                        value: type,
                    },
                    {
                        columnName: 'Date',
                        operator: 'IN',
                        value: dateRange,
                    },
                ]
                : [
                    {
                        columnName: 'Type',
                        operator: 'EQ',
                        value: type,
                    },
                    {
                        columnName: 'Date',
                        operator: 'IN',
                        value: dateRange,
                    },
                    {
                        columnName: 'ExPolygonId',
                        operator: 'IN',
                        value: getProperty(areaConfig, 'ExPolygonId').split(','),
                    },
                ],
        });

        console.log('existingAppointments', existingAppointments)

        return { serviceAppointmentSchema, existingAppointments };
    }

    /**
     *
     * @param availableAppointments
     */
    private async isFirstSelectableDateAvailable(availableAppointments: { Date: string, AM: boolean, PM: boolean }[]) {
        const firstApt = availableAppointments[0];

        return firstApt.AM || firstApt.PM;
    }

    /**
     *
     * @param availableAppointments
     */
    private async getFirstAvailableAppointmentInRange(availableAppointments: { Date: string, AM: boolean, PM: boolean }[]) {

        return availableAppointments.find(apt => apt.AM || apt.PM);

    }


    /**
     *
     * @param workOrderId
     * @param body
     * @param principal
     */
    public async createServiceAppointmentForWorkOrder(
        principal: OrganizationUserEntity,
        workOrderId: string,
        body: ServiceAppointmentCreateDto,
    ) {
        try {

            const { SERVICE_APPOINTMENT, ADDRESS } = SchemaModuleEntityTypeEnums;

            if (!body['Date'] || !body['TimeBlock']) {
                throw new ExceptionType(400, 'missing complete Date and TimeBlock');
            }
            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ SERVICE_APPOINTMENT, ADDRESS ],
            );

            const address = getFirstRelation(workOrder, ADDRESS)

            console.log('address', address)

            // Create Service Appointment
            const serviceAppointment = new DbRecordCreateUpdateDto();
            serviceAppointment.entity = `${FIELD_SERVICE_MODULE}:${SERVICE_APPOINTMENT}`;
            serviceAppointment.properties = {
                Date: body['Date'],
                TimeBlock: body['TimeBlock'],
                Type: workOrder.type || getProperty(workOrder, 'Type'),
                ExPolygonId: address ? getProperty(address, 'ExPolygonId') : body['ExPolygonId'],
            };
            serviceAppointment.associations = [
                {
                    recordId: workOrderId,
                },
            ];

            // set the type equal to the work order type
            // ODN-1534 - introduced record types for work orders
            body['Type'] = workOrder.type || getProperty(workOrder, 'Type')

            // validate that this can be reserved
            const isAvailable = await this.isAppointmentAvailable(principal, body);

            if (workOrder[SERVICE_APPOINTMENT].dbRecords && workOrder[SERVICE_APPOINTMENT].dbRecords.length > 0) {
                throw new ExceptionType(409, 'cannot have two appointments scheduled, cancel the previous and rebook');
            }

            if (isAvailable) {
                return await this.dbService.updateOrCreateDbRecordsByPrincipal(
                    principal,
                    [ serviceAppointment ],
                    { upsert: false },
                );
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation, e.data);
        }
    }

    /**
     *
     * @param principal
     * @param body
     */
    private async isAppointmentAvailable(
        principal: OrganizationUserEntity,
        body: ServiceAppointmentCreateDto,
    ) {

        const availableAppointments = await this.getAvailabilityByOrganization(
            principal,
            { start: body['Date'], end: body['Date'], type: body['Type'], exPolygonId: body['ExPolygonId'] },
            { isOverview: false },
        );

        const hasMatchingDate = availableAppointments.find(elem => elem.Date === body['Date'] && elem[body['TimeBlock']]);

        if (!hasMatchingDate) {
            throw new ExceptionType(
                400,
                `no appointments available on ${body['Date']}`,
                [],
                { availableAppointments },
            );
        } else {
            return true;
        }
    }

    /**
     * templateLabels:
     * SENDGRID_WORK_ORDER_STAGE_CHANGE
     * SENDGRID_WORK_ORDER_CONFIRMATION
     * SENDGRID_WORK_ORDER_CANCELED_CONFIRMATION
     *
     * @param principal
     * @param workOrderId
     * @param templateLabel
     * @param body
     */
    public async sendEmail(
        principal: OrganizationUserEntity,
        workOrderId: string,
        templateLabel: string,
        body?: SendgridEmailEntity,
    ): Promise<any> {
        try {

            const { CONTACT, ADDRESS, ORDER_ITEM, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ CONTACT, ADDRESS, ORDER_ITEM, SERVICE_APPOINTMENT ],
            );

            await this.validateEmail(workOrder);

            const workOrderAddress = workOrder[ADDRESS];
            const workOrderServiceApp = workOrder[SERVICE_APPOINTMENT];
            const workOrderItems = workOrder[ORDER_ITEM];


            const newEmail = new SendgridEmailEntity();
            newEmail.to = getPropertyFromRelation(workOrder, CONTACT, 'EmailAddress');
            newEmail.from = principal.organization.billingReplyToEmail;
            newEmail.templateLabel = templateLabel;
            newEmail.dynamicTemplateData = Object.assign({}, {
                recordId: workOrderId,
                recordNumber: workOrder.recordNumber,
                contactFirstName: getPropertyFromRelation(workOrder, CONTACT, 'FirstName'),
                address: workOrderAddress.dbRecords[0]['properties'],
                workOrder: workOrder['properties'],
                serviceAppointment: Object.assign({}, workOrderServiceApp.dbRecords[0].properties, {
                    Date: dayjs(getPropertyFromRelation(workOrder, SERVICE_APPOINTMENT, 'Date')).format(
                        'DD-MM-YYYY'),
                    TimeRange: getPropertyFromRelation(
                        workOrder,
                        SERVICE_APPOINTMENT,
                        'TimeBlock',
                    ) === 'AM' ? '8am - 1pm' : '1pm - 6pm',
                }),
                currentStage: workOrder.stage.name,
                orderItems: workOrderItems.dbRecords.map(elem => ({
                    lineItemName: elem.title,
                    lineItemQuantity: getProperty(elem, 'Quantity'),
                    lineItemDescription: getProperty(elem, 'Description'),
                })),
                organizationName: principal.organization.name,
            }, body ? body.dynamicTemplateData : {});

            await this.amqpConnection.publish(
                NOTIFICATION_MODULE,
                `${NOTIFICATION_MODULE}.${SUB_SEND_DYNAMIC_EMAIL}`,
                {
                    principal,
                    body: newEmail,
                },
            )

            return { status: 'processed' };
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }


    /**
     *
     * @param workOrder
     */
    private async validateEmail(workOrder: DbRecordEntityTransform) {

        const { CONTACT, ADDRESS, ORDER_ITEM, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

        const workOrderAddress = workOrder[ADDRESS];
        const workOrderServiceApp = workOrder[SERVICE_APPOINTMENT];
        const workOrderItems = workOrder[ORDER_ITEM];
        const contact = workOrder[CONTACT];

        if (!contact) {
            throw new ExceptionType(400, 'no contact, cannot send confirmation');
        }
        if (!workOrderItems) {
            throw new ExceptionType(400, 'no order items, cannot send confirmation');
        }
        if (!workOrderAddress) {
            throw new ExceptionType(400, 'no address, cannot send confirmation');
        }
        if (!workOrderServiceApp) {
            throw new ExceptionType(400, 'no service appointment, cannot send confirmation');
        }
    }

    /**
     *
     * @param principal
     * @param serviceAppointmentId
     * @param body
     */
    async cancelServiceAppointmentForWorkOrder(
        principal: OrganizationUserEntity,
        serviceAppointmentId: string,
        body: DbRecordCreateUpdateDto,
    ): Promise<IDbRecordCreateUpdateRes[]> {
        try {

            const serviceAppointment = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                serviceAppointmentId,
                [ 'WorkOrder' ],
            );

            await this.dbService.deleteByPrincipalAndId(principal, serviceAppointmentId);

            // Create Cancellation Reason
            const cancellationReason = new DbRecordCreateUpdateDto();
            cancellationReason.entity = `${FIELD_SERVICE_MODULE}:CancellationReason`;
            cancellationReason.properties = body.properties;
            cancellationReason.associations = [
                {
                    recordId: serviceAppointment.WorkOrder.dbRecords[0].id,
                },
            ];

            return await this.dbService.updateOrCreateDbRecordsByPrincipal(
                principal,
                [ cancellationReason ],
                { upsert: false },
            );
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }

    }

    /**
     *
     * @param principal
     * @param workOrderId
     * @param serviceAppointmentId
     */
    public async enrichServiceAppointment(
        principal: OrganizationUserEntity,
        workOrderId: string,
        serviceAppointmentId: string,
    ) {
        try {
            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ ADDRESS ],
            );

            const address = getFirstRelation(workOrder, ADDRESS)

            const update = new DbRecordCreateUpdateDto();
            update.entity = `${FIELD_SERVICE_MODULE}:${SERVICE_APPOINTMENT}`;
            update.properties = {
                Type: getProperty(workOrder, 'Type'),
                ExPolygonId: getProperty(address, 'ExPolygonId'),
            };

            return await this.dbService.updateDbRecordsByPrincipalAndId(
                principal,
                serviceAppointmentId,
                update,
            );

        } catch (e) {
            console.error(e);
        }

    }

    private getAreaConfig(startDate: string, areaConfigurations: DbRecordEntityTransform[]) {
        return areaConfigurations.find(elem => {
            if (getProperty(elem, 'AvailableFrom')) {

                console.log('start', startDate)
                console.log('availAfter', getProperty(elem, 'AvailableFrom'))

                // check if the date is available after
                const isSame = dayjs(startDate).isSame(getProperty(elem, 'AvailableFrom'));
                const isAfter = dayjs(startDate).isAfter(getProperty(elem, 'AvailableFrom'));

                console.log('isSame', isSame)
                console.log('isAfter', isAfter)

                if (isSame || isAfter) {
                    return true
                }

            } else if (!getProperty(elem, 'AvailableFrom')) {
                // return the default schedule if there is no AvailableAfter date specified
                return getProperty(elem, 'IsDefault') === 'true'
            }
        })
    }
}
