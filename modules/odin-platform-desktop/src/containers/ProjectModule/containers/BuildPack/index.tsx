import React, { FunctionComponent, useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from "react-router-dom";
import { httpGet } from "../../../../shared/http/requests";
import L1BuildPackSpliceless from "./L1BuildPackSpliceless";
import L2BuildPackSplicing from "./L2BuildPackSplicing";
import { Button, Card, Layout, Result } from "antd";
import L2BuildPackSpliceless from "./L2BuildPackSpliceless";

type PathParams = {
  url: string,
  recordId: string
}

type Props = RouteComponentProps<PathParams> & {
  match: any,
  history:any,
  withSplicing: boolean
}

const BuildPack: FunctionComponent<Props> = (props: Props) => {

  const [ polygonType, setPolygonType ] = useState<null | 'L1' | 'L2'>(null)

  const getPolygonInfo = async (polygonId: any) =>
    await httpGet(`ProjectModule/v1.0/ftth/polygon/${polygonId}`).then(res => setPolygonType(res.data.data[0].type))

  useEffect(() => {
    const { match } = props
    if (match.params.polygonId) {
      getPolygonInfo(match.params.polygonId)
    }
  }, [])

  const routeBuildPack = () => {

    const { withSplicing, history } = props
    const { Content } = Layout

    if (polygonType) {

      if (polygonType === 'L1' && !withSplicing)
        return <L1BuildPackSpliceless/>

      else if (polygonType === 'L2' && !withSplicing)
        return <L2BuildPackSpliceless/>

      else if (polygonType === 'L2' && withSplicing)
        return <L2BuildPackSplicing/>

      else {
        return (
          <Layout>
            <Content>
              <Card title="Build Pack" style={{margin:20, height:'88vh'}}>
              <Result
                status="error"
                title="Error"
                subTitle={
                  <div style={{marginTop:20}}>
                    <p style={{fontSize:'1.2em'}}>
                      {`${polygonType} Build Pack ${withSplicing ? 'with Splicing information' : 'without Splicing information'}`}
                      <br/>
                      is not supported at the moment.
                    </p>
                  </div>
                }
                extra={
                  <Button
                    type="primary"
                    key="console"
                    style={{marginTop:20}}
                    onClick={() => {
                      history.goBack()
                    }}
                  >
                    Go Back
                  </Button>
                }
              />
              </Card>
            </Content>
          </Layout>
        )
      }
    }

  }

  return (
    <>
      {routeBuildPack()}
    </>
  )
};

export default withRouter(BuildPack)