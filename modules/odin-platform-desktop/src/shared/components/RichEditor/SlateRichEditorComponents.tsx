import React, { Ref, PropsWithChildren } from 'react'
import ReactDOM from 'react-dom'

interface BaseProps {
  className: string
  [key: string]: unknown
}
type OrNull<T> = T | null

export const Button = React.forwardRef(
  (
    {
      className,
      active,
      reversed,
      ...props
    }: PropsWithChildren<
      {
        active: boolean
        reversed: boolean
      } & BaseProps
    >,
    ref: Ref<HTMLSpanElement> | undefined
  ) => (
    <span
      {...props}
      ref={ref}
      className={className}
      style={{
        cursor: 'pointer',
        color: reversed
          ? active
            ? 'white'
            : '#aaa'
          : active
            ? 'black'
            : '#ccc'
      }}
    />
  )
)

export const EditorValue = React.forwardRef(
  (
    {
      className,
      value,
      ...props
    }: PropsWithChildren<
      {
        value: any
      } & BaseProps
    >,
    ref: Ref<HTMLDivElement> | undefined
  ) => {
    const textLines = value.document.nodes
      .map((node: any) => node.text)
      .toArray()
      .join('\n')
    return (
      <div
        ref={ref}
        {...props}
        className={className}
        style={{ margin: '30px -20px 0' }}
      >
        <div
          style={{
            fontSize: `14px`,
            padding: `5px 20px`,
            color: `#404040`,
            borderTop: `2px solid #eeeeee`,
            background: `#f8f8f8`,
          }}
        >
          Slate's value as text
        </div>
        <div
          style={{
            color: '#404040',
            font: '12px monospace',
            whiteSpace: 'pre-wrap',
            padding: '10px 20px'
          }}
        >
          {textLines}
        </div>
      </div>
    )
  }
)

export const Icon = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<HTMLSpanElement> | undefined
  ) => (
    <span
      {...props}
      ref={ref}
      className={`material-icons ${className}`}
      style={{
        fontSize: '18px',
        verticalAlign: 'text-bottom',
        marginLeft: '15px'
      }}
    />
  )
)

export const Instruction = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<HTMLDivElement> | undefined
  ) => (
    <div
      {...props}
      ref={ref}
      style={{
        whiteSpace: `pre-wrap`,
        margin: `0 -10px 10px`,
        padding: `10px 20px`,
        fontSize: `14px`,
        background: `#f8f8e8`
      }}
      className={className}
    />
  )
)

export const Menu = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<HTMLDivElement> | undefined
  ) => (
    <div
      {...props}
      ref={ref}
      className={className}
    />
  )
)

export const Portal = ({ children }: any) => {
  return typeof document === 'object'
    ? ReactDOM.createPortal(children, document.body)
    : null
}

export const Toolbar = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<HTMLDivElement> | undefined
  ) => (
    <Menu
      {...props}
      ref={ref}
      style={{
        position: 'relative',
        padding: '1px 18px 17px',
        margin: '0 -10px',
        borderBottom: '2px solid #eee',
        marginBottom: '20px'
      }}
      className={className}
    />
  )
)