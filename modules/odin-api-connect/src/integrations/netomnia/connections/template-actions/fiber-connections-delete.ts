import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { deleteRecord, getFromS3 } from '../data/http';
import { getFiberConnectionsByFibreId } from '../data/sql';

dotenv.config({ path: '../../../../../.env' });

export async function deleteFiberConnections(polygonId: string, closureId: string, closureType: string, { odinDb }) {

    try {

        let originalState;
        try {

            const templateUrl = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}`,
            )
            const response = await axios.get(templateUrl)
            originalState = response['data']

        } catch (e) {
            console.log('no state')
        }


        let connections = []
        let deletes = []
        if (originalState) {

            // We want to delete the fibre connections created
            if (originalState['connections'].length > 0) {

                for(const connection of originalState['connections']) {

                    connections.push(connection)
                    console.log('DELETE_CONNECTION', connection)

                    // get the closure fibre connections using the upstream connection outFibre
                    const fiberConnections = await getFiberConnectionsByFibreId(
                        connection['fiberInId'],
                        { odinDb },
                        true,
                    )

                    console.log('FIBER_CONNECTIONS', fiberConnections)
                    // we only want to delete the upstream closure
                    const connectionToDelete = fiberConnections.find(elem => elem['closure_from_ext_ref'] === connection['inClosureExt'])
                    if (connectionToDelete) {
                        deletes.push(connectionToDelete)
                        // delete the created fibreConnection
                        // console.log('DELETE', fibreConnection['connection_id'])
                        console.log(' connectionToDelete', connectionToDelete)
                        await deleteRecord('FeatureConnection', connectionToDelete['connection_id'])
                    }
                }
            }
        }

        console.log('CONNECTIONS_LENGTH', connections.length);
        console.log('CONNECTIONS', connections);
        console.log('DELETE_LENGTH', deletes.length)
        console.log('DELETES', deletes)

    } catch (e) {
        console.error(e);
        // log all failures in S3
    }
}


