// src/renderer/components/EditorPanel.tsx
import React, { useState } from 'react';
import MonacoEditor from 'react-monaco-editor';

const EditorPanel: React.FC = () => {
  const [code, setCode] = useState<string>(
    // Default content
    '// Welcome to CodeCraft IDE!\n' +
    'function hello() {\n' +
    '\tconsole.log("Hello from Monaco Editor!");\n' +
    '}'
  );

  // Options for the Monaco Editor instance
  const editorOptions = {
    selectOnLineNumbers: true,
    // Add other Monaco options here if needed
    // Example:
    // automaticLayout: true, // Useful if editor size changes, but can have performance impact
    // minimap: { enabled: false }, // Example: disable minimap
  };

  const handleEditorChange = (newValue: string) => {
    setCode(newValue);
    // Placeholder for future file saving logic
  };

  // The MonacoEditor component should fill the container div.
  // The container div (.editor-panel) is styled via App.css to be flexible.
  return (
    <div className="editor-panel">
      <MonacoEditor
        // Relying on the CSS container for sizing (width/height 100% effectively)
        language="javascript" // Default language
        theme="vs-dark" // Default theme (can be changed, e.g., 'vs' for light)
        value={code} // Controlled component: value displayed is from state
        options={editorOptions} // Pass editor configuration options
        onChange={handleEditorChange} // Function called when content changes
        // Optional: Callback when editor is mounted for direct API access
        // editorDidMount={(editor, monaco) => {
        //   console.log('Editor mounted!', editor, monaco);
        //   editor.focus(); // Example: focus the editor on mount
        // }}
      />
    </div>
  );
};

export default EditorPanel;