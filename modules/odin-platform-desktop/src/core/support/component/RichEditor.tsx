import React from 'react'
import { Editor, EditorState, ContentState,   } from "react-draft-wysiwyg";
import { convertToHTML } from "draft-convert";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

interface Props {
  className: string;
  onChange: any;
}
function RichEditor(props: Props) {
  const [editorState, setEditorState] = React.useState<EditorState>();
  const { className, onChange } = props
  const onEditorStateChange = (state: any) => {
    setEditorState(state);
    if (editorState?.getCurrentContent()) {
      onChange(convertToHTML(editorState?.getCurrentContent()))
    }
  }
  return (
    <div>
      <Editor
        toolbarClassName="editor-toolbar"
        wrapperClassName={`editor-wrapper ${className}`}
        editorClassName="editor-body"
        editorState={editorState}
        onEditorStateChange={onEditorStateChange}
        editorRef={(ref: any) => {
          if (ref) ref.focus();
        }}
      />
    </div>
  )
}

export default RichEditor
