import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { removeModelsFromFeatures } from '../cosmos/remove-models-from-features';
import { replaceFeatureModels } from '../cosmos/replace-feature-models';
import { addModelsToFeatures } from './template-actions/add-models-to-features';

dotenv.config({ path: '../../../../.env' });


export async function syncFeatureModels({ odinDb }) {

    try {

        const principal = new OrganizationUserEntity()
        principal.firstname = 'frank';
        principal.email = 'frank@d19n.io';

        for(const featureType of [ 'CLOSURE', 'CABLE' ]) {
            await replaceFeatureModels(principal, featureType, { odinDb })
            await removeModelsFromFeatures(principal, featureType, { odinDb })
        }

        // for(const { value } of filteredIds) {
        for(const featureType of [ 'CLOSURE', 'CABLE' ]) {
            await addModelsToFeatures(
                principal,
                undefined,
                undefined,
                undefined,
                featureType,
                { odinDb },
            )
        }
        // }

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}

