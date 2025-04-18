// --- START FILE: src/renderer/components/EditorPanel.tsx ---
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Import useMemoimport MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';
import MonacoEditor from 'react-monaco-editor';

// Helper function to safely get and parse font size from CSS variable
const getEditorFontSize = (): number => {
    if (typeof document === 'undefined') return 13; // Default if SSR or other env
    try {
        const fontSizeValue = getComputedStyle(document.documentElement).getPropertyValue('--font-size-editor');
        return parseInt(fontSizeValue?.replace('px', '').trim() || '13', 10);
    } catch (e) {
        console.warn("Could not get computed style for font size, using default.", e);
        return 13;
    }
};

// Helper to get computed CSS variable value
const getCssVar = (varName: string, fallback: string): string => {
    if (typeof document !== 'undefined') {
         try {
             return getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim() || fallback;
         } catch(e) {
              console.warn(`Could not get computed style for CSS var ${varName}, using fallback.`, e);
              return fallback;
         }
    }
    return fallback; // Return fallback if not in browser
};

// Language Mapping Utility
const getLanguageFromPath = (filePath: string | null): string => {
    if (!filePath) return 'plaintext';
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js': case 'jsx': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'json': return 'json';
        case 'css': return 'css';
        case 'html': case 'htm': return 'html';
        case 'md': case 'markdown': return 'markdown';
        case 'py': return 'python';
        case 'java': return 'java';
        case 'c': case 'h': return 'c';
        case 'cpp': case 'hpp': return 'cpp';
        case 'cs': return 'csharp';
        case 'sh': return 'shell';
        case 'xml': return 'xml';
        case 'yaml': case 'yml': return 'yaml';
        case 'sql': return 'sql';
        default: return 'plaintext';
    }
};


const EditorPanel: React.FC = () => {
    const { theme } = useTheme();
    const {
        currentFilePath,
        currentFileContent,
        isLoading,
        error: editorContextError, // Renamed to avoid conflict
        isDirty,
        markAsDirty,
        saveCurrentFile,
    } = useEditor();

    const [editorValue, setEditorValue] = useState<string>(
        '// Welcome to CodeCraft IDE!\n// Click "Open..." or a file in the sidebar.'
    );
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const initialContentLoadedRef = useRef<boolean>(false);

    // Map app theme names to Monaco theme names
     const getMonacoThemeName = useCallback((currentTheme: ThemeName): string => {
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
    }, []); // No dependencies needed

    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = useMemo(() => ({
        selectOnLineNumbers: true,
        automaticLayout: true, // Recalculates layout on container resize
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(), // Recalculate on theme change potentially
        minimap: { enabled: true },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: isLoading, // Update readOnly state based on loading
        // Theme is set dynamically in useEffect
    }), [isLoading]); // fontSize could be added if needed, but CSS var change triggers redraw anyway


    const handleEditorChange = useCallback((newValue: string) => {
        setEditorValue(newValue);
        // Check ref *before* comparing content to avoid marking dirty during initial load
        if (initialContentLoadedRef.current && newValue !== currentFileContent) {
             markAsDirty(true);
        }
    }, [currentFileContent, markAsDirty]);


    const editorDidMount = useCallback((
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        initialContentLoadedRef.current = false;

        // Helper to define Monaco themes using CSS variables (ensure getCssVar is used)
        const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
             try {
                 monacoInstance.editor.defineTheme(name, {
                     base: base,
                     inherit: true,
                     rules: [], // Keep rules empty for simplicity, inherit from base
                     colors: { // Use getCssVar for colors
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
                 console.log(`Defined Monaco theme: ${name}`);
             } catch (error) {
                 console.error(`Failed to define Monaco theme '${name}':`, error);
             }
         };

        // --- Define Custom Monaco Themes (using getCssVar via defineTheme) ---
        defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy', { 'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'), 'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f'), 'editorWidget.background': getCssVar('--pipboy-bg-lighter', '#102a18'), 'editorWidget.border': getCssVar('--pipboy-green-dark', '#10b445'), });
        defineTheme('win95-monaco-theme', 'vs', 'win95', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff'), });
        defineTheme('mirc-monaco-theme', 'vs', 'mirc', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff'), });
        defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic', { 'editor.background': getCssVar('--qbasic-blue', '#0000AA'), 'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'), 'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'), 'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF'), });
        defineTheme('orange-monaco-theme', 'vs-dark', 'orange', { 'editor.background': getCssVar('--orange-dark', '#201500'), 'editor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'), 'editor.selectionForeground': getCssVar('--orange-dark', '#201500'), });
        defineTheme('cga-monaco-theme', 'vs-dark', 'cga', { 'editor.background': getCssVar('--cga-black', '#000000'), 'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'), 'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'), 'editor.selectionForeground': getCssVar('--cga-black', '#000000'), });
        defineTheme('atari-monaco-theme', 'vs-dark', 'atari', { 'editor.background': getCssVar('--atari-black', '#000000'), 'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'), 'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionForeground': getCssVar('--atari-black', '#000000'), });
        defineTheme('snes-monaco-theme', 'vs-dark', 'snes', { 'editor.background': getCssVar('--snes-bg', '#2F2F4F'), 'editor.foreground': getCssVar('--snes-text', '#E0E0FF'), 'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), 'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'), 'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F'), });
        defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv', { 'editor.background': getCssVar('--bw-black', '#000000'), 'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'), 'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'), 'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'), 'editor.selectionForeground': getCssVar('--bw-black', '#000000'), });


        // Apply the initial theme
        const initialThemeName = getMonacoThemeName(theme);
        monacoInstance.editor.setTheme(initialThemeName);
        console.log("Initial Monaco theme set to:", initialThemeName);

        // Apply initial font size
        editor.updateOptions({ fontSize: getEditorFontSize() });

        // Set initial content carefully
        if (currentFileContent !== null) {
             editor.setValue(currentFileContent);
             setEditorValue(currentFileContent); // Sync local state
             initialContentLoadedRef.current = true;
             const initialLanguage = getLanguageFromPath(currentFilePath);
             monacoInstance.editor.setModelLanguage(editor.getModel()!, initialLanguage);
             markAsDirty(false);
        } else {
             editor.setValue(editorValue); // Use placeholder from state
             initialContentLoadedRef.current = false;
             markAsDirty(false);
        }

         // Add keyboard shortcut for saving
         editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
             console.log('Save shortcut pressed (Ctrl/Cmd + S)');
             // Use editorValue (local state) which reflects current unsaved content
             const contentToSave = editor.getValue();
             if (currentFilePath && (isDirty || contentToSave !== currentFileContent)) { // Save if dirty or if local differs from context (edge case)
                 saveCurrentFile(contentToSave)
                     .catch(err => console.error("Error during save operation:", err));
             } else if (!isDirty) {
                 console.log("Save shortcut ignored: No changes detected.");
             } else {
                  console.log("Save shortcut ignored: No file path.");
             }
         });

        editor.focus();
    // Add theme dependency for theme name calculation, markAsDirty for setting initial state
    }, [theme, currentFileContent, currentFilePath, markAsDirty, getMonacoThemeName, saveCurrentFile, editorValue, isDirty]);


    // Effect to update editor when file content/path changes in context (external load)
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;

        if (editor && monaco && currentFileContent !== null && currentFileContent !== editor.getValue()) {
            console.log("EditorContext changed (external load/save), updating editor value and language.");
            editor.setValue(currentFileContent);
            setEditorValue(currentFileContent); // Sync local state
            initialContentLoadedRef.current = true; // Mark content loaded

            const newLanguage = getLanguageFromPath(currentFilePath);
            const model = editor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, newLanguage);
                console.log(`Editor language set to: ${newLanguage}`);
            }
            // Reset undo stack for the new file (or after save)
            editor.getModel()?.pushStackElement();
            markAsDirty(false); // Explicitly mark as not dirty after external load/save
        } else if (editor && monaco && currentFileContent === null && currentFilePath === null && initialContentLoadedRef.current) {
             // Context cleared after a file was loaded
             const placeholder = "// No file open or error occurred.";
             editor.setValue(placeholder);
             setEditorValue(placeholder);
             monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
             initialContentLoadedRef.current = false;
             markAsDirty(false);
        }

        // Update readOnly state (handled in editorOptions and re-evaluated via useMemo)
        if (editor) {
            editor.updateOptions({ readOnly: isLoading });
        }

    }, [currentFilePath, currentFileContent, isLoading, markAsDirty]);


    // Effect to update theme and font size when theme context changes
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (editor && monaco) {
            const newThemeName = getMonacoThemeName(theme);
            monaco.editor.setTheme(newThemeName);
            editor.updateOptions({ fontSize: getEditorFontSize() }); // Update font size too
        }
    }, [theme, getMonacoThemeName]); // Add getMonacoThemeName dependency


    // Effect for logging dirty state (no changes needed here)
    useEffect(() => {
        if (isDirty) {
            console.log("Editor state: Dirty (unsaved changes)");
        } else {
             console.log("Editor state: Clean (no unsaved changes)");
        }
    }, [isDirty]);


    return (
        <div className="editor-panel">
            {/* Simple error display from context */}
            {editorContextError && <div style={{ position: 'absolute', top: '25px', left:'10px', color: 'var(--color-text-error)', background: 'var(--color-bg-main)', padding: '2px 5px', zIndex: 1, border: '1px solid var(--color-text-error)', borderRadius: '3px', fontSize: '11px'}}>Error: {editorContextError}</div>}
            {isDirty && <span style={{ position: 'absolute', top: '5px', right: '10px', color: 'var(--color-text-accent)', fontSize: '10px', zIndex: 1 }}>● Unsaved</span>}
            <MonacoEditor
                width="100%"
                height="100%"
                // Determine language based on currentFilePath from context
                language={getLanguageFromPath(currentFilePath)}
                // Use local editorValue state for the editor's content
                value={editorValue}
                options={editorOptions} // Use memoized options
                onChange={handleEditorChange} // Use callback version
                editorDidMount={editorDidMount} // Use callback version
            />
        </div>
    );
};

export default EditorPanel;
// --- END FILE: src/renderer/components/EditorPanel.tsx ---