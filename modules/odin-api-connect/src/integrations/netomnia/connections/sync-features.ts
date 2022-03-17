import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { updateCreateFeaturesInOdin } from './importers/update-create-features-in-odin';

dotenv.config({ path: '../../../../.env' });

export async function syncFeatures(
    principal: OrganizationUserEntity,
    l1PolygonIds: string,
    options: {
        startDate?: string,
        endDate?: string,
        interval?: string,
    },
    { odinDb, cosmosDb },
) {

    const { startDate, endDate, interval } = options;


    try {

        const polygonIds = l1PolygonIds.split(',')
        console.log('l1PolygonIds', l1PolygonIds.length)

        if (l1PolygonIds && l1PolygonIds.length > 0) {

            for(const polyId of polygonIds) {
                for(const featureType of [ 'CLOSURE' ]) {
                    await updateCreateFeaturesInOdin(
                        principal,
                        polyId,
                        featureType,
                        { odinDb, cosmosDb },
                        startDate,
                        endDate,
                        interval,
                    )
                }
            }
        }

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}

