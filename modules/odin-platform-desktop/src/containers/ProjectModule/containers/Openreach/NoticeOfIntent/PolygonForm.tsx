import { Button, Form, Input } from 'antd';
import React, { useState } from 'react';

interface Props {
  isLoading: boolean
  onSubmit: (polyId: number) => void
}

function PolygonForm({ isLoading, onSubmit }: Props) {
  const [ polyId, setPolyId ] = useState<number>(0)

  const onChangePolygonId = (polyId: number) => {
    setPolyId(polyId)
  }

  const handleFormSubmit = () => {
    if(polyId) {
      onSubmit(polyId);
    }
  }

  return (
    <>
      <div style={{ display: 'flex' }}>
        <Form.Item
          className="form-item"
          name="polyId"
          label="Polygon ID" key={1}
          rules={[
            {
              required: true,
              message: 'Please input value',
            },
          ]}
        >
          <Input
            placeholder="Polygon ID"
            type="number"
            onChange={(e: any) => onChangePolygonId(e.target.value)}
            style={{ width: 300 }}
          />
        </Form.Item>

        <Button
          key="3"
          type="primary"
          onClick={handleFormSubmit}
          loading={isLoading}
          disabled={!polyId}
          style={{ marginLeft: '12px' }}>Find</Button>
      </div>
    </>
  )
}

export default PolygonForm;
