import React, { FunctionComponent, useState } from 'react';
import { mapLayersLegend } from '../mapLayersLegend'
import { Col, Input, Row } from "antd";
import '../styles.scss'
import { SearchOutlined } from "@ant-design/icons";

interface OwnProps {
  visibleLayers: Array<string>
}

type Props = OwnProps;

const DynamicMapLegend: FunctionComponent<Props> = (props) => {

  const { visibleLayers } = props
  let allVisibleLayers:Array<any> = []
  const [query, setQuery] = useState<string>('');


  const fetchVisibleLayers = () => {

    if (visibleLayers.length) {

      visibleLayers.forEach((visibleLayer: any) => {

        const filteredLayerCollection = mapLayersLegend.find((layer: any) => layer.layerName === visibleLayer)

        if (filteredLayerCollection && filteredLayerCollection?.layerItems.length)
          filteredLayerCollection.layerItems.forEach((layer: any) => {
            allVisibleLayers.push(layer)
          })

      })

    }

    return allVisibleLayers

  }




  const renderVisibleLayers = () => {

    const layerItems = fetchVisibleLayers()

    if(layerItems.length)
      return layerItems.map((layer:any) => {
        if(!query.length || (query.length && layer.name.toLowerCase().indexOf(query.toLowerCase()) > -1))
          return  <Col span={24} style={{padding:0}} key={`col-${layer.name}`}>
            <img src={`/qgis-symbols/${layer.file}.png`} alt={layer.name} style={{marginRight:8}}/>{layer.name}
          </Col>
      })

  }

  return <>
    <Row className="layerList">{renderVisibleLayers()}</Row>
    <Row className="layerSearch">
      <Col span={24}>
        <Input allowClear placeholder="Quick search..." prefix={<SearchOutlined />} onChange={(e:any) => {setQuery(e.target.value)}} style={{borderRadius:4}} />
      </Col>
    </Row>
  </>

}

export default DynamicMapLegend