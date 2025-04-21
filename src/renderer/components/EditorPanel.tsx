// --- START FILE: src/renderer/components/EditorPanel.tsx ---
import React, { useEffect, useRef, useCallback, useMemo } from 'react'; // Removed useState
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';

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
        activeFilePath, // Get active path from context
        getActiveFile, // Get the active file data object
        updateActiveFileDirtyState, // Function to update context's dirty state flag
        saveActiveFile, // Function to trigger save IPC for active file (expects content)
    } = useEditor();

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    // Store the active file's path when the model was last set
    // to prevent unnecessary updates when switching tabs
    const lastSetModelPath = useRef<string | null>(null);
    const changeListenerDisposable = useRef<monaco.IDisposable | null>(null);
    // Keep track of the current view state (scroll position, cursor) for the inactive file
    const viewStateCache = useRef<Map<string, monaco.editor.ICodeEditorViewState | null>>(new Map());


    // Get the data for the currently active file
    const activeFile = useMemo(() => getActiveFile(), [getActiveFile]);

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


    const editorOptions = useMemo((): monaco.editor.IStandaloneEditorConstructionOptions => ({
        selectOnLineNumbers: true,
        automaticLayout: true, // Crucial for resizing within Allotment
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(),
        minimap: { enabled: true },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: activeFile?.isLoading ?? !activeFile, // Readonly if loading OR no file active
        // Value is now managed dynamically, not set here
    }), [activeFile]); // Depends on activeFile status


    // --- Editor Change Handler ---
    // Called BY the editor's internal change event
    const handleInternalChange = useCallback(() => {
        const editor = editorRef.current;
        const currentModelValue = editor?.getValue();
        const activeFileNow = getActiveFile(); // Get current active file state

        if (editor && activeFileNow && !activeFileNow.isLoading && currentModelValue !== undefined) {
            // Compare editor value with the CONTEXT's last known saved content
            const shouldBeDirty = currentModelValue !== activeFileNow.content;
            // console.log(`[handleInternalChange] Editor content changed. Current value !== saved content? ${shouldBeDirty}`); // DEBUG LOG
            // Notify context ONLY if dirty status changes
            updateActiveFileDirtyState(shouldBeDirty);
        } else {
            // console.log(`[handleInternalChange] Skipping dirty check (editor=${!!editor}, activeFile=${!!activeFileNow}, loading=${activeFileNow?.isLoading}, valueDefined=${currentModelValue !== undefined})`); // DEBUG LOG
        }
    }, [getActiveFile, updateActiveFileDirtyState]);


    // --- Editor Mount Logic ---
    const editorDidMount = useCallback((
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        lastSetModelPath.current = null; // Reset marker
        viewStateCache.current.clear(); // Clear view state cache on mount

        // Dispose previous listener if remounts occur
        if (changeListenerDisposable.current) {
            changeListenerDisposable.current.dispose();
        }

        // Define custom themes (keep this logic as is)
        const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
             try {
                 monacoInstance.editor.defineTheme(name, {
                    base: base,
                    inherit: true,
                    rules: [], // Add token rules later if needed
                    colors: {
                        'editor.background': getCssVar(`--${cssVarPrefix}-bg`, base === 'vs' ? '#ffffff' : '#1e1e1e'),
                        'editor.foreground': getCssVar(`--${cssVarPrefix}-text`, base === 'vs' ? '#000000' : '#d4d4d4'),
                        'editorCursor.foreground': getCssVar(`--${cssVarPrefix}-accent`, base === 'vs' ? '#000000' : '#aeafad'),
                        'editorLineNumber.foreground': getCssVar(`--${cssVarPrefix}-tertiary`, '#858585'),
                        'editorLineNumber.activeForeground': getCssVar(`--${cssVarPrefix}-secondary`, '#c6c6c6'),
                        'editor.selectionBackground': getCssVar(`--${cssVarPrefix}-selected-bg`, '#add6ff'),
                        'editor.selectionForeground': getCssVar(`--${cssVarPrefix}-selected-text`, '#000000'), // Use appropriate contrast
                        'editorWidget.background': getCssVar(`--${cssVarPrefix}-widget-bg`, base === 'vs' ? '#f3f3f3' : '#252526'),
                        'editorWidget.border': getCssVar(`--${cssVarPrefix}-border`, '#c8c8c8'),
                        'input.background': getCssVar(`--${cssVarPrefix}-input-bg`, base === 'vs' ? '#ffffff' : '#3c3c3c'),
                        'input.foreground': getCssVar(`--${cssVarPrefix}-input-text`, base === 'vs' ? '#000000' : '#d4d4d4'),
                        'input.border': getCssVar(`--${cssVarPrefix}-input-border`, '#bebebe'),
                        // Ensure high contrast selection for specific themes
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
        // Define all themes... (kept for brevity, no change needed)
        defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy', { 'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'), /* selectionForeground handled above */ 'editorWidget.background': getCssVar('--pipboy-bg-lighter', '#102a18'), 'editorWidget.border': getCssVar('--pipboy-green-dark', '#10b445'), });
        defineTheme('win95-monaco-theme', 'vs', 'win95', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), /* selectionForeground handled above */ });
        defineTheme('mirc-monaco-theme', 'vs', 'mirc', { 'editor.background': getCssVar('--color-bg-editor', '#ffffff'), 'editor.foreground': getCssVar('--color-text-primary', '#000000'), 'editorCursor.foreground': '#000000', 'editor.selectionBackground': getCssVar('--color-bg-selected', '#000080'), /* selectionForeground handled above */ });
        defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic', { 'editor.background': getCssVar('--qbasic-blue', '#0000AA'), 'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'), 'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'), /* selectionForeground handled above */ });
        defineTheme('orange-monaco-theme', 'vs-dark', 'orange', { 'editor.background': getCssVar('--orange-dark', '#201500'), 'editor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'), /* selectionForeground handled above */ });
        defineTheme('cga-monaco-theme', 'vs-dark', 'cga', { 'editor.background': getCssVar('--cga-black', '#000000'), 'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'), 'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'), /* selectionForeground handled above */ });
        defineTheme('atari-monaco-theme', 'vs-dark', 'atari', { 'editor.background': getCssVar('--atari-black', '#000000'), 'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'), 'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'), /* selectionForeground handled above */ });
        defineTheme('snes-monaco-theme', 'vs-dark', 'snes', { 'editor.background': getCssVar('--snes-bg', '#2F2F4F'), 'editor.foreground': getCssVar('--snes-text', '#E0E0FF'), 'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), 'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'), /* selectionForeground handled above */ });
        defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv', { 'editor.background': getCssVar('--bw-black', '#000000'), 'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'), 'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'), 'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'), /* selectionForeground handled above */ });


        // Apply initial theme/font size
        monacoInstance.editor.setTheme(getMonacoThemeName(theme));
        editor.updateOptions({ fontSize: getEditorFontSize() });

        // --- Logic to load INITIAL active file content (if any) ---
        // Use the value from the context hook directly
        const initialActiveFile = getActiveFile(); // Needs getActiveFile from context
        if (initialActiveFile && initialActiveFile.content !== null) {
            console.log(`EditorDidMount: Setting initial model value for ${initialActiveFile.path}`);
            editor.setValue(initialActiveFile.content);
            lastSetModelPath.current = initialActiveFile.path; // Mark this path as set
            monacoInstance.editor.setModelLanguage(editor.getModel()!, getLanguageFromPath(initialActiveFile.path));
        } else {
            editor.setValue('// Open a file from the sidebar or File > Open Folder...');
            lastSetModelPath.current = null;
            monacoInstance.editor.setModelLanguage(editor.getModel()!, 'plaintext');
        }
        editor.getModel()?.pushStackElement(); // Reset undo stack


        // Attach the onChange listener - uses the state setter
        changeListenerDisposable.current = editor.onDidChangeModelContent(() => {
            // Call the memoized handler function
            handleInternalChange();
        });
        console.log("EditorDidMount: Attached onDidChangeModelContent listener.");

        // Add Ctrl+S Command
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            console.log(`[Ctrl+S Handler] Triggered.`); // DEBUG LOG
            const currentContent = editorRef.current?.getValue(); // Get current value directly
            const activeFileNow = getActiveFile(); // Re-check active file state

            // *** MODIFIED CHECK: Removed activeFileNow.isDirty ***
            // The saveActiveFile function in the context will handle saving
            // and resetting the dirty state on success. We just need to ensure
            // there's an active file and content to potentially save.
            if (activeFileNow && currentContent !== undefined) {
                 console.log(`[Ctrl+S Handler] Active file: ${activeFileNow.path}. Current dirty state in context: ${activeFileNow.isDirty}. Calling saveActiveFile...`); // DEBUG LOG
                 // Pass the CURRENT EDITOR content to the context save function
                 saveActiveFile(currentContent)
                    .then(() => {
                        console.log(`[Ctrl+S Handler] saveActiveFile promise resolved for ${activeFileNow.path}.`); // DEBUG LOG
                    })
                    .catch(err => {
                        console.error(`[Ctrl+S Handler] Error during save operation for ${activeFileNow.path}:`, err);
                        // Optionally display error to the user in the UI
                    });
            } else {
                console.log(`[Ctrl+S Handler] No active file or content unavailable. Cannot save.`); // DEBUG LOG
            }
         });

        editor.focus();

        // Cleanup
        return () => {
             console.log("Editor unmounting, disposing listener.");
             if (changeListenerDisposable.current) {
                 changeListenerDisposable.current.dispose();
                 changeListenerDisposable.current = null;
             }
             // Persist view state just before unmount? Or when switching tabs?
             // Let's do it when switching tabs (in the update effect)
             editorRef.current = null;
             monacoRef.current = null;
        };
    // Dependencies: Include functions from context, theme, and helpers
    }, [theme, getMonacoThemeName, getActiveFile, handleInternalChange, saveActiveFile, updateActiveFileDirtyState]); // Added context functions


    // --- Effect to UPDATE editor content when ACTIVE file changes ---
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;

        // --- Save View State of the PREVIOUS file ---
        const previousPath = lastSetModelPath.current;
        if (editor && previousPath && previousPath !== activeFile?.path) {
            const currentState = editor.saveViewState();
            viewStateCache.current.set(previousPath, currentState);
            console.log(`Saved view state for ${previousPath}`);
        }

        // --- Handle the NEW active file ---
        if (!editor || !monaco ) {
             console.log("Editor not ready, skipping active file update.");
             return;
        }

        // If no file is active, clear the editor
        if (!activeFile) {
            if (lastSetModelPath.current !== null) {
                console.log("No active file, clearing editor.");
                editor.setValue('');
                lastSetModelPath.current = null;
                monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
                editor.updateOptions({ readOnly: true }); // Make readonly when no file
            }
            return;
        }


        // Only update the editor's model if the active file path has actually changed
        // AND the file is not currently loading and has content
        if (activeFile.path !== lastSetModelPath.current && activeFile.content !== null && !activeFile.isLoading) {
            console.log(`Active file changed to ${activeFile.path}. Updating editor model.`);

            editor.setValue(activeFile.content);
            lastSetModelPath.current = activeFile.path; // Mark this path as the one displayed

             // Restore View State for the NEW active file
             const previousViewState = viewStateCache.current.get(activeFile.path);
             if (previousViewState) {
                 console.log(`Restoring view state for ${activeFile.path}`);
                 editor.restoreViewState(previousViewState);
             } else {
                  console.log(`No view state found for ${activeFile.path}, using default.`);
                  // Optionally reset scroll/cursor position if no state saved
                  editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
                  editor.setPosition({ lineNumber: 1, column: 1 });
             }


             // Update language model
             const newLanguage = getLanguageFromPath(activeFile.path);
             const model = editor.getModel();
             if (model && model.getLanguageId() !== newLanguage) {
                 monaco.editor.setModelLanguage(model, newLanguage);
                 console.log(`Editor language set to: ${newLanguage}`);
             }

             // Reset undo stack only if needed? Maybe not, let undo persist across tabs for now.
             // editor.getModel()?.pushStackElement();
             editor.focus(); // Focus editor when tab changes
        }

        // Update readOnly state based on active file's loading status or if no file is active
        const shouldBeReadOnly = activeFile.isLoading || !activeFile;
        if (editor.getOption(monaco.editor.EditorOption.readOnly) !== shouldBeReadOnly) {
             console.log(`Updating editor readOnly state to: ${shouldBeReadOnly}`);
             editor.updateOptions({ readOnly: shouldBeReadOnly });
        }

    // This effect now primarily reacts to the activeFile object changing
    }, [activeFile]);


    // Effect to update theme and font size
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (editor && monaco) {
            monaco.editor.setTheme(getMonacoThemeName(theme));
            editor.updateOptions({ fontSize: getEditorFontSize() });
        }
    }, [theme, getMonacoThemeName]);


    return (
        <div className="editor-panel" id="editor-panel-main"> {/* Added ID for potential aria-controls */}
            {/* Display Active File Error / Loading - Use CSS for styling */}
            {activeFile?.error && <div className="editor-context-error">Error: {activeFile.error}</div>}
            {activeFile?.isLoading && <div className="editor-loading-indicator">Loading...</div>}
            {/* Dirty indicator is now on the tab */}

            <MonacoEditor
                key={activeFilePath || 'no-file'} // Change key when file path changes to help reset state if needed? Careful.
                width="100%"
                height="100%"
                // Language is now dynamically set in the effect
                language={getLanguageFromPath(activeFilePath)} // Still useful for initial hint
                theme={getMonacoThemeName(theme)} // Theme set dynamically
                options={editorOptions}
                // Initial value when component mounts, if activeFile is available then
                value={activeFile?.content ?? ''}
                // onChange prop is technically redundant now since we use the internal listener, but keep it for react-monaco-editor's structure if needed
                onChange={handleInternalChange} // Can directly call the handler
                editorDidMount={editorDidMount}
            />
        </div>
    );
};

export default EditorPanel;
// --- END FILE: src/renderer/components/EditorPanel.tsx ---