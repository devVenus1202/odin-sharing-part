import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { chunkArray } from '../../../../helpers/utilities';
import {
    deleteFromS3,
    getFromS3,
    getManyRecordsDetail,
    getOdinRecordByExternalRef,
    getRecordDetail,
    getRelatedRecords,
} from '../data/http';
import { getNextConnectionByCableIdAndDirection } from '../data/sql';
import { preSplicingTubeAndFiberCheck } from '../pre-splicing-component-check';
import { FiberConnection } from '../types/fibre.connection';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;


/**
 *
 * @param closureId
 * @param principal
 * @param l0ClosureId
 * @param l1PolygonId
 * @param cableType
 * @param odinDb
 * @param cosmosDb
 * @param l2PolygonId
 */
export async function generateLoopCableFibreMappings(
    principal: OrganizationUserEntity,
    l0ClosureId: string,
    cableType: string,
    l1PolygonId: string,
    { odinDb, cosmosDb },
    l2PolygonId?: string,
) {

    let fibreConnections = []
    let fibreConnectionMappings = {}

    const errors = [];
    const modified = [];

    try {

        const tracesUrl = await getFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-mappings-gis-l1-polygon-${l1PolygonId}`,
        )
        const response = await axios.get(tracesUrl)
        const connectionMappings = response['data'];

        let outClosureType;
        if (cableType === 'Spine') {
            outClosureType = 'L1'
        } else if (cableType === 'Distribution') {
            outClosureType = 'L2'
        } else if (cableType === 'Access') {
            outClosureType = 'L3'
        }

        const loopCables = connectionMappings.filter(elem => elem.isLoopCable === true && elem.outCableType === cableType && elem.outClosureType === outClosureType);
        let sorted = loopCables.sort((a, b) => a.outClosure - b.outClosure).sort((
            a,
            b,
        ) => a.l4ClosureCount - b.l4ClosureCount);

        await deleteFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/${l1PolygonId ? `polygon-${l1PolygonId}` : `l0-${l0ClosureId}`}/${cableType.toLowerCase()}-loop-fiber-mappings`,
        )

        await deleteFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/${l1PolygonId ? `polygon-${l1PolygonId}` : `l0-${l0ClosureId}`}/${cableType.toLowerCase()}-loop-fiber-mappings-applied`,
        )

        // this will first run to make sure all tubes and fibers are created
        await preSplicingTubeAndFiberCheck(Number(l1PolygonId), cableType, { odinDb })

        const chunkedConnections = chunkArray(sorted, 25);

        let counts = {};
        for(const connection of sorted) {

            if (!counts[connection.outClosure]) {
                counts[connection.outClosure] = {
                    count: connection['l4ClosureCount'],
                    longestLoop: connection.outCable,
                }
            }

            if (counts[connection.outClosure]['count'] < connection['l4ClosureCount']) {
                counts[connection.outClosure] = {
                    count: connection['l4ClosureCount'],
                    longestLoop: connection.outCable,
                }
            }
        }

        // find the loop cable in the closure that has the most L4 counts

        const processMappings = []

        // create closure + cable connections
        for(const connections of chunkedConnections) {
            for(const connection of connections) {
                if (connection.inCable === counts[connection.outClosure]['longestLoop']) {
                    processMappings.push({ func: configureFibreMappings(connection, odinDb) })
                }
            }
            await Promise.all(processMappings.map(elem => elem.func)).catch(e => console.error(e))
        }


        // CONNECTIONS TO BE CREATED
        const keys = Object.keys(fibreConnectionMappings);

        for(const key of keys) {

            const mappings = fibreConnectionMappings[key];

            console.log('mappings', mappings)

            if (mappings['inClosure'] && mappings['outClosure']) {

                const inFibreKeys = Object.keys(mappings['inClosure']['tubesFibers']);
                for(const fkey of inFibreKeys) {

                    const downstreamClosure = mappings['inClosure'];
                    const upstreamClosure = mappings['outClosure'];

                    const downStreamTubeAndFibre = downstreamClosure['tubesFibers'][fkey];
                    const upstreamTubeAndFibre = upstreamClosure['tubesFibers'][fkey];

                    if (downStreamTubeAndFibre && upstreamTubeAndFibre) {

                        const connection = new FiberConnection();
                        connection.type = 'LOOP';
                        connection.closureId = upstreamClosure['closureId'];
                        connection.inClosureExt = upstreamClosure['closureExt'];
                        connection.cableInId = upstreamClosure['cableId'];
                        connection.cableInExternalRef = upstreamClosure['cableExt'];
                        connection.tubeFiberIn = fkey;
                        connection.tubeInId = upstreamTubeAndFibre['tubeId'];
                        connection.fiberInId = upstreamTubeAndFibre['fibreId'];
                        // closureId is the closure where the connections are happening
                        connection.outClosureExt = downstreamClosure['closureExt'];
                        connection.cableOutId = downstreamClosure['cableId'];
                        connection.cableOutExternalRef = downstreamClosure['cableExt'];
                        connection.tubeFiberOut = fkey;
                        connection.tubeOutId = downStreamTubeAndFibre['tubeId'];
                        connection.fiberOutId = downStreamTubeAndFibre['fibreId'];

                        fibreConnections.push(connection)

                    }

                }

            }

        }


        await putObjectToS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/${l1PolygonId ? `polygon-${l1PolygonId}` : `l0-${l0ClosureId}`}/${cableType.toLowerCase()}-loop-fiber-mappings`,
            Buffer.from(JSON.stringify(fibreConnections)),
        )

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ principal.email, 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `${cableType} loop fiber mappings complete for L0 Closure ${l0ClosureId}`,
            body: `Total connections to be created ${fibreConnections.length}`,
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );

        return { modified, errors };

    } catch (e) {
        console.error('e 181', e)
    }


    /**
     *
     * @param connection
     * @param odinDb
     */
    async function configureFibreMappings(connection, odinDb) {

        try {

            const closureConnectionKey = `${connection.outClosure}_${connection.inClosure}`

            console.log('connection', connection)
            console.log('inClosure', connection.inClosure)

            const inClosure = await getOdinRecordByExternalRef(
                connection.inClosure,
                'CLOSURE',
                { odinDb },
            )
            console.log('inClosure', inClosure)
            if (inClosure) {
                // get the in closure cable connections
                const inClosureConnections = await getRelatedRecords(
                    inClosure.id,
                    'Feature',
                    [ '\"CableConnection\"' ],
                    [],
                )
                const inCableConnections = inClosureConnections['CableConnection'].dbRecords;

                if (inCableConnections) {
                    // console.log('inCableConnections', inCableConnections)
                    const inConnection = inCableConnections.find(elem => getProperty(elem, 'Direction') === 'IN');

                    const inCable = await getRecordDetail(
                        getProperty(inConnection, 'CableId'),
                        'Feature',
                        [],
                    )

                    const inCableTubeIds = inCable.links.filter(elem => elem.type === 'CABLE_TUBE').map(elem => elem.id)
                    const inCableTubes = await getManyRecordsDetail(inCableTubeIds)
                    const inCableTubesSorted = inCableTubes.sort((a, b) => Number(getProperty(
                        a,
                        'TubeNumber',
                    )) - Number(
                        getProperty(b, 'TubeNumber')));

                    fibreConnectionMappings[closureConnectionKey] = {
                        ...fibreConnectionMappings[closureConnectionKey],
                        inClosure: {
                            closureExt: connection.inClosure,
                            cableExt: connection.inCable,
                            closureId: inClosure.id,
                            cableId: inCable.id,
                            tubesFibers: {},
                        },
                    }

                    for(const inCableTube of inCableTubesSorted) {

                        const inCableFibres = await getRelatedRecords(
                            inCableTube.id,
                            'FeatureComponent',
                            [ '\"FeatureComponent\"' ],
                        )
                        const inFibreRecords = inCableFibres['FeatureComponent'].dbRecords;

                        if (inFibreRecords) {
                            const sorted = inFibreRecords.sort((a, b) => Number(getProperty(a, 'FiberNumber')) - Number(
                                getProperty(b, 'FiberNumber')));

                            for(const fibre of sorted) {
                                fibreConnectionMappings[closureConnectionKey]['inClosure']['tubesFibers']
                                    [`T${getProperty(
                                    inCableTube,
                                    'TubeNumber',
                                )}:F${getProperty(
                                    fibre,
                                    'FiberNumber',
                                )}`] = {
                                    tubeId: inCableTube.id,
                                    fibreId: fibre.id,
                                }
                            }
                        } else {
                            console.log('_NO_FIBERS_CABLE', inCable['id'], '_TUBE', inCableTube['id'])
                        }
                    }

                    // OUT CLOSURE

                    // gets the upstream closure where the in cable is coming from
                    const upstreamConnections = await getNextConnectionByCableIdAndDirection(
                        getProperty(inConnection, 'CableId'),
                        'OUT',
                        getProperty(inCable, 'CableType'),
                        { odinDb },
                    );
                    if (upstreamConnections[0]['connections'] && upstreamConnections[0]['connections'][0]) {

                        // gets the upstream closures In cable that we need to make the fibre connections with
                        const cableToConnect = await getUpstreamClosureCableConnection(
                            upstreamConnections[0]['connections'][0]['closureId'],
                            'Feature',
                            'IN',
                            getProperty(inCable, 'CableType'),
                        )

                        if (cableToConnect) {
                            const outCableTubeIds = cableToConnect.links.filter(elem => elem.type === 'CABLE_TUBE').map(
                                elem => elem.id)

                            console.log('outCableTubeIds', outCableTubeIds)

                            const outCableTubes = await getManyRecordsDetail(outCableTubeIds)
                            const outCableTubesSorted = outCableTubes.sort((a, b) => Number(getProperty(
                                a,
                                'TubeNumber',
                            )) - Number(getProperty(b, 'TubeNumber')));

                            console.log('outCableTubes', outCableTubes)


                            fibreConnectionMappings[closureConnectionKey] = {
                                ...fibreConnectionMappings[closureConnectionKey],
                                outClosure: {
                                    closureExt: Number(upstreamConnections[0]['connections'][0]['closureExt']),
                                    cableExt: Number(getProperty(cableToConnect, 'ExternalRef')),
                                    closureId: upstreamConnections[0]['connections'][0]['closureId'],
                                    cableId: cableToConnect.id,
                                    tubesFibers: {},
                                },
                            }

                            for(const outCableTube of outCableTubesSorted) {
                                const outCableFibres = await getRelatedRecords(
                                    outCableTube.id,
                                    'FeatureComponent',
                                    [ '\"FeatureComponent\"' ],
                                )
                                const outFibreRecords = outCableFibres['FeatureComponent'].dbRecords;
                                if (outFibreRecords) {
                                    const sorted = outFibreRecords.sort((a, b) => Number(getProperty(
                                        a,
                                        'FiberNumber',
                                    )) - Number(
                                        getProperty(b, 'FiberNumber')));

                                    for(const fibre of sorted) {
                                        fibreConnectionMappings[closureConnectionKey]['outClosure']['tubesFibers']
                                            [`T${getProperty(
                                            outCableTube,
                                            'TubeNumber',
                                        )}:F${getProperty(
                                            fibre,
                                            'FiberNumber',
                                        )}`] = {
                                            tubeId: outCableTube.id,
                                            fibreId: fibre.id,
                                        }
                                    }
                                } else {
                                    console.log(
                                        '_NO_OUT_FIBERS_CABLE',
                                        cableToConnect['id'],
                                        '_TUBE',
                                        outCableTube['id'],
                                    )
                                }
                            }
                        }
                    }
                }
            }

        } catch (e) {

            console.error('e 344', e)

        }
    }


    /**
     *
     * @param closureId
     * @param odinDb
     * @param direction
     */
    async function getUpstreamClosureCableConnection(
        closureId: any,
        odinDb: any,
        direction: 'IN' | 'OUT',
        cableType: string,
    ) {

        try {

            // get the port seals
            const closureConnections = await getRelatedRecords(
                closureId,
                'Feature',
                [ '\"CableConnection\"' ],
                [],
            )

            const inRecords = closureConnections['CableConnection'].dbRecords;

            // console.log('inRecords', inRecords)
            // console.log('cableType', cableType)
            // console.log('direction', direction)

            // console.log('inRecords', inRecords)
            const connection = inRecords.find(elem => getProperty(elem, 'Direction') === direction && getProperty(
                elem,
                'CableType',
            ) === cableType);

            if (connection) {

                const cable = await getRecordDetail(
                    getProperty(connection, 'CableId'),
                    'Feature',
                    [],
                )

                return cable;

            }

        } catch (e) {
            console.error('e 398', e)
        }


    }

}
