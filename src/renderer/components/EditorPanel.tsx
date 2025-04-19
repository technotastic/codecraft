// --- START FILE: src/renderer/components/EditorPanel.tsx ---
import React, { useEffect, useRef, useCallback, useMemo } from 'react'; // Removed useState
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';

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
        currentFileContent, // This is the "canonical" content from the file
        isLoading,
        error: editorContextError,
        isDirty,
        markAsDirty,
        saveCurrentFile,
    } = useEditor();

    // REMOVED: const [editorValue, setEditorValue] = useState<string>(...);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    // Keep track if the editor model has been initialized with file content
    const isModelInitialized = useRef<boolean>(false);
    // Ref to store the change listener disposable to clean it up
    const changeListenerDisposable = useRef<monaco.IDisposable | null>(null);


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
    }, []);

    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = useMemo(() => ({
        selectOnLineNumbers: true,
        automaticLayout: true,
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(),
        minimap: { enabled: true },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: isLoading,
        // --- Ensure 'value' is NOT set here ---
    }), [isLoading]);


    // --- Modified onChange Handler Logic ---
    // This is the function called BY the editor's internal change event
    const handleInternalChange = useCallback(() => {
        const editor = editorRef.current;
        // Check if the editor exists, the model is initialized, and we have canonical content
        if (editor && isModelInitialized.current && currentFileContent !== null) {
            const currentEditorValue = editor.getValue();
            const shouldBeDirty = currentEditorValue !== currentFileContent;
            // Only call markAsDirty if the state needs to change
            if (shouldBeDirty !== isDirty) {
                 console.log(`handleInternalChange: Setting dirty state to ${shouldBeDirty}`);
                 markAsDirty(shouldBeDirty);
            }
        }
    }, [currentFileContent, markAsDirty, isDirty]); // Depends on context content and dirty state


    const editorDidMount = useCallback((
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        isModelInitialized.current = false; // Model not initialized yet

        // --- Dispose previous listener if component remounts unexpectedly ---
        if (changeListenerDisposable.current) {
            console.warn("Remount detected, disposing previous change listener.");
            changeListenerDisposable.current.dispose();
            changeListenerDisposable.current = null;
        }


        // Define themes ...
         const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
             try {
                 monacoInstance.editor.defineTheme(name, {
                     base: base,
                     inherit: true,
                     rules: [],
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
                 // console.log(`Defined Monaco theme: ${name}`); // Less verbose log
             } catch (error) {
                 console.error(`Failed to define Monaco theme '${name}':`, error);
             }
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


        // Apply the initial theme & font size
        monacoInstance.editor.setTheme(getMonacoThemeName(theme));
        editor.updateOptions({ fontSize: getEditorFontSize() });

        // Set initial value DIRECTLY in Monaco model (if context provides it)
        // This avoids triggering the change listener unnecessarily
        if (currentFileContent !== null) {
            console.log("EditorDidMount: Setting initial model value from context.");
            editor.setValue(currentFileContent);
            isModelInitialized.current = true;
            const initialLanguage = getLanguageFromPath(currentFilePath);
            // Correct usage for setting initial language
            monacoInstance.editor.setModelLanguage(editor.getModel()!, initialLanguage);
            markAsDirty(false); // Start clean
        } else {
            console.log("EditorDidMount: No initial context content, setting placeholder.");
            editor.setValue('// Welcome to CodeCraft IDE!\n// Click "Open..." or a file in the sidebar.');
            isModelInitialized.current = false;
            markAsDirty(false); // Start clean
        }
        // Reset undo stack after potentially setting initial value
        editor.getModel()?.pushStackElement();


        // --- Attach the SINGLE onChange listener ---
        // Store the disposable to remove the listener on unmount
        changeListenerDisposable.current = editor.onDidChangeModelContent(() => {
            // Call the memoized handler function
            handleInternalChange();
        });
        console.log("EditorDidMount: Attached onDidChangeModelContent listener.");


        // Add keyboard shortcut for saving
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
             const editorInstance = editorRef.current;
             if (!editorInstance) return;

             const contentToSave = editorInstance.getValue();
             if (currentFilePath && isDirty) { // Use the isDirty flag from context
                 console.log("Ctrl+S: Saving dirty file...");
                 saveCurrentFile(contentToSave)
                     .catch(err => console.error("Error during save operation:", err));
             } else if (!isDirty) {
                 console.log("Ctrl+S: No changes to save.");
             } else {
                 console.log("Ctrl+S: No file path to save to.");
             }
         });

        editor.focus();

        // Cleanup function for this effect
        return () => {
             console.log("Editor unmounting, disposing change listener.");
             if (changeListenerDisposable.current) {
                changeListenerDisposable.current.dispose();
                changeListenerDisposable.current = null;
             }
             // Reset editor ref on unmount
             editorRef.current = null;
             monacoRef.current = null;
        };
    // Dependencies: Only include things that fundamentally change how the editor is SETUP
    // or how its listeners behave. Avoid context values that change frequently.
    }, [theme, getMonacoThemeName, saveCurrentFile, handleInternalChange, markAsDirty, isDirty, currentFileContent, currentFilePath]); // Added context values needed for initial setup


    // --- Effect to update editor ONLY when context content/path changes (external load/save) ---
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;

        if (!editor || !monaco) return;

        // --- Condition 1: Context has NEW valid content ---
        // Check if context has content AND (model isn't initialized OR context differs from model)
        if (currentFileContent !== null && (!isModelInitialized.current || currentFileContent !== editor.getValue())) {
            console.log("Context content changed externally OR initial load. Updating editor model.");

            // Store cursor position before setting value
            const currentPosition = editor.getPosition();

            editor.setValue(currentFileContent); // Update the editor's internal model

            // Try to restore cursor position after setting value
            if (currentPosition && isModelInitialized.current) { // Only restore if not initial load
                // Enqueue restoration to run after Monaco processes setValue
                setTimeout(() => {
                     editorRef.current?.setPosition(currentPosition);
                }, 0);
            }

            isModelInitialized.current = true; // Mark model as initialized

            // Update language model
            const newLanguage = getLanguageFromPath(currentFilePath);
            const model = editor.getModel();
            // Check if model exists AND its current language ID is different
            if (model && model.getLanguageId() !== newLanguage) { // <<< CORRECTED CHECK
                monaco.editor.setModelLanguage(model, newLanguage); // Use setModelLanguage here
                console.log(`Editor language set to: ${newLanguage}`);
            }


            // Reset undo stack & mark clean ONLY if it wasn't just the initial load
            if (isModelInitialized.current) {
                editor.getModel()?.pushStackElement();
            }
            markAsDirty(false);
        }
        // --- Condition 2: Context was cleared (e.g., error, close file) ---
        else if (currentFileContent === null && currentFilePath === null && isModelInitialized.current) {
             console.log("Context cleared. Resetting editor to placeholder.");
             editor.setValue("// No file open or error occurred.");
             monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
             isModelInitialized.current = false;
             markAsDirty(false);
        }

        // --- Condition 3: Update readOnly based on isLoading ---
        if (editor.getOption(monaco.editor.EditorOption.readOnly) !== isLoading) {
             console.log(`Updating editor readOnly state to: ${isLoading}`);
             editor.updateOptions({ readOnly: isLoading });
        }

    // React ONLY to external context changes
    }, [currentFilePath, currentFileContent, isLoading, markAsDirty]);


    // Effect to update theme and font size when theme context changes
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (editor && monaco) {
            monaco.editor.setTheme(getMonacoThemeName(theme));
            editor.updateOptions({ fontSize: getEditorFontSize() });
        }
    }, [theme, getMonacoThemeName]);


    return (
        <div className="editor-panel">
            {/* Display Context Error */}
            {editorContextError && <div style={{ position: 'absolute', top: '25px', left:'10px', color: 'var(--color-text-error)', background: 'var(--color-bg-main)', padding: '2px 5px', zIndex: 1, border: '1px solid var(--color-text-error)', borderRadius: '3px', fontSize: '11px'}}>Error: {editorContextError}</div>}
            {/* Display Dirty Indicator (driven by context's isDirty) */}
            {isDirty && <span style={{ position: 'absolute', top: '5px', right: '10px', color: 'var(--color-text-accent)', fontSize: '10px', zIndex: 1 }}>● Unsaved</span>}

            <MonacoEditor
                width="100%"
                height="100%"
                language={getLanguageFromPath(currentFilePath)} // Needed for initial setup
                // value prop REMOVED
                options={editorOptions}
                // onChange prop REMOVED
                editorDidMount={editorDidMount} // Sets up editor and internal listener
            />
        </div>
    );
};

export default EditorPanel;
// --- END FILE: src/renderer/components/EditorPanel.tsx ---