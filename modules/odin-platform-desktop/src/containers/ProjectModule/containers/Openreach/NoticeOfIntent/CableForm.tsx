import { Button, Form, Input } from 'antd';
import React, { useState } from 'react';

interface Props {
  isLoading: boolean
  onSubmit: (polyId: number) => void
}

function CableForm({ isLoading, onSubmit }: Props) {
  const [ cableId, setPolyId ] = useState<number>(0)

  const onInputChange = (cableId: number) => {
    setPolyId(cableId)
  }

  const handleFormSubmit = () => {
    if (cableId) {
      onSubmit(cableId);
    }
  }

  return (
    <>
      <div style={{ display: 'flex' }}>
        <Form.Item
          className="form-item"
          name="cableId"
          label="Cable ID" key={1}
          rules={[
            {
              required: true,
              message: 'Please input value',
            },
          ]}
        >
          <Input
            placeholder="Cable ID"
            type="number"
            onChange={(e: any) => onInputChange(e.target.value)}
            style={{ width: 300 }}
          />
        </Form.Item>

        <Button
          key="3"
          type="primary"
          onClick={handleFormSubmit}
          loading={isLoading}
          disabled={!cableId}
          style={{ marginLeft: '12px' }}>Find</Button>
      </div>
    </>
  )
}

export default CableForm;
