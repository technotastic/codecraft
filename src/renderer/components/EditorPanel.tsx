// src/renderer/components/EditorPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { useTheme, ThemeName } from '../contexts/ThemeContext';

// Helper function to safely get and parse font size from CSS variable
const getEditorFontSize = (): number => {
    const fontSizeValue = getComputedStyle(document.documentElement).getPropertyValue('--font-size-editor');
    // Provide default if variable is missing or invalid
    return parseInt(fontSizeValue?.replace('px', '').trim() || '13', 10);
};


const EditorPanel: React.FC = () => {
    const { theme } = useTheme();
    const [code, setCode] = useState<string>(
        '// Welcome to CodeCraft IDE!\n' +
        '// Use the dropdown in the sidebar to change themes.\n' +
        'function hello() {\n' +
        '\tconsole.log("Hello from Monaco Editor!");\n' +
        '}'
    );
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);

    const getMonacoThemeName = (currentTheme: ThemeName): string => {
        switch (currentTheme) {
            case 'light': return 'vs';
            case 'dark': return 'vs-dark';
            case 'win95': return 'win95-monaco-theme';
            case 'pipboy': return 'pipboy-monaco-theme';
            case 'mirc': return 'mirc-monaco-theme';
            default: return 'vs-dark';
        }
    };

    // --- Corrected initial font size retrieval ---
    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        selectOnLineNumbers: true,
        automaticLayout: true,
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(), // Use helper function
    };

    const handleEditorChange = (newValue: string) => {
        setCode(newValue);
    };

    const editorDidMount = (
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // --- Define Custom Monaco Themes ---
        const defineTheme = (name: string, base: 'vs' | 'vs-dark', colors: monaco.editor.IStandaloneThemeData['colors']) => {
            monacoInstance.editor.defineTheme(name, { base, inherit: true, rules: [], colors });
        }

        // Pipboy
        defineTheme('pipboy-monaco-theme', 'vs-dark', {
            'editor.background': getComputedStyle(document.documentElement).getPropertyValue('--pipboy-bg')?.trim() || '#0a1a0f',
            'editor.foreground': getComputedStyle(document.documentElement).getPropertyValue('--pipboy-green')?.trim() || '#15ff60',
            'editorCursor.foreground': getComputedStyle(document.documentElement).getPropertyValue('--pipboy-green')?.trim() || '#15ff60',
            'editorLineNumber.foreground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-tertiary')?.trim() || '#6c6c6c',
            'editor.selectionBackground': getComputedStyle(document.documentElement).getPropertyValue('--pipboy-green-dark')?.trim() || '#10b445',
            'editorWidget.background': getComputedStyle(document.documentElement).getPropertyValue('--pipboy-bg-lighter')?.trim() || '#102a18',
            'editorWidget.border': getComputedStyle(document.documentElement).getPropertyValue('--pipboy-green-dark')?.trim() || '#10b445',
        });
        // Win95
        defineTheme('win95-monaco-theme', 'vs', {
            'editor.background': getComputedStyle(document.documentElement).getPropertyValue('--color-bg-editor')?.trim() || '#ffffff',
            'editor.foreground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary')?.trim() || '#000000',
            'editorCursor.foreground': '#000000',
            'editorLineNumber.foreground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-tertiary')?.trim() || '#808080',
            'editor.selectionBackground': getComputedStyle(document.documentElement).getPropertyValue('--color-bg-selected')?.trim() || '#000080',
            'editor.selectionForeground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-inverse')?.trim() || '#ffffff',
        });
        // mIRC
        defineTheme('mirc-monaco-theme', 'vs', {
            'editor.background': getComputedStyle(document.documentElement).getPropertyValue('--color-bg-editor')?.trim() || '#ffffff',
            'editor.foreground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary')?.trim() || '#000000',
            'editorCursor.foreground': '#000000',
            'editorLineNumber.foreground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-tertiary')?.trim() || '#808080',
            'editor.selectionBackground': getComputedStyle(document.documentElement).getPropertyValue('--color-bg-selected')?.trim() || '#000080',
            'editor.selectionForeground': getComputedStyle(document.documentElement).getPropertyValue('--color-text-inverse')?.trim() || '#ffffff',
        });

        // Apply the initial theme after defining custom ones
        const initialThemeName = getMonacoThemeName(theme);
        monacoInstance.editor.setTheme(initialThemeName);
        console.log("Initial Monaco theme set to:", initialThemeName);

        // Apply initial font size (already set in options, but good to ensure consistency)
        // --- Corrected font size retrieval ---
        editor.updateOptions({
            fontSize: getEditorFontSize(), // Use helper function
        });

        editor.focus();
    };

    // Effect to update theme and font size when context changes
    useEffect(() => {
        if (editorRef.current && monacoRef.current) {
            const editor = editorRef.current;
            const monacoInstance = monacoRef.current;

            // Update theme
            const newThemeName = getMonacoThemeName(theme);
            monacoInstance.editor.setTheme(newThemeName);
            console.log("Monaco theme updated to:", newThemeName);

            // Update font size
            // --- Corrected font size retrieval ---
            const newFontSize = getEditorFontSize(); // Use helper function
            editor.updateOptions({ fontSize: newFontSize });
            console.log("Monaco font size updated to:", newFontSize);
        }
    }, [theme]);


    return (
        <div className="editor-panel">
            <MonacoEditor
                width="100%"
                height="100%"
                language="javascript"
                // theme prop removed - rely on setTheme
                value={code}
                options={editorOptions}
                onChange={handleEditorChange}
                editorDidMount={editorDidMount}
            />
        </div>
    );
};

export default EditorPanel;