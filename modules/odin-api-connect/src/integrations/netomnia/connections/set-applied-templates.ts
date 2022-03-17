import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { listBucketObjects, putObjectToS3 } from '../../../common/awsS3/buckets/buckets.service';

dotenv.config({ path: '../../../../.env' });

export async function setAppliedTemplates({ cosmosDb }) {
    try {

        // get all L2 polygons inside EX polygon

        const l2PolygonIds = await cosmosDb.query(`
            SELECT
                DISTINCT(a.id)
            FROM ftth.polygon as a, ftth.polygon as b
            WHERE ST_Intersects(a.geometry, b.geometry)
            AND a.name = 'L2'
            AND b.id IN (41850)
            `);

        console.log('l2PolygonIds', l2PolygonIds)

        for(const { id } of l2PolygonIds) {

            const bucketObjects = await listBucketObjects(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${id}`,
            )
            const contents = bucketObjects['Contents'];

            for(const item of contents) {
                if((item['Key'].indexOf('fiber-mappings') > -1 || item['Key'].indexOf('connections-template') > -1) && item['Key'].indexOf(
                    'applied') === -1) {
                    console.log('create applied', item['Key'])

                    // save that the template was applied
                    await putObjectToS3(
                        `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                        `${item['Key']}-applied`,
                        Buffer.from(JSON.stringify({
                            action: 'applied',
                            date: dayjs().format(),
                            user: null,
                            totalConnections: 0,
                        })),
                    )
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
