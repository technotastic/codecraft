// src/renderer/components/EditorPanel.tsx
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';
import WelcomeScreen from './WelcomeScreen'; // Import the new component
import './WelcomeScreen.css'; // Import the styles for the welcome screen

// Helper function to safely get and parse font size from CSS variable
const getEditorFontSize = (): number => {
    if (typeof document === 'undefined') return 13;
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
    return fallback;
};

// Language Mapping Utility
const getLanguageFromPath = (filePath: string | null): string => {
    if (!filePath) return 'plaintext';
    const extension = filePath.split('.').pop()?.toLowerCase();
    // Add more mappings as needed
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
        openFiles, // Need this to check if any files are open
        activeFilePath,
        getActiveFile,
        updateActiveFileDirtyState, // <-- Function to call
        saveActiveFile,
        setCursorPosition,
    } = useEditor();

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const lastSetModelPath = useRef<string | null>(null);
    const changeListenerDisposable = useRef<monaco.IDisposable | null>(null);
    const cursorListenerDisposable = useRef<monaco.IDisposable | null>(null);
    const viewStateCache = useRef<Map<string, monaco.editor.ICodeEditorViewState | null>>(new Map());

    const activeFile = useMemo(() => getActiveFile(), [getActiveFile]);

    const getMonacoThemeName = useCallback((currentTheme: ThemeName): string => {
        switch (currentTheme) {
            case 'light': return 'vs';
            case 'dark': return 'vs-dark';
            // ... other themes
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

    const editorOptions = useMemo((): monaco.editor.IStandaloneEditorConstructionOptions => ({
        selectOnLineNumbers: true,
        automaticLayout: true,
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(),
        minimap: { enabled: true },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: activeFile?.isLoading ?? !activeFile,
    }), [activeFile]);


    // --- Editor Change Handler ---
    // MODIFIED: Always call context function, pass current editor value
    const handleInternalChange = useCallback(() => {
        const editor = editorRef.current;
        const currentModelValue = editor?.getValue();

        if (editor && currentModelValue !== undefined) {
            // Pass the current editor value to the context function
            // Let the context handle the comparison with its latest state
             console.log(`[EditorPanel -> handleInternalChange] Calling updateActiveFileDirtyState with current editor content (length: ${currentModelValue.length})`);
            updateActiveFileDirtyState(currentModelValue);
        }
    }, [updateActiveFileDirtyState]); // Depends only on the context function


    // --- Editor Mount Logic ---
    const editorDidMount = useCallback((
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        lastSetModelPath.current = null;
        viewStateCache.current.clear();

        changeListenerDisposable.current?.dispose();
        cursorListenerDisposable.current?.dispose();

        // Define custom themes (No changes needed here, keep as is)
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
                        // Theme-specific overrides
                         ...(name === 'win95-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }),
                         ...(name === 'mirc-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }),
                         ...(name === 'pipboy-monaco-theme' && { 'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f') }),
                         ...(name === 'qbasic-monaco-theme' && { 'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF') }),
                         ...(name === 'orange-monaco-theme' && { 'editor.selectionForeground': getCssVar('--orange-dark', '#201500') }),
                         ...(name === 'cga-monaco-theme' && { 'editor.selectionForeground': getCssVar('--cga-black', '#000000') }),
                         ...(name === 'atari-monaco-theme' && { 'editor.selectionForeground': getCssVar('--atari-black', '#000000') }),
                         ...(name === 'snes-monaco-theme' && { 'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F') }),
                         ...(name === 'bw-tv-monaco-theme' && { 'editor.selectionForeground': getCssVar('--bw-black', '#000000') }),
                        ...colorsOverride
                    }
                 });
             } catch (error) { console.error(`Failed to define Monaco theme '${name}':`, error); }
         };
        // Define all themes...
        defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy', { 'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'), 'editorWidget.background': getCssVar('--pipboy-bg-lighter', '#102a18'), 'editorWidget.border': getCssVar('--pipboy-green-dark', '#10b445'), });
        defineTheme('win95-monaco-theme', 'vs', 'win95', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), });
        defineTheme('mirc-monaco-theme', 'vs', 'mirc', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), });
        defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic', { 'editor.background': getCssVar('--qbasic-blue', '#0000AA'), 'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'), 'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'), });
        defineTheme('orange-monaco-theme', 'vs-dark', 'orange', { 'editor.background': getCssVar('--orange-dark', '#201500'), 'editor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'), });
        defineTheme('cga-monaco-theme', 'vs-dark', 'cga', { 'editor.background': getCssVar('--cga-black', '#000000'), 'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'), 'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'), });
        defineTheme('atari-monaco-theme', 'vs-dark', 'atari', { 'editor.background': getCssVar('--atari-black', '#000000'), 'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'), 'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'), });
        defineTheme('snes-monaco-theme', 'vs-dark', 'snes', { 'editor.background': getCssVar('--snes-bg', '#2F2F4F'), 'editor.foreground': getCssVar('--snes-text', '#E0E0FF'), 'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), 'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'), });
        defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv', { 'editor.background': getCssVar('--bw-black', '#000000'), 'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'), 'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'), 'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'), });

        monacoInstance.editor.setTheme(getMonacoThemeName(theme));
        editor.updateOptions({ fontSize: getEditorFontSize() });

        // Only set initial value if files are actually open during mount
        // Otherwise, the WelcomeScreen will be shown.
        const initialActiveFile = getActiveFile();
        if (openFiles.length > 0 && initialActiveFile && initialActiveFile.content !== null) {
            console.log(`EditorDidMount: Setting initial model value for ${initialActiveFile.path}`);
            editor.setValue(initialActiveFile.content);
            lastSetModelPath.current = initialActiveFile.path;
            monacoInstance.editor.setModelLanguage(editor.getModel()!, getLanguageFromPath(initialActiveFile.path));
            const initialPosition = editor.getPosition();
            if (initialPosition) setCursorPosition(initialPosition);
            editor.getModel()?.pushStackElement();
            editor.focus();
        } else if (openFiles.length > 0) {
             // Case where files are open, but maybe none are active yet or content is null
             editor.setValue('// Loading file...'); // Placeholder while context loads
             lastSetModelPath.current = null;
             monacoInstance.editor.setModelLanguage(editor.getModel()!, 'plaintext');
             setCursorPosition(null);
        }
        // If openFiles.length is 0, don't set any value here, WelcomeScreen shows


        // Attach the onChange listener - calls the MODIFIED handler
        changeListenerDisposable.current = editor.onDidChangeModelContent(() => {
            // Only run change handler if files are open
            if (openFiles.length > 0) {
                handleInternalChange(); // This now calls the context function
            }
        });
        console.log("EditorDidMount: Attached onDidChangeModelContent listener.");

        cursorListenerDisposable.current = editor.onDidChangeCursorPosition((e) => {
            // Only update cursor position if files are open
            if (openFiles.length > 0) {
                if (e.position) setCursorPosition(e.position);
                else setCursorPosition(null);
            } else {
                 setCursorPosition(null); // Ensure cursor pos is null if no files open
            }
        });
        console.log("EditorDidMount: Attached onDidChangeCursorPosition listener.");

        // Add Ctrl+S Command (No change here, relies on context save function)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
             // Only save if files are open
             if (openFiles.length > 0) {
                console.log(`[Ctrl+S Handler] Triggered.`);
                const currentContent = editorRef.current?.getValue();
                const activeFileNow = getActiveFile(); // Still useful to check *if* there's an active file

                console.log(`[Ctrl+S Handler] Content to save (length: ${currentContent?.length ?? 'undefined'}):`, currentContent?.substring(0, 50) + '...');

                if (activeFileNow && currentContent !== undefined) {
                     // We no longer log dirty state here, context handles it
                     console.log(`[Ctrl+S Handler] Active file: ${activeFileNow.path}. Calling saveActiveFile...`);
                     saveActiveFile(currentContent)
                        .then(() => {
                            console.log(`[Ctrl+S Handler] saveActiveFile promise resolved (may or may not indicate success) for ${activeFileNow.path}.`);
                        })
                        .catch(err => {
                            console.error(`[Ctrl+S Handler] Error during save operation for ${activeFileNow.path}:`, err);
                        });
                } else {
                    console.log(`[Ctrl+S Handler] No active file or content unavailable. Cannot save.`);
                }
             } else {
                  console.log(`[Ctrl+S Handler] No files open. Cannot save.`);
             }
         });

        return () => {
             console.log("Editor unmounting, disposing listeners.");
             changeListenerDisposable.current?.dispose();
             cursorListenerDisposable.current?.dispose();
             changeListenerDisposable.current = null;
             cursorListenerDisposable.current = null;
             editorRef.current = null;
             monacoRef.current = null;
        };
    }, [theme, getMonacoThemeName, getActiveFile, handleInternalChange, saveActiveFile, updateActiveFileDirtyState, setCursorPosition, openFiles]); // Added openFiles


    // --- Effect to UPDATE editor content when ACTIVE file changes ---
    useEffect(() => {
        // Skip this effect entirely if no files are open
        if (openFiles.length === 0) {
             console.log("No files open, skipping active file update effect.");
             // Ensure last path ref is cleared if editor was previously showing a file
             if (lastSetModelPath.current !== null) lastSetModelPath.current = null;
             return;
        }

        const editor = editorRef.current;
        const monaco = monacoRef.current;

        const previousPath = lastSetModelPath.current;
        if (editor && previousPath && previousPath !== activeFile?.path) {
            const currentState = editor.saveViewState();
            viewStateCache.current.set(previousPath, currentState);
            console.log(`Saved view state for ${previousPath}`);
        }

        if (!editor || !monaco ) {
             console.log("Editor not ready, skipping active file update.");
             return;
        }

        if (!activeFile) {
            // This case happens when files are open, but the active one is null
            // (e.g., after closing the last active tab but others remain)
            // Keep the editor instance but maybe show a placeholder? Or leave it blank?
            // Current logic below handles setting value to '' if activeFile.content is null
             if (lastSetModelPath.current !== null) {
                 console.log("Active file is now null (but other files may be open). Clearing editor display (temporarily).");
                 editor.setValue(''); // Clear display, but keep editor instance
                 lastSetModelPath.current = null; // Mark that no specific file model is currently set
                 monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
                 editor.updateOptions({ readOnly: true });
                 setCursorPosition(null);
             }
             return;
        }

        // *** IMPORTANT: Check activeFile.content specifically ***
        // Check if path changed AND the content in the context is NOT null (meaning load is complete)
        // AND the file isn't currently marked as loading
        if (activeFile.path !== lastSetModelPath.current && activeFile.content !== null && !activeFile.isLoading) {
            console.log(`Active file changed to ${activeFile.path} AND content/loading state is ready. Updating editor model.`);

            editor.setValue(activeFile.content);
            lastSetModelPath.current = activeFile.path;

             const previousViewState = viewStateCache.current.get(activeFile.path);
             if (previousViewState) {
                 console.log(`Restoring view state for ${activeFile.path}`);
                 editor.restoreViewState(previousViewState);
             } else {
                  console.log(`No view state found for ${activeFile.path}, using default.`);
                  editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
                  editor.setPosition({ lineNumber: 1, column: 1 });
             }

             const currentPosition = editor.getPosition();
             if (currentPosition) setCursorPosition(currentPosition);

             const newLanguage = getLanguageFromPath(activeFile.path);
             const model = editor.getModel();
             if (model && model.getLanguageId() !== newLanguage) {
                 monaco.editor.setModelLanguage(model, newLanguage);
                 console.log(`Editor language set to: ${newLanguage}`);
             }

             editor.focus();
        } else if (activeFile.path === lastSetModelPath.current) {
             console.log(`Active file path ${activeFile.path} hasn't changed, skipping model update.`);
        } else {
             console.log(`Active file changed to ${activeFile.path} BUT content is null or still loading. Deferring editor model update.`);
             // Optionally set a temporary loading message in the editor itself if desired
             // editor.setValue('// Loading...');
        }


        // Always update readOnly state based on latest activeFile status
        const shouldBeReadOnly = activeFile.isLoading || !activeFile.path; // Consider no path as readonly too
        if (editor.getOption(monaco.editor.EditorOption.readOnly) !== shouldBeReadOnly) {
             console.log(`Updating editor readOnly state to: ${shouldBeReadOnly}`);
             editor.updateOptions({ readOnly: shouldBeReadOnly });
        }

    }, [activeFile, setCursorPosition, openFiles]); // Added openFiles


    // Effect to update theme and font size
    useEffect(() => {
        // Only run if files are open (Monaco instance might exist but shouldn't be updated if welcome screen is showing)
        if (openFiles.length === 0) return;

        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (editor && monaco) {
            monaco.editor.setTheme(getMonacoThemeName(theme));
            editor.updateOptions({ fontSize: getEditorFontSize() });
        }
    }, [theme, getMonacoThemeName, openFiles]); // Added openFiles


    return (
        <div className="editor-panel" id="editor-panel-main">
            {/* Conditional Rendering: Show WelcomeScreen or Editor */}
            {openFiles.length === 0 ? (
                <WelcomeScreen />
            ) : (
                <>
                    {/* Indicators shown only when editor is active */}
                    {activeFile?.error && <div className="editor-context-error">Error: {activeFile.error}</div>}
                    {activeFile?.isLoading && <div className="editor-loading-indicator">Loading...</div>}

                    <MonacoEditor
                        key={activeFilePath || 'editor-active'} // Key changes when active file changes or becomes null
                        width="100%"
                        height="100%"
                        language={getLanguageFromPath(activeFilePath)} // Language based on current active path
                        theme={getMonacoThemeName(theme)}
                        options={editorOptions}
                        value={activeFile?.content ?? ''} // Use activeFile context for value, default to empty string
                        editorDidMount={editorDidMount}
                        // onChange prop is not strictly necessary due to internal listener, but can leave it
                        // onChange={handleInternalChange}
                    />
                </>
            )}
        </div>
    );
};

export default EditorPanel;