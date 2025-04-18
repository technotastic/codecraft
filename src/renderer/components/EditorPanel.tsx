// src/renderer/components/EditorPanel.tsx
import React, { useState, useEffect } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme

const EditorPanel: React.FC = () => {
  const { theme } = useTheme(); // Get the current theme
  const [code, setCode] = useState<string>(
    // Default content
    '// Welcome to CodeCraft IDE!\n' +
    '// Use the dropdown in the sidebar to change themes.\n' +
    'function hello() {\n' +
    '\tconsole.log("Hello from Monaco Editor!");\n' +
    '}'
  );

  // Map our theme names to Monaco theme names
  // Note: Monaco doesn't have a built-in Win95 theme. We'll need to define one later.
  // For now, 'win95-placeholder' will map to 'vs' (light).
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'; // 'vs' is the default light

  // Options for the Monaco Editor instance
  const editorOptions = {
    selectOnLineNumbers: true,
    automaticLayout: true, // Recommended for flexible layouts
    fontSize: 13, // Example: Set a base font size for the editor
    fontFamily: 'var(--font-family-mono)', // Use CSS variable for consistency
    // Add other Monaco options here if needed
    // minimap: { enabled: false },
    // wordWrap: 'on',
  };

  const handleEditorChange = (newValue: string) => {
    setCode(newValue);
    // Placeholder for future file saving logic & dirty state indication
  };

  // The MonacoEditor component should fill the container div.
  // The container div (.editor-panel) is styled via App.css to be flexible.
  return (
    <div className="editor-panel">
      <MonacoEditor
        width="100%" // Explicitly set width/height to fill container
        height="100%"
        language="javascript" // Default language (will be dynamic later)
        theme={monacoTheme} // Apply the theme dynamically
        value={code} // Controlled component: value displayed is from state
        options={editorOptions} // Pass editor configuration options
        onChange={handleEditorChange} // Function called when content changes
        // Optional: Callback when editor is mounted for direct API access
        // editorDidMount={(editor, monaco) => {
        //   console.log('Editor mounted!', editor, monaco);
        //   // Example: Use the monaco instance to define custom themes later
        //   // if (theme === 'win95-placeholder') {
        //   //    monaco.editor.defineTheme('win95-theme', { base: 'vs', inherit: true, rules: [], colors: {} });
        //   //    monaco.editor.setTheme('win95-theme');
        //   // }
        //   editor.focus();
        // }}
      />
    </div>
  );
};

export default EditorPanel;