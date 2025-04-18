// --- START FILE: src/renderer/components/EditorPanel.tsx ---
import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext'; // Import useEditor hook

// Helper function to safely get and parse font size from CSS variable
const getEditorFontSize = (): number => {
    if (typeof document === 'undefined') return 13;
    const fontSizeValue = getComputedStyle(document.documentElement).getPropertyValue('--font-size-editor');
    return parseInt(fontSizeValue?.replace('px', '').trim() || '13', 10);
};

// Helper to get computed CSS variable value
const getCssVar = (varName: string, fallback: string): string => {
    if (typeof document !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim() || fallback;
    }
    return fallback;
};

// --- NEW: Language Mapping Utility ---
const getLanguageFromPath = (filePath: string | null): string => {
    if (!filePath) return 'plaintext';
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'json':
            return 'json';
        case 'css':
            return 'css';
        case 'html':
        case 'htm':
            return 'html';
        case 'md':
        case 'markdown':
            return 'markdown';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'c':
        case 'h':
            return 'c';
        case 'cpp':
        case 'hpp':
            return 'cpp';
        case 'cs':
            return 'csharp';
        case 'sh':
            return 'shell';
        case 'xml':
            return 'xml';
        case 'yaml':
        case 'yml':
            return 'yaml';
        case 'sql':
            return 'sql';
        // Add more mappings as needed
        default:
            return 'plaintext'; // Fallback
    }
};


const EditorPanel: React.FC = () => {
    const { theme } = useTheme();
    // Use EditorContext to get file info
    const { currentFilePath, currentFileContent, isLoading, error: editorError } = useEditor();
    // Local state for editor value (initially from context or default)
    const [editorValue, setEditorValue] = useState<string>(
        '// Welcome to CodeCraft IDE!\n' +
        '// Click "Open..." in the sidebar to browse files.\n' +
        '// Click a file to open it here.'
    );
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);

    const getMonacoThemeName = (currentTheme: ThemeName): string => {
        // (Keep existing theme mapping logic)
        switch (currentTheme) {
            case 'light': return 'vs';
            case 'dark': return 'vs-dark';
            case 'win95': return 'win95-monaco-theme';
            case 'pipboy': return 'pipboy-monaco-theme';
            case 'mirc': return 'mirc-monaco-theme';
            case 'qbasic': return 'qbasic-monaco-theme';
            case 'orange': return 'orange-monaco-theme';
            case 'cga': return 'cga-monaco-theme';
            case 'atari': return 'atari-monaco-theme';
            case 'snes': return 'snes-monaco-theme';
            case 'bw_tv': return 'bw-tv-monaco-theme';
            default: return 'vs-dark';
        }
    };

    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        selectOnLineNumbers: true,
        automaticLayout: true,
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(),
        minimap: { enabled: true },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: isLoading, // Make editor read-only while loading
    };

    const handleEditorChange = (newValue: string) => {
        setEditorValue(newValue); // Update local state on change
        // Later: Add logic to track unsaved changes (isDirty state)
    };

    const editorDidMount = (
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // (Keep existing theme definition logic)
        const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
           try {
                monacoInstance.editor.defineTheme(name, {
                    base: base, inherit: true, rules: [],
                    colors: {
                        'editor.background': getCssVar(`--${cssVarPrefix}-bg`, base === 'vs' ? '#ffffff' : '#1e1e1e'),
                        'editor.foreground': getCssVar(`--${cssVarPrefix}-text`, base === 'vs' ? '#000000' : '#d4d4d4'),
                        'editorCursor.foreground': getCssVar(`--${cssVarPrefix}-accent`, base === 'vs' ? '#000000' : '#aeafad'),
                        'editorLineNumber.foreground': getCssVar(`--${cssVarPrefix}-tertiary`, '#858585'),
                        'editorLineNumber.activeForeground': getCssVar(`--${cssVarPrefix}-secondary`, '#c6c6c6'),
                        'editor.selectionBackground': getCssVar(`--${cssVarPrefix}-selected-bg`, '#add6ff'),
                        'editor.selectionForeground': getCssVar(`--${cssVarPrefix}-selected-text`, '#000000'),
                        'editorWidget.background': getCssVar(`--${cssVarPrefix}-widget-bg`, base === 'vs' ? '#f3f3f3' : '#252526'),
                        'editorWidget.border': getCssVar(`--${cssVarPrefix}-border`, '#c8c8c8'),
                        'input.background': getCssVar(`--${cssVarPrefix}-input-bg`, base === 'vs' ? '#ffffff' : '#3c3c3c'),
                        'input.foreground': getCssVar(`--${cssVarPrefix}-input-text`, base === 'vs' ? '#000000' : '#d4d4d4'),
                        'input.border': getCssVar(`--${cssVarPrefix}-input-border`, '#bebebe'),
                        ...colorsOverride
                    }
                });
            } catch (error) { console.error(`Failed to define Monaco theme '${name}':`, error); }
        };
        defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy', { 'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'), 'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f'), 'editorWidget.background': getCssVar('--pipboy-bg-lighter', '#102a18'), 'editorWidget.border': getCssVar('--pipboy-green-dark', '#10b445'), });
        defineTheme('win95-monaco-theme', 'vs', 'win95', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff'), });
        defineTheme('mirc-monaco-theme', 'vs', 'mirc', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff'), });
        defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic', { 'editor.background': getCssVar('--qbasic-blue', '#0000AA'), 'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'), 'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'), 'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF'), });
        defineTheme('orange-monaco-theme', 'vs-dark', 'orange', { 'editor.background': getCssVar('--orange-dark', '#201500'), 'editor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'), 'editor.selectionForeground': getCssVar('--orange-dark', '#201500'), });
        defineTheme('cga-monaco-theme', 'vs-dark', 'cga', { 'editor.background': getCssVar('--cga-black', '#000000'), 'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'), 'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'), 'editor.selectionForeground': getCssVar('--cga-black', '#000000'), });
        defineTheme('atari-monaco-theme', 'vs-dark', 'atari', { 'editor.background': getCssVar('--atari-black', '#000000'), 'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'), 'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionForeground': getCssVar('--atari-black', '#000000'), });
        defineTheme('snes-monaco-theme', 'vs-dark', 'snes', { 'editor.background': getCssVar('--snes-bg', '#2F2F4F'), 'editor.foreground': getCssVar('--snes-text', '#E0E0FF'), 'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), 'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'), 'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F'), });
        defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv', { 'editor.background': getCssVar('--bw-black', '#000000'), 'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'), 'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'), 'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'), 'editor.selectionForeground': getCssVar('--bw-black', '#000000'), });


        // Apply the initial theme after defining custom ones
        const initialThemeName = getMonacoThemeName(theme);
        monacoInstance.editor.setTheme(initialThemeName);
        console.log("Initial Monaco theme set to:", initialThemeName);

        // Apply initial font size and scroll option
        editor.updateOptions({
             fontSize: getEditorFontSize(),
             scrollBeyondLastLine: false
         });

        // Set initial content if available from context (e.g., if loaded before mount)
        if (currentFileContent !== null) {
            editor.setValue(currentFileContent);
            const initialLanguage = getLanguageFromPath(currentFilePath);
            monacoInstance.editor.setModelLanguage(editor.getModel()!, initialLanguage);
        } else {
             editor.setValue(editorValue); // Use default placeholder
        }

        editor.focus();
    };

    // --- NEW: Effect to update editor when file content/path changes in context ---
    useEffect(() => {
        if (editorRef.current && monacoRef.current) {
            const editor = editorRef.current;
            const monaco = monacoRef.current;

            // Update editor content only if it differs from context
            // Prevents resetting editor if user typed something while loading
            if (currentFileContent !== null && editor.getValue() !== currentFileContent) {
                console.log("EditorContext changed, updating editor value and language.");
                editor.setValue(currentFileContent);

                // Update language based on the new file path
                const newLanguage = getLanguageFromPath(currentFilePath);
                const model = editor.getModel();
                if (model) {
                    monaco.editor.setModelLanguage(model, newLanguage);
                    console.log(`Editor language set to: ${newLanguage}`);
                }
                 // Reset undo stack for the new file
                 // NOTE: This clears the history. Consider if this is desired.
                 // You might want to manage models per file later.
                 editor.getModel()?.pushStackElement();
            } else if (currentFileContent === null && currentFilePath === null) {
                 // If context cleared (e.g., error, no file open), show placeholder
                 // editor.setValue( "// No file opened or error loading file." );
                 // monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
                 // Let's keep the local editorValue state instead for now
                 // as clearing might be disruptive if the user was editing the placeholder.
            }

            // Update readOnly state based on loading status
            editor.updateOptions({ readOnly: isLoading });

        }
    }, [currentFilePath, currentFileContent, isLoading]); // Rerun when these context values change

    // Effect to update theme and font size when theme context changes
    useEffect(() => {
        if (editorRef.current && monacoRef.current) {
            const editor = editorRef.current;
            const monacoInstance = monacoRef.current;

            const newThemeName = getMonacoThemeName(theme);
            monacoInstance.editor.setTheme(newThemeName);

            const newFontSize = getEditorFontSize();
            editor.updateOptions({
                fontSize: newFontSize,
                scrollBeyondLastLine: false
            });
        }
    }, [theme]);


    return (
        <div className="editor-panel">
             {/* Show loading overlay maybe? */}
             {/* {isLoading && <div className="loading-overlay">Loading...</div>} */}
            <MonacoEditor
                // Key prop can help force re-render if needed, e.g., on file change
                // key={currentFilePath || 'no-file'}
                width="100%"
                height="100%"
                language={getLanguageFromPath(currentFilePath)} // Set language dynamically
                value={editorValue} // Bind to local state
                options={editorOptions}
                onChange={handleEditorChange}
                editorDidMount={editorDidMount}
            />
        </div>
    );
};

export default EditorPanel;
// --- END FILE: src/renderer/components/EditorPanel.tsx ---