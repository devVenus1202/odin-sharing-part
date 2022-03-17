import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { deleteFromS3, getFromS3 } from '../data/http';
import { getIntersectingCablesByClosureId, getIntersectingClosuresByCableId } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

export async function traceByL0ClosureId(
    principal: OrganizationUserEntity,
    l0ClosureId: string,
    l1PolygonId: string,
    cableType: string,
    { cosmosDb },
) {

    let closureCables = [];

    let searched = []

    let connectionMappings = []

    const searchedCables = [];
    let searchedCablesObj = {}
    let searchingCable;
    let searchingClosure;

    try {

        await deleteFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-traces-gis-l1-polygon-${l1PolygonId}`,
        )

        await deleteFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-mappings-gis-l1-polygon-${l1PolygonId}`,
        )

        await cosmosDb.query('refresh materialized view pedro.frankcable')

        // This will return all GIS external ids for features in a given EX Polygon
        let closureIds = [ Number(l0ClosureId) ];
        if (l1PolygonId) {
            const closures = await cosmosDb.query(`
            SELECT
                a.id
            FROM ftth.closure as a
            LEFT JOIN ftth.polygon as p on ST_Intersects(a.geometry, p.geometry)
            WHERE p.id = ${l1PolygonId}
            `);
            closureIds.push(...closures.map(elem => elem.id))
        }

        console.log('closureIds', closureIds)

        const startClosure = await getIntersectingCablesByClosureId(
            l0ClosureId,
            cableType,
            searchedCables,
            { cosmosDb },
        );

        // Create an object tree that finds all closure and cable intersects
        const fullTree = await recursivelyTraceCablesToClosures(startClosure, cosmosDb)

        await putObjectToS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-traces-gis-l1-polygon-${l1PolygonId}`,
            Buffer.from(JSON.stringify(fullTree)),
        )

        const link = await getFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-traces-gis-l1-polygon-${l1PolygonId}`,
        )

        fs.writeFileSync(`trace.json`, JSON.stringify(fullTree));

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ principal.email, 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Trace for closure ${l0ClosureId} complete`,
            body: `template can be applied`,
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );

        return link;

        /**
         * When there are multiple closures intersecting cables
         * we want to get the farthest closure
         *
         * You should only send in closures with the same Type i.e
         * only an array of L2s or only an array of L3s etc..
         *
         * @param closures
         */
        function findFarthestClosure(closures: any) {

            let closure = closures[0];

            if (closures.length > 1) {

                const inClosureIds = connectionMappings.map(elem => elem.inClosure);

                const filtered = closures.filter(elem => !inClosureIds.includes(elem['id']))

                // Finds the farthest closure based on ST_PointN closure intersecting
                // with the end of the cable. undefined if no match
                closure = filtered.find(elem => elem['id'] === elem['endClosureId'])

                console.log('closure 119', closure)

                // if the closure has already been used as an IN closure we want to
                // set the closure to undefined so that the next closest will be used
                // there is the chance that 2 closures are the same distance
                if (closure && inClosureIds.includes(closure['id'])) {

                    // This might be caused by multiple closures with the same length
                    // and one is already used

                    closure = undefined;

                }

                console.log('closure 134', closure)

                // Fallback to the old way we handled it but is inaccurate for curved lines that
                // come back towards the start closure
                // sorts closures farthest to nearest
                // first item in the array is the farthest
                if (!closure) {

                    const sorted = filtered.sort((a, b) => b.distFromStart - a.distFromStart);

                    console.log('sorted', sorted)

                    // Check for closures that have the same length
                    const multipleMatches = findMatchingLengths(filtered, sorted[0])

                    console.log('multipleMatches', multipleMatches)

                    if (multipleMatches) {


                        const availableClosure = multipleMatches.find(elem => !inClosureIds.includes(elem.id))

                        return availableClosure;
                        // find the next available closure
                    } else {

                        // return the closure farthest away
                        closure = sorted[0]

                    }
                }
            }

            return closure

        }

        /**
         *
         * @param closures
         * @param nearest
         */
        function findMatchingLengths(closures: any, nearest: any) {

            const matched = closures.filter(elem => elem.distFromStart === nearest.distFromStart)

            if (matched.length > 1) {
                return matched;
                // we have two closures the same distance
            }

        }

        /**
         *
         * @param closure
         * @param cosmosDb
         */
        async function recursivelyTraceCablesToClosures(
            closure: any,
            cosmosDb: any,
        ) {

            if (closureIds.includes(Number(closure.id))) {

                console.log('---------------------------------------------')
                console.log(`RECURSIVE_LOOP_${closure.id}`)
                console.log('---------------------------------------------')

                let shouldTrace = true
                if (searchingCable && searchingClosure) {
                    const connection = connectionMappings.find(elem => elem.inClosure === searchingClosure)
                    if (connection) {
                        shouldTrace = searchingCable === connection.inCable;
                    }
                }

                if (shouldTrace && closure) {
                    const cableTypes = getClosureCableCombinations(closure.type)

                    if (cableTypes) {

                        let cables = []
                        for(const cableType of cableTypes) {

                            const nextClosureAndCables = await getIntersectingCablesByClosureId(
                                closure.id,
                                cableType,
                                searchedCables,
                                { cosmosDb },
                            );

                            if (nextClosureAndCables && nextClosureAndCables.cables) {

                                for(const cable of nextClosureAndCables.cables) {

                                    if (!searchedCables.includes(cable.id)) {
                                        searchedCables.push(cable.id)

                                        const closureTypes = getCableClosureCombinations(cable.type)

                                        const cableClosures = await getIntersectingClosuresByCableId(
                                            cable.id,
                                            closure.id,
                                            closureTypes,
                                            { cosmosDb },
                                        )

                                        console.log('cableClosures', cableClosures)

                                        if (cableClosures) {
                                            let nextClosure = cableClosures[0];
                                            // get the farthest closure
                                            if (cableClosures.length > 0) {

                                                nextClosure = findFarthestClosure(cableClosures)
                                                if (nextClosure) {
                                                    console.log(`${nextClosure.id}_NEXT_CLOSURE`, nextClosure)

                                                    if (!cable['closures']) {
                                                        cable['closures'] = []
                                                    }

                                                    connectionMappings.push({
                                                        inCable: cable.id,
                                                        inClosure: nextClosure.id,
                                                    })

                                                    cable['closures'] = [ nextClosure ]
                                                    cables.push(cable)
                                                } else {
                                                    cable['closures'] = []
                                                }
                                            }
                                        }

                                        if (cables) {
                                            closure['cables'] = cables
                                        }

                                    }
                                }
                            }
                        }

                        if (closure.cables) {
                            for(const cable of closure.cables) {

                                if (!searchedCablesObj[cable.type]) {
                                    searchedCablesObj[cable.type] = [ cable.id ]
                                } else {
                                    searchedCablesObj[cable.type].push(cable.id)
                                }
                                searchedCables.push(cable.id)

                                if (cable && cable.closures) {
                                    for(const closure of cable.closures) {
                                        if (closureIds.includes(Number(closure.id))) {
                                            searchingCable = cable.id;
                                            searchingClosure = closure.id
                                            cable['closures'] = [
                                                await recursivelyTraceCablesToClosures(
                                                    closure,
                                                    cosmosDb,
                                                ),
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                searched.push(closure.id)
                return closure
            }
        }


        /**
         * Get the possible closures that would intersect a cable
         *
         * @param cableType
         */
        function getCableClosureCombinations(cableType: string) {

            if (cableType === 'Spine') {
                return [ 'L1' ]
            }
            if (cableType === 'Distribution') {
                return [ 'L2' ]
            }
            if (cableType === 'Access') {
                return [ 'L3' ]
            }
            if (cableType === 'Feed') {
                return [ 'L4', 'LM' ]
            }
        }

        /**
         * Get the possible closures that would intersect a cable
         *
         * @param cableType
         */
        function getClosureCableCombinations(closureType: string) {

            if (closureType === 'L0') {
                return [ 'Spine' ]
            }
            if ([ 'L1' ].includes(closureType)) {
                return [ 'Spine', 'Distribution' ]
            }
            if ([ 'L2' ].includes(closureType)) {
                return [ 'Distribution', 'Access' ]
            }
            if ([ 'L3' ].includes(closureType)) {
                return [ 'Access', 'Feed' ]
            }
        }

    } catch (e) {
        console.error(e);

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ principal.email, 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Error tracing closure ${l0ClosureId}`,
            body: `${e.message}`,
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );
    }
}


