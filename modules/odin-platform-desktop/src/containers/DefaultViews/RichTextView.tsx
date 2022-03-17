import React, { Component } from 'react';
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertToRaw, convertFromRaw } from 'draft-js';

interface Props {
  json: any;
  html: any;
}

interface State {
  contentState: any;
  editorState: any;
}
class RichTextView extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const contentState = convertFromRaw(props.json);
    const editorState = EditorState.createWithContent(contentState);
    this.state = {
      contentState,
      editorState
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.json !== this.props.json) {
      const contentState = convertFromRaw(this.props.json);
      const editorState = EditorState.createWithContent(contentState);
      this.setState({editorState})
    }
  }

  componentWillUnmount() {

  }

  render() {
    const { contentState, editorState } = this.state;
    return (
      <div>
        <Editor
          editorState={editorState}
          readOnly
          toolbarHidden
          toolbarClassName="editor-toolbar"
          wrapperClassName={`editor-wrapper`}
          editorClassName="editor-body"
        />
      </div>
    );
  }
}


export default RichTextView;