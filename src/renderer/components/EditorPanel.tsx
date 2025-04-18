// --- START FILE: src/renderer/components/EditorPanel.tsx ---
// src/renderer/components/EditorPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { useTheme, ThemeName } from '../contexts/ThemeContext';

// Helper function to safely get and parse font size from CSS variable
const getEditorFontSize = (): number => {
    // Ensure document exists before accessing computed style
    if (typeof document === 'undefined') return 13; // Default if SSR or other env
    const fontSizeValue = getComputedStyle(document.documentElement).getPropertyValue('--font-size-editor');
    return parseInt(fontSizeValue?.replace('px', '').trim() || '13', 10);
};

// Helper to get computed CSS variable value
const getCssVar = (varName: string, fallback: string): string => {
    // Ensure we're in a browser environment before accessing document
    if (typeof document !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim() || fallback;
    }
    return fallback; // Return fallback if not in browser
};


const EditorPanel: React.FC = () => {
    const { theme } = useTheme(); // Get the whole theme object
    const [code, setCode] = useState<string>(
        '// Welcome to CodeCraft IDE!\n' +
        '// Use the dropdown in the sidebar to change themes.\n' +
        'function hello() {\n' +
        '\tconsole.log("Hello from Monaco Editor!");\n' +
        '}'
    );
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);

    // Map app theme names to Monaco theme names
    const getMonacoThemeName = (currentTheme: ThemeName): string => {
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
            default: return 'vs-dark'; // Fallback
        }
    };

    // --- Updated Editor Options ---
    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        selectOnLineNumbers: true,
        automaticLayout: true, // Essential for resizing
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(), // Get initial size correctly
        minimap: { enabled: true }, // *** RE-ENABLE MINIMAP HERE ***
        wordWrap: 'on', // Example: enable word wrap
        scrollBeyondLastLine: false,
        // theme: getMonacoThemeName(theme.theme) // Set initial theme via editorDidMount
    };

    const handleEditorChange = (newValue: string) => {
        setCode(newValue);
        // Later: Add logic to track unsaved changes
    };

    const editorDidMount = (
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // Helper to define Monaco themes using CSS variables
        const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
            // No need to check if theme exists, defineTheme handles redefinition or use try/catch
            try {
                monacoInstance.editor.defineTheme(name, {
                    base: base,
                    inherit: true,
                    rules: [], // Keep rules empty for simplicity, inherit from base
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
                        ...colorsOverride // Allow specific overrides
                    }
                });
                console.log(`Defined Monaco theme: ${name}`);
            } catch (error) {
                console.error(`Failed to define Monaco theme '${name}':`, error);
            }
        };

        // --- Define Custom Monaco Themes ---
        defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy', {
            'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'),
            'editor.foreground': getCssVar('--pipboy-green', '#15ff60'),
            'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'),
            'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'),
            'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f'),
            'editorWidget.background': getCssVar('--pipboy-bg-lighter', '#102a18'),
            'editorWidget.border': getCssVar('--pipboy-green-dark', '#10b445'),
        });
        defineTheme('win95-monaco-theme', 'vs', 'win95', {
            'editor.background': getCssVar('--color-bg-editor', '#ffffff'),
            'editor.foreground': getCssVar('--color-text-primary', '#000000'),
            'editorCursor.foreground': '#000000',
            'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'),
            'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff'),
        });
        defineTheme('mirc-monaco-theme', 'vs', 'mirc', {
            'editor.background': getCssVar('--color-bg-editor', '#ffffff'),
            'editor.foreground': getCssVar('--color-text-primary', '#000000'),
            'editorCursor.foreground': '#000000',
            'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'),
            'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff'),
        });
        defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic', {
             'editor.background': getCssVar('--qbasic-blue', '#0000AA'),
             'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'),
             'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'),
             'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'),
             'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF'),
        });
        defineTheme('orange-monaco-theme', 'vs-dark', 'orange', {
             'editor.background': getCssVar('--orange-dark', '#201500'),
             'editor.foreground': getCssVar('--orange-bright', '#FFA500'),
             'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'),
             'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'),
             'editor.selectionForeground': getCssVar('--orange-dark', '#201500'),
        });
         defineTheme('cga-monaco-theme', 'vs-dark', 'cga', {
             'editor.background': getCssVar('--cga-black', '#000000'),
             'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'),
             'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'),
             'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'),
             'editor.selectionForeground': getCssVar('--cga-black', '#000000'),
         });
         defineTheme('atari-monaco-theme', 'vs-dark', 'atari', {
             'editor.background': getCssVar('--atari-black', '#000000'),
             'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'),
             'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'),
             'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'),
             'editor.selectionForeground': getCssVar('--atari-black', '#000000'),
         });
         defineTheme('snes-monaco-theme', 'vs-dark', 'snes', {
             'editor.background': getCssVar('--snes-bg', '#2F2F4F'),
             'editor.foreground': getCssVar('--snes-text', '#E0E0FF'),
             'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), // Yellow cursor
             'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'),
             'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F'),
         });
         defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv', {
             'editor.background': getCssVar('--bw-black', '#000000'),
             'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'),
             'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'),
             'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'),
             'editor.selectionForeground': getCssVar('--bw-black', '#000000'),
         });

        // Apply the initial theme after defining custom ones
        const initialThemeName = getMonacoThemeName(theme);
        monacoInstance.editor.setTheme(initialThemeName);
        console.log("Initial Monaco theme set to:", initialThemeName);

        // Apply initial font size and scroll option
         editor.updateOptions({
             fontSize: getEditorFontSize(),
             scrollBeyondLastLine: false
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

            // Update font size and scrollBeyondLastLine
            const newFontSize = getEditorFontSize();
            editor.updateOptions({
                fontSize: newFontSize,
                scrollBeyondLastLine: false // Re-apply on theme change too
            });
        }
    // Update when the theme object (including name and font size modifier) changes
    }, [theme]);


    return (
        <div className="editor-panel">
            <MonacoEditor
                width="100%"
                height="100%"
                language="javascript" // Default language, can be changed later
                value={code}
                options={editorOptions} // Pass initial options including minimap: true
                onChange={handleEditorChange}
                editorDidMount={editorDidMount}
            />
        </div>
    );
};

export default EditorPanel;
// --- END FILE: src/renderer/components/EditorPanel.tsx ---