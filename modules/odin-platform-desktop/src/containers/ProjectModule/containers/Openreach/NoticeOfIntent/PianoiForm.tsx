import { Button, Form, Input } from 'antd';
import React, { useState } from 'react';

interface Props {
  isLoading: boolean
  onSubmit: (noiRef: string) => void
}

function PianoiForm({ isLoading, onSubmit }: Props) {
  const [ noiRef, setNoiRef ] = useState<string>('')

  const onChangeNoiRef = (noiRef: string) => {
    setNoiRef(noiRef)
  }

  const handleFormSubmit = () => {
    if(noiRef) {
      onSubmit(noiRef);
    }
  }

  return (
    <>
      <div style={{ display: 'flex' }}>
        <Form.Item
          className="form-item"
          name="noiRef"
          label="PIANOI" key={1}
          rules={[
            {
              required: true,
              message: 'Please input value',
            },
          ]}
        >
          <Input
            placeholder="PIANOI"
            onChange={(e: any) => onChangeNoiRef(e.target.value)}
            style={{ width: 300 }}
          />
        </Form.Item>

        <Button
          key="3"
          type="primary"
          onClick={handleFormSubmit}
          loading={isLoading}
          disabled={!noiRef}
          style={{ marginLeft: '12px' }}>Find</Button>
      </div>
    </>
  )
}

export default PianoiForm;
