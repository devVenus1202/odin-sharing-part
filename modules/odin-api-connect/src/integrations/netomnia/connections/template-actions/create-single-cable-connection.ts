import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getFirstRelation, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { setImmediatePromise, sleep } from '../../../../helpers/utilities';
import {
    createAssociation,
    createRecord,
    createRecordNoQueue,
    getAllRecordsByEntity,
    getManyRecordsDetail,
    getOdinRecordByExternalRef,
    getRecordDetail,
    getRelatedRecords,
} from '../data/http';
import { constructClosurePorts } from '../featurecomponents/constructors/features.component.closure.ports';
import { constructPortSeals } from '../featurecomponents/constructors/features.component.port.seals';

dotenv.config({ path: '../../../../.env' });

export async function createSingleCableConnection(connection: any, { odinDb }) {

    const errors = [];
    const modified = [];

    try {

        const sealModels = await getAllRecordsByEntity('ProjectModule', 'FeatureModel', 'SEAL', { odinDb });

        // get the in closure
        const outClosure = await getOdinRecordByExternalRef(
            connection.outClosure,
            'CLOSURE',
            { odinDb },
        )

        if (outClosure) {

            // get the in closure ports
            const outClosurePortsLinks = outClosure.links.filter(elem => elem.type === 'CLOSURE_PORT');
            const outClosurePorts = await getManyRecordsDetail(outClosurePortsLinks.map(elem => elem.id));

            // get the in closure existing connections
            const inClosureConnectionsLinks = outClosure.links.filter(elem => elem.type === 'CABLE_CONNECTION');
            const inClosureCableConnections = await getManyRecordsDetail(inClosureConnectionsLinks.map(elem => elem.id).join());


            // get next available out port
            const nextAvailableOutPort = await getNextAvailablePort(
                outClosure,
                outClosurePorts,
                inClosureCableConnections,
                'OUT',
            );

            console.log('nextAvailableOutPort', nextAvailableOutPort)

            // add seal model to out port
            const sealModelForOutPort = await addSealModelToPort(
                sealModels,
                nextAvailableOutPort,
                'mech_4_SST',
            );

            // get the In cable by external reference id
            const outCable = await getOdinRecordByExternalRef(
                connection.outCable,
                'CABLE',
                { odinDb },
            )

            console.log('outCable', outCable)

            if (nextAvailableOutPort && outCable) {

                const nextAvailableSeal = await getNextAvailableSealInterface(
                    nextAvailableOutPort,
                    inClosureCableConnections,
                    'mech_4_SST',
                );
                // console.log('nextAvailableSeal', nextAvailableSeal);

                if (nextAvailableSeal) {
                    // Create IN cable Connection and Loop: false
                    const sourceCableConnection = await createCableConnection(
                        outClosure,
                        nextAvailableOutPort,
                        sealModelForOutPort,
                        nextAvailableSeal,
                        outCable,
                        'OUT',
                        connection,
                    );
                }

                //
                // Add the OUT connection for the cable
                //
                const inClosure = await getOdinRecordByExternalRef(
                    connection.inClosure,
                    'CLOSURE',
                    { odinDb },
                )

                if (inClosure) {

                    const inClosurePortsLinks = inClosure.links.filter(elem => elem.type === 'CLOSURE_PORT');
                    const inClosurePorts = await getManyRecordsDetail(inClosurePortsLinks.map(elem => elem.id).join());

                    const inClosureConnectionsLinks = inClosure.links.filter(elem => elem.type === 'CABLE_CONNECTION');
                    const inClosureCableConnections = await getManyRecordsDetail(inClosureConnectionsLinks.map(
                        elem => elem.id));

                    // console.log('ports', ports);
                    // console.log('cableConnections', cableConnections);

                    const nextAvailableInPort = await getNextAvailablePort(
                        inClosure,
                        inClosurePorts,
                        inClosureCableConnections,
                        'IN',
                    );
                    // console.log('nextAvailableInPort', nextAvailableInPort);

                    if (nextAvailableInPort) {

                        const targetSealModel = await addSealModelToPort(
                            sealModels,
                            nextAvailableInPort,
                            'mech_4_SST',
                        );

                        const nextAvailableSealTarget = await getNextAvailableSealInterface(
                            nextAvailableInPort,
                            inClosureCableConnections,
                            'mech_4_SST',
                        );


                        if (nextAvailableSealTarget) {
                            const targetCableConnection = await createCableConnection(
                                inClosure,
                                nextAvailableInPort,
                                targetSealModel,
                                nextAvailableSealTarget,
                                outCable,
                                'IN',
                                connection,
                            );
                        }
                    }
                }
            }

        } else {
            console.log('NO_OUT_CLOSURE')
        }


        // When you are creating a cable connection and need to get then next port and seal to use
        async function getNextAvailablePort(
            closure: DbRecordEntityTransform,
            closurePorts: DbRecordEntityTransform[],
            connections: DbRecordEntityTransform[],
            direction,
        ) {

            let ports = closurePorts;

            if (ports) {
                const portNum = direction === 'OUT' ? '2' : '1';
                let port = ports.find(elem => getProperty(elem, 'PortNumber') === portNum);

                if (!port) {
                    const closureDetail = await getRecordDetail(closure.id, 'Feature', [ '\"FeatureModel\"' ])

                    const closureModel = getFirstRelation(closureDetail, 'FeatureModel')
                    const expectedPorts = createMissingPorts(closureDetail.id, closureModel)
                    // create missing closure ports
                    if (ports && ports.length > 0) {

                        const existingSlotNumbers = ports.map(elem => Number(elem['PortNumber']))
                        // filter out already created ports
                        const portsToCreate = expectedPorts.filter(elem => !existingSlotNumbers.includes(elem.properties['SlotNumber']))
                        console.log('portsToCreate', portsToCreate)
                        // create missing slots
                        await createRecordNoQueue(portsToCreate, 'FeatureComponent', 'skipRelate=true')
                    } else {
                        console.log('expectedPorts', expectedPorts)
                        // create all the missing slots
                        await createRecordNoQueue(expectedPorts, 'FeatureComponent', 'skipRelate=true')
                    }


                    while (!ports) {

                        await sleep(200)
                        const closureDetail = await getRecordDetail(closure.id, 'Feature', [])

                        const closurePortLinks = closureDetail.links.filter(elem => elem.type === 'CLOSURE_PORT');
                        ports = await getManyRecordsDetail(closurePortLinks.map(elem => elem.id).join());

                        console.log('ports after create---', ports)

                        port = ports.find(elem => getProperty(elem, 'PortNumber') === portNum);

                        if (port) {
                            break;
                        }

                    }

                    return port;
                } else {
                    return port
                }
            }

        }


        // When you are creating a cable connection and need to get then next port and seal to use
        async function getNextAvailableSealInterface(
            port: DbRecordEntityTransform,
            connections: DbRecordEntityTransform[],
            modelName: string,
        ): Promise<DbRecordEntityTransform> {

            // get the port seals
            const portSealsRes = await getRelatedRecords(
                port.id,
                'FeatureComponent',
                [ '\"FeatureComponent\"' ],
                [ '\"SchemaType:PORT_SEAL\"' ],
            )

            let portSeals = portSealsRes['FeatureComponent'].dbRecords

            let count = 0;

            while (!portSeals) {

                await sleep(1000)

                console.log('WAITING FOR PORT SEALS', count, port.id)
                // get the port seals
                const portSealsRes = await getRelatedRecords(
                    port.id,
                    'FeatureComponent',
                    [ '\"FeatureComponent\"' ],
                    [ '\"SchemaType:PORT_SEAL\"' ],
                )

                portSeals = portSealsRes['FeatureComponent'].dbRecords

                if (portSeals) {
                    break;
                }

                // unblock the event loop
                await setImmediatePromise()

                count++

                // if more than 15 seconds create missing seals
                if (count > 15) {
                    const sealModel = sealModels.find(elem => elem.title === modelName);
                    const sealsToCreate = await createMissingSeals(port, sealModel)
                    console.log('sealsToCreate', sealsToCreate)
                    // create missing slots
                    await createRecordNoQueue(sealsToCreate, 'FeatureComponent', 'skipRelate=true')
                }

            }

            if (portSeals) {
                return portSeals.find(elem => getProperty(elem, 'InterfaceNumber') === '1');
            }

        }

        /**
         * In some cases port seals might not be created when the model is added to the closure port
         * this is the fall back to add any missing seals
         * @param port
         * @param modelName
         */
        function createMissingPorts(port: any, sealModel: any) {

            let creates = []

            const components = constructClosurePorts(port.id, sealModel)
            creates.push(...components);

            return creates
        }


        /**
         * In some cases port seals might not be created when the model is added to the closure port
         * this is the fall back to add any missing seals
         * @param port
         * @param sealModel
         */
        function createMissingSeals(port: any, sealModel: any) {

            let creates = []

            const components = constructPortSeals(port.id, sealModel)
            creates.push(...components);

            return creates
        }

        /**
         * Adds a seal model to a port in the closure
         * which will create seal interfaces for the port
         *
         * @param sealModels
         * @param nextAvailablePortOnTarget
         */
        async function addSealModelToPort(
            sealModels: DbRecordEntityTransform[],
            nextAvailablePortOnTarget: DbRecordEntityTransform,
            name: string,
        ) {
            const targetSealModel = sealModels.find(elem => elem.title === name);

            const createRel = new DbRecordAssociationCreateUpdateDto()
            createRel.recordId = targetSealModel.id;

            const newAssociation = await createAssociation(
                nextAvailablePortOnTarget.id,
                'FeatureComponent',
                [ createRel ],
            );
            console.log('newAssociation', newAssociation)
            return targetSealModel;
        }


        /**
         * Creates a cable connection to a closure
         *
         * @param closure
         * @param port
         * @param sealModel
         * @param sealInterface
         * @param cable
         * @param direction
         * @param connection
         */
        async function createCableConnection(
            closure: DbRecordEntityTransform,
            port: DbRecordEntityTransform,
            sealModel: DbRecordEntityTransform,
            sealInterface: DbRecordEntityTransform,
            cable: DbRecordEntityTransform,
            direction: 'IN' | 'OUT',
            connection: any,
        ) {
            const newRecord = new DbRecordCreateUpdateDto()
            newRecord.entity = 'ProjectModule:CableConnection'
            newRecord.properties = {
                ClosureId: closure.id,
                OutClosureExternalRef: connection.outClosure,
                InClosureExternalRef: connection.inClosure,
                PortId: port.id,
                SealModelId: sealModel.id,
                SealId: sealInterface.id,
                CableId: cable.id,
                CableExternalRef: getProperty(cable, 'ExternalRef'),
                CableType: getProperty(cable, 'CableType'),
                Direction: direction,
                IsLoop: connection.isLoopCable,
                L4ClosureCount: connection.l4ClosureCount,
            }
            newRecord.associations = [
                {
                    recordId: port.id,
                },
                {
                    recordId: sealInterface.id,
                },
                {
                    recordId: sealInterface.id,
                },
                {
                    recordId: cable.id,
                },
                {
                    recordId: closure.id,
                },
            ]

            console.log('newRecord', newRecord)

            const sourceCableConnection = await createRecord(
                'FeatureConnection',
                [ newRecord ],
            )
            return sourceCableConnection;
        }

        return { modified, errors };

    } catch (e) {
        console.error(e);
    }
}

