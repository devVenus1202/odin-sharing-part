import {Button, Card, Col, Form, Input, Row, Table} from 'antd';
import React, { useState } from 'react';
import Title from "antd/lib/typography/Title";

interface Props {
  data: any
}

const relatedPartyColumns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
    },
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
    },
    {
        title: 'Role',
        dataIndex: 'role',
        key: 'role',
    },
    {
        title: 'E-Mail',
        dataIndex: 'eMail',
        key: 'eMail',
    },
    {
        title: 'Telephone Number',
        dataIndex: 'telephoneNumber',
        key: 'telephoneNumber',
    },
]

const resourceRelationshipColumns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
    },
    {
        title: 'Resource Type',
        dataIndex: 'resourceType',
        key: 'resourceType',
    },
    {
        title: 'Is Resource Unsubmitted',
        dataIndex: 'isResourceUnsubmitted',
        key: 'isResourceUnsubmitted',
        render: (item: boolean) => item ? 'True' : 'False',
    },
]

const resourceCharacteristicColumns = [
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
    },
    {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
    },
]

const fields = [
    {name: 'href', title: 'Url'},
    {name: 'externalId', title: 'External Id'},
    {name: 'state', title: 'State'},
    {name: 'requestedStartDate', title: 'Requested Start Date'},
    {name: 'requestedCompletionDate', title: 'Requested Completion Date'},
    {name: 'expiryDate', title: 'Expiry Date'},
    {name: 'expiryExtensionCount', title: 'Expiry Extension Count'},
]
function NoiDetailsCard ({ data }: Props) {

    return data ? (
        <div>
            <div><span className="ant-statistic-title">ID:</span> {data.id}</div>
            {data.orderRelationship && data.orderRelationship[0] && <div>
                <span className="ant-statistic-title">
                    Order Relationship:
                </span> {data.orderRelationship[0].type} {data.orderRelationship[0].id}
            </div>}

            {fields.map((item: any, index: number) => (<div>
                <span className="ant-statistic-title">
                    {item.title}:
                </span> {data[item.name]}
            </div>)
            )}

            <Row gutter={16} style={{marginTop: 16}}>
                {data.relatedParty && <Col span={24}>
                    <Title level={4}>Related Party: {data.relatedParty.length}</Title>
                    <Card style={{marginBottom: 16}}>
                        <Table
                            size="small"
                            scroll={{ y: 200 }}
                            columns={relatedPartyColumns}
                            dataSource={data.relatedParty}
                        />
                    </Card>
                </Col>}
                {data.resourceOrderItem && <Col span={24}>
                    <Title level={4}>Resource Order Item: {data.resourceOrderItem.length}</Title>


                    {data.resourceOrderItem.map((item: any) => (
                        <Card style={{marginBottom: 12}}>
                            <div style={{marginBottom: 10}}>
                                <span className="ant-statistic-title">
                                    Resource:
                                </span> {item.resource.id} - {item.resource.type}
                            </div>
                            <Row gutter={16}>
                                {item.resource.resourceRelationship && <Col span={12}>
                                    <Title level={5}>
                                        Resource Relationship: {item.resource.resourceRelationship.length}
                                    </Title>
                                    <Table
                                        size="small"
                                        scroll={{ y: 100 }}
                                        columns={resourceRelationshipColumns}
                                        dataSource={item.resource.resourceRelationship}
                                    />
                                </Col>}
                                {item.resource.resourceCharacteristic && <Col span={12}>
                                    <Title level={5}>
                                        Resource Characteristic: {item.resource.resourceCharacteristic.length}
                                    </Title>
                                    <Table
                                        size="small"
                                        scroll={{ y: 100 }}
                                        columns={resourceCharacteristicColumns}
                                        dataSource={item.resource.resourceCharacteristic}
                                    />
                                </Col>}
                            </Row>
                        {/*"isResourceUnsubmitted": "Y"*/}
                        </Card>
                    ))}

                </Col>}
            </Row>
        </div>
    ) : null
}

export default NoiDetailsCard;
