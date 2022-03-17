import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import * as dotenv from 'dotenv';
import { createConnection, getConnection } from 'typeorm';
import { deleteObjectFromS3 } from '../../../common/awsS3/buckets/buckets.service';
import { chunkArray } from '../../../helpers/utilities';
import { checkDataForL1Polygon } from './auto-connect-data-checks-l1';
import { checkDataForL2Polygon } from './auto-connect-data-checks-l2';
import {
    getAllClosuresWithCableConnections,
    getAllClosuresWithNoFiberConnections,
    getClosureIdsByPolygonId,
    getPolygonsAndClosuresInExPolygon,
} from './data/sql';
import { getClosureTypeByCableName } from './data/utils';
import { importFeaturesIntoOdin } from './importers/import-features-into-odin';
import { setAppliedTemplates } from './set-applied-templates';
import { createLoopFiberConnections } from './template-actions/create-loop-fiber-connections';
import { createManyCableConnections } from './template-actions/create-many-cable-connections';
import { createFiberConnections } from './template-actions/fiber-connections-create';
import { deleteFiberConnections } from './template-actions/fiber-connections-delete';
import { updateFiberConnections } from './template-actions/fiber-connections-update';
import { resetConnections } from './template-actions/reset-closure-connections';
import { resetFibersByCableId } from './template-actions/reset-fibers-by-cable-id';
import { resetFibersByL2PolygonId } from './template-actions/reset-fibers-by-l2-polygon';
import { resetLoopFibersByL2PolygonId } from './template-actions/reset-loop-fibres-by-l2-polygon';
import { generateCableMappings } from './template-generators/generate-cable-mappings';
import { createL0Connections } from './template-generators/generate-fiber-connection-map-l0';
import { createL1Connections } from './template-generators/generate-fiber-connection-map-l1';
import { createL2Connections } from './template-generators/generate-fiber-connection-map-l2';
import { spliceL4Connections } from './template-generators/generate-fiber-connection-map-l4';
import { generateLoopCableFibreMappings } from './template-generators/generate-fiber-mapping-for-loop-cables';
import { traceByL0ClosureId } from './tracing/trace-connections-gis-parsed';

dotenv.config({ path: '../../../../.env' });

let argProcess = process.argv.find(arg => arg.indexOf('proc') > -1);
let proc = argProcess ? argProcess.split('=')[1] : null;

let argPolygonId = process.argv.find(arg => arg.indexOf('polygonid') > -1);
let polygonId = argPolygonId ? argPolygonId.split('=')[1] : null;

let argExPolygonId = process.argv.find(arg => arg.indexOf('expolygonid') > -1);
let exPolygonId = argExPolygonId ? argExPolygonId.split('=')[1] : null;

let argL1PolygonId = process.argv.find(arg => arg.indexOf('l1polygonid') > -1);
let l1PolygonId = argL1PolygonId ? argL1PolygonId.split('=')[1] : null;

let argL2PolygonId = process.argv.find(arg => arg.indexOf('l2polygonid') > -1);
let l2PolygonId = argL2PolygonId ? argL2PolygonId.split('=')[1] : null;

let argClosureType = process.argv.find(arg => arg.indexOf('closuretype') > -1);
let closureType = argClosureType ? argClosureType.split('=')[1] : null;

let argL0ClosureId = process.argv.find(arg => arg.indexOf('l0closureid') > -1);
let l0ClosureId = argL0ClosureId ? argL0ClosureId.split('=')[1] : null;

let argL1ClosureId = process.argv.find(arg => arg.indexOf('l1closureid') > -1);
let l1ClosureId = argL1ClosureId ? argL1ClosureId.split('=')[1] : null;

let argL2ClosureId = process.argv.find(arg => arg.indexOf('l2closureid') > -1);
let l2ClosureId = argL2ClosureId ? argL2ClosureId.split('=')[1] : null;

let argL4ClosureId = process.argv.find(arg => arg.indexOf('l4closureid') > -1);
let l4ClosureId = argL4ClosureId ? argL4ClosureId.split('=')[1] : null;


let argExtRef = process.argv.find(arg => arg.indexOf('extref') > -1);
let extRef = argExtRef ? argExtRef.split('=')[1] : null;

let argFeatureType = process.argv.find(arg => arg.indexOf('featuretype') > -1);
let featureType = argFeatureType ? argFeatureType.split('=')[1] : null;


async function execute() {

    let odinDb;
    let cosmosDb;

    try {

        odinDb = await createConnection({
            type: 'postgres',
            name: 'odinDb',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities: [],
        });
    } catch (e) {

        console.error(e);
        odinDb = await getConnection('odinDb');
    }

    try {

        cosmosDb = await createConnection({
            type: 'postgres',
            name: 'netomniaConnection',
            host: process.env.DB_GIS_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_GIS_USERNAME,
            password: process.env.DB_GIS_PASSWORD,
            database: process.env.DB_GIS_NAME,
            synchronize: false,
            entities: [],
        });

    } catch (e) {
        console.error(e);
        cosmosDb = await getConnection('cosmosDb');
    }


    if (!proc) {
        throw new Error('proc= required parameter (check, trace, cable, splicel4, splicel2)')
    }

    if (proc === 'forms') {


    }

    if (proc === 'test') {

        const res = await getPolygonsAndClosuresInExPolygon(41850, { cosmosDb })
        console.log('res', res)

        console.log(JSON.stringify(res))

        return res;
    }

    if (proc === 'setapplied') {
        await setAppliedTemplates({ cosmosDb })
    }

    /**
     * Step1: trace all the cables and closures in cosmos
     *
     * @param closureId is the L0 closure Id we want to run a full trace on
     */
    if (proc === 'import') {
        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        await importFeaturesIntoOdin(principal, l1PolygonId, featureType, { odinDb, cosmosDb })
    }

    /**
     * Step1: trace all the cables and closures in cosmos
     *
     * @param closureId is the L0 closure Id we want to run a full trace on
     */
    if (proc === 'trace') {
        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        await traceByL0ClosureId(principal, l0ClosureId, l1PolygonId, 'Spine', { cosmosDb })
    }

    /**
     * Step 1.1: trace all the cables and closures in cosmos
     *
     * @param l0ClosureId is the L0 closure Id we want to run a full trace on
     */
    if (proc === 'mapcables') {

        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        await generateCableMappings(principal, l0ClosureId, l1PolygonId)
    }

    /**
     * Aggregates tracing, mapping, creating cable connections
     *
     * @param l0ClosureId is the L0 closure Id we want to run a full trace on
     */
    if (proc === 'genloop') {

        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        for(const cableType of [ 'Access' ]) {
            await generateLoopCableFibreMappings(principal, l0ClosureId, cableType, l1PolygonId, { odinDb, cosmosDb })
        }
    }


    /**
     * Aggregates tracing, mapping, creating cable connections
     *
     * @param l0ClosureId is the L0 closure Id we want to run a full trace on
     */
    if (proc === 'agg:connect') {

        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        await traceByL0ClosureId(principal, l0ClosureId, l1PolygonId, 'Spine', { cosmosDb })
        await generateCableMappings(principal, l0ClosureId, l1PolygonId)
        await createManyCableConnections(principal, l0ClosureId, l1PolygonId, { odinDb, cosmosDb })
        for(const cableType of [ 'Spine', 'Access', 'Distribution' ]) {
            await generateLoopCableFibreMappings(principal, l0ClosureId, cableType, l1PolygonId, { odinDb, cosmosDb })
        }
    }

    /**
     * Step 2 - add all the cables to closures
     *
     * @param l0ClosureId is the L0 closure Id traced in step 1
     */
    if (proc === 'addcables') {

        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        await createManyCableConnections(principal, l0ClosureId, l1PolygonId, { odinDb, cosmosDb })

    }

    /**
     * Step 1.1: trace all the cables and closures in cosmos
     *
     * @param l0ClosureId is the L0 closure Id we want to run a full trace on
     */
    if (proc === 'resetfibers') {

        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        await resetFibersByCableId(extRef, { odinDb })
    }


    /**
     * Step 3 - generate fiber mappings for loop cables. This uses the total # of L4 counts
     * in the path for all cables from L0 -> L4
     *
     * @param l0ClosureId is the L0 closure Id traced in step 1
     */
    if (proc === 'setloopcables') {

        const principal = new OrganizationUserEntity()
        principal.email = 'frank@d19n.io';

        for(const cableType of [ 'Spine', 'Access', 'Distribution' ]) {
            await generateLoopCableFibreMappings(
                principal,
                l0ClosureId,
                cableType,
                l1PolygonId,
                { odinDb, cosmosDb },
                l2PolygonId,
            )
        }
    }

    /**
     * Step 4 - create fiber connections for loop cables
     *
     * @param l2PolygonId is the L2 polgon Id we want to connect
     * @param l0ClosureId is the L0 closure Id traced in step 1
     */
    if (proc === 'addloopfibers') {

        const principal = new OrganizationUserEntity()
        principal.firstname = 'frank';
        principal.email = 'frank@d19n.io';

        for(const cableType of [ 'Spine', 'Access', 'Distribution' ]) {
            const closureTypes = getClosureTypeByCableName(cableType)
            for(const closureType of closureTypes) {
                await createLoopFiberConnections(
                    principal,
                    l0ClosureId,
                    l1PolygonId,
                    l2PolygonId,
                    closureType,
                    cableType,
                    { odinDb, cosmosDb },
                )
            }
        }
    }

    /**
     * Pre-run: check the geometric data cable connections for a polygon
     *
     * @param closureId is the L0 closure Id to trace from
     */
    if (proc === 'check') {
        if (l1PolygonId && !l2PolygonId) {
            await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb, cosmosDb })
        }
        if (l2PolygonId) {
            await checkDataForL2Polygon(l0ClosureId, l1PolygonId, l2PolygonId, { odinDb, cosmosDb })
        }

    }

    /**
     * Step 5 - splice L4 closures to L3
     *
     * @param l2PolygonId is the L2 polygon Id we want to connect
     * @param l4ClosureId (optional) is the L4 closure Id we want to run a trace for
     * if closureId is not supplied it will run for all L4 closures not already processed
     * inside of the L2 polygon
     */
    if (proc === 'gentempl4') {
        await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb, cosmosDb })
        await spliceL4Connections(l2PolygonId, l1PolygonId, l4ClosureId, { odinDb, cosmosDb })
    }

    /**
     * Step 6 - split L2 closures to L1
     *
     * @param l2PolygonId is the L2 polygon Id we want to connect
     * @param l2ClosureId (optional) is the L2 closure Id we want to run a trace for
     * if closureId is not supplied it will run for all L2 closures not already processed
     * inside of the L2 polygon
     */
    if (proc === 'gentempl2') {
        await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb, cosmosDb })
        await createL2Connections(l2PolygonId, l1PolygonId, l2ClosureId, { odinDb, cosmosDb })
    }

    if (proc === 'gentempl1') {
        await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb, cosmosDb })
        await createL1Connections(l1PolygonId, l1ClosureId, { odinDb, cosmosDb })
    }

    if (proc === 'gentempl0') {
        await createL0Connections(exPolygonId, l0ClosureId, { odinDb, cosmosDb })
    }

    // this function looks for a state file and completes the following steps
    // 1. delete existing connections
    // 2. update used fibers
    // 3. create new connections
    if (proc === 'create') {

        const principal = new OrganizationUserEntity()
        principal.firstname = 'frank';
        principal.email = 'frank@d19n.io';

        let closureIds = []

        if (polygonId && closureType) {

            const ids = await getClosureIdsByPolygonId(polygonId, closureType, { cosmosDb })

            if (ids[0]) {
                closureIds = ids.map(elem => elem['id'])
            }

            let closures = []
            if ([ 'L0', 'L1', 'L2', 'L3' ].includes(closureType)) {
                closures = await getAllClosuresWithCableConnections(closureIds, closureType, { odinDb })
            } else {
                // L4s should not have any fiber connections
                closures = await getAllClosuresWithNoFiberConnections(closureIds, closureType, { odinDb })
            }

            console.log('closureIds', closureIds)
            console.log('closures', closures)

            const idsNoConnection = closureIds.filter(id => closures.map(elem => elem['ext_ref']).includes(String(id)))

            console.log('idsNoConnection', idsNoConnection)

            const chunkedConnections = chunkArray(idsNoConnection, 100);

            for(const chunk of chunkedConnections) {

                let processAsyncCreate = []
                let processAsyncDelete = []
                let processAsyncUpdate = []

                // L0 closures we should only create new connections
                if (closureType !== 'L0') {
                    for(const closureId of idsNoConnection) {
                        // rabbitmq
                        processAsyncUpdate.push({
                            func: updateFiberConnections(
                                polygonId,
                                closureId,
                                closureType,
                                { odinDb },
                            ),
                        })
                    }
                    await Promise.all(processAsyncUpdate.map(elem => elem.func))
                }

                // L0 closures we should only create new connections
                if (closureType !== 'L0') {
                    for(const closureId of chunk) {
                        // rabbitmq
                        processAsyncDelete.push({
                            func: deleteFiberConnections(
                                polygonId,
                                closureId,
                                closureType,
                                { odinDb },
                            ),
                        })
                    }
                    await Promise.all(processAsyncDelete.map(elem => elem.func))
                }

                for(const closureId of idsNoConnection) {
                    // rabbitmq
                    processAsyncCreate.push({
                        func: createFiberConnections(
                            principal,
                            polygonId,
                            closureId,
                            closureType,
                            { odinDb },
                        ),
                    })
                }
                await Promise.all(processAsyncCreate.map(elem => elem.func))

            }
        }
    }

    // It will look for a state file and delete any connections created
    // It will then mark all fibers from USED to null
    if (proc === 'resetwithstate') {

        let closureIds = extRef ? [ extRef ] : []

        if (polygonId && !extRef) {

            const ids = await getClosureIdsByPolygonId(polygonId, closureType, { cosmosDb })

            if (ids[0]) {
                closureIds = ids.map(elem => elem['id'])
            }
        }

        for(const closureId of closureIds) {
            const principal = new OrganizationUserEntity()
            principal.email = 'frank@d19n.io';
            // send to rabbitmq
            await resetConnections(principal, polygonId, closureId, closureType, { odinDb })

        }
    }

    if (proc === 'dels3template') {
        try {
            let closureIds = []

            if (l2PolygonId) {

                const ids = await getClosureIdsByPolygonId(l2PolygonId, closureType, { cosmosDb })

                if (ids[0]) {
                    closureIds = ids.map(elem => elem['id'])
                }

                for(const closureExtRef of closureIds) {
                    // send to rabbitmq
                    await deleteObjectFromS3(
                        `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                        `auto-connect/polygon-${l2PolygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureExtRef}`,
                    )
                }
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    if (proc === 'resetFibersByL2Polygon') {
        if (l2PolygonId) {
            await resetFibersByL2PolygonId(l2PolygonId, { odinDb })
        }
    }

    if (proc === 'resetLoopFiberByL2Polygon') {
        if (l2PolygonId) {
            await resetLoopFibersByL2PolygonId(l2PolygonId, { odinDb })
        }
    }

    // if(proc === 'markusedall') {
    //
    //     let closureIds = []
    //
    //     if(l2PolygonId) {
    //
    //         const ids = await getClosureIdsByPolygonId(l2PolygonId, closureType, { cosmosDb })
    //
    //         if(ids[0]) {
    //             closureIds = ids.map(elem => elem['id'])
    //         }
    //
    //         for(const closureId of closureIds) {
    //
    //             await markFibresUsedConnections(l2PolygonId, closureId, closureType, { odinDb })
    //
    //         }
    //     }
    //
    // }
    //
    //
    // if(proc === 'markunusedall') {
    //
    //     let closureIds = []
    //
    //     if(l2PolygonId) {
    //
    //         const ids = await getClosureIdsByPolygonId(l2PolygonId, closureType, { cosmosDb })
    //
    //         if(ids[0]) {
    //             closureIds = ids.map(elem => elem['id'])
    //         }
    //
    //         for(const closureId of closureIds) {
    //
    //             await markFibresUnUsedConnections(l2PolygonId, closureId, closureType, { odinDb })
    //
    //         }
    //     }
    //
    // }


    odinDb.close();
    cosmosDb.close();

}


execute();
