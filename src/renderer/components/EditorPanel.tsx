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


// --- Define Props Interface ---
interface EditorPanelProps {
    setCurrentFolderPath: (path: string | null) => void;
}

// --- Apply Props Type to the Component ---
const EditorPanel: React.FC<EditorPanelProps> = ({ setCurrentFolderPath }) => {
    const { theme } = useTheme(); // Get the CURRENT theme from context
    const {
        openFiles,
        activeFilePath,
        getActiveFile,
        updateActiveFileDirtyState,
        saveActiveFile,
        setCursorPosition,
    } = useEditor();

    // Refs remain the same
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const lastSetModelPath = useRef<string | null>(null);
    const changeListenerDisposable = useRef<monaco.IDisposable | null>(null);
    const cursorListenerDisposable = useRef<monaco.IDisposable | null>(null);
    const viewStateCache = useRef<Map<string, monaco.editor.ICodeEditorViewState | null>>(new Map());

    // Memoized values and callbacks
    const activeFile = useMemo(() => getActiveFile(), [getActiveFile]);

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
            default: return 'vs-dark'; // Default fallback
        }
    }, []);

    const editorOptions = useMemo((): monaco.editor.IStandaloneEditorConstructionOptions => ({
        selectOnLineNumbers: true,
        automaticLayout: true, // Necessary for editor to resize correctly
        fontFamily: 'var(--font-family-mono)',
        fontSize: getEditorFontSize(), // Gets current font size
        minimap: { enabled: true },
        wordWrap: 'on', // Or 'off' based on preference
        scrollBeyondLastLine: false,
        readOnly: activeFile?.isLoading ?? !activeFile, // Set readOnly based on file state
    }), [activeFile]); // Recompute if activeFile changes (for readOnly state)

    const handleInternalChange = useCallback(() => {
        const editor = editorRef.current;
        const currentModelValue = editor?.getValue();
        if (editor && currentModelValue !== undefined) {
            // Delegate dirty check to context
            updateActiveFileDirtyState(currentModelValue);
        }
    }, [updateActiveFileDirtyState]);

    // --- EDITOR DID MOUNT ---
    const editorDidMount = useCallback((
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        console.log('Editor mounted!');
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        lastSetModelPath.current = null; // Reset last path ref
        viewStateCache.current.clear(); // Clear view state cache

        // Dispose previous listeners if any (important for potential re-mounts)
        changeListenerDisposable.current?.dispose();
        cursorListenerDisposable.current?.dispose();

        // --- Define Themes (using getCssVar) ---
        // This function defines a Monaco theme based on CSS variables
        const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
            try {
                // Define base colors using CSS variables with fallbacks
                const colors: monaco.editor.IStandaloneThemeData['colors'] = {
                    'editor.background': getCssVar(`--color-bg-editor`, base === 'vs' ? '#ffffff' : '#1e1e1e'),
                    'editor.foreground': getCssVar(`--color-text-primary`, base === 'vs' ? '#000000' : '#d4d4d4'),
                    'editorCursor.foreground': getCssVar(`--color-text-accent`, base === 'vs' ? '#000000' : '#aeafad'),
                    'editorLineNumber.foreground': getCssVar(`--color-text-tertiary`, '#858585'),
                    'editorLineNumber.activeForeground': getCssVar(`--color-text-secondary`, '#c6c6c6'),
                    'editor.selectionBackground': getCssVar(`--color-bg-selected`, '#add6ff'),
                    // Ensure selection foreground contrasts with selection background
                    'editor.selectionForeground': getCssVar(`--color-text-inverse`, '#000000'),
                    'editorWidget.background': getCssVar(`--color-bg-sidebar`, base === 'vs' ? '#f3f3f3' : '#252526'), // Use sidebar or another appropriate bg
                    'editorWidget.border': getCssVar(`--color-border`, '#c8c8c8'),
                    'input.background': getCssVar(`--color-bg-input`, base === 'vs' ? '#ffffff' : '#3c3c3c'),
                    'input.foreground': getCssVar(`--color-text-primary`, base === 'vs' ? '#000000' : '#d4d4d4'),
                    'input.border': getCssVar(`--color-border-input`, '#bebebe'),
                     // Apply specific overrides for themes where selection needs different text color
                     ...(name === 'win95-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }),
                     ...(name === 'mirc-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }),
                     ...(name === 'pipboy-monaco-theme' && { 'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'), }),
                     ...(name === 'qbasic-monaco-theme' && { 'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.background': getCssVar('--qbasic-blue', '#0000AA'), 'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'), 'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'), }),
                     ...(name === 'orange-monaco-theme' && { 'editor.selectionForeground': getCssVar('--orange-dark', '#201500'), 'editor.background': getCssVar('--orange-dark', '#201500'), 'editor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'), }),
                     ...(name === 'cga-monaco-theme' && { 'editor.selectionForeground': getCssVar('--cga-black', '#000000'), 'editor.background': getCssVar('--cga-black', '#000000'), 'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'), 'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'), }),
                     ...(name === 'atari-monaco-theme' && { 'editor.selectionForeground': getCssVar('--atari-black', '#000000'), 'editor.background': getCssVar('--atari-black', '#000000'), 'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'), 'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'), }),
                     ...(name === 'snes-monaco-theme' && { 'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F'), 'editor.background': getCssVar('--snes-bg', '#2F2F4F'), 'editor.foreground': getCssVar('--snes-text', '#E0E0FF'), 'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), 'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'), }),
                     ...(name === 'bw-tv-monaco-theme' && { 'editor.selectionForeground': getCssVar('--bw-black', '#000000'), 'editor.background': getCssVar('--bw-black', '#000000'), 'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'), 'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'), 'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'), }),
                     ...colorsOverride // Apply any passed-in overrides
                };

                monacoInstance.editor.defineTheme(name, {
                   base: base,
                   inherit: true, // Inherit rules (like syntax highlighting) from base
                   rules: [], // Keep syntax highlighting rules empty (as it's broken)
                   colors: colors // Apply the computed colors
                });
                console.log(`Defined Monaco theme: ${name}`);
             } catch (error) { console.error(`Failed to define Monaco theme '${name}':`, error); }
         };

        // Define all custom themes using current CSS var values at mount time
        defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy');
        defineTheme('win95-monaco-theme', 'vs', 'win95');
        defineTheme('mirc-monaco-theme', 'vs', 'mirc');
        defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic');
        defineTheme('orange-monaco-theme', 'vs-dark', 'orange');
        defineTheme('cga-monaco-theme', 'vs-dark', 'cga');
        defineTheme('atari-monaco-theme', 'vs-dark', 'atari');
        defineTheme('snes-monaco-theme', 'vs-dark', 'snes');
        defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv');
        // Ensure base themes 'vs' and 'vs-dark' are available implicitly

        // --- Set the initial theme based on CURRENT context value ---
        // Read theme from context *when the editor mounts*
        const currentGlobalTheme = theme;
        const monacoThemeToSet = getMonacoThemeName(currentGlobalTheme);
        console.log(`EditorDidMount: Setting Monaco theme to: ${monacoThemeToSet} (based on global theme: ${currentGlobalTheme})`);
        monacoInstance.editor.setTheme(monacoThemeToSet);
        // --- End Initial Theme Set ---

        // Set initial font size
        editor.updateOptions({ fontSize: getEditorFontSize() });

        // Set initial editor value if files are open
        const initialActiveFile = getActiveFile();
        if (openFiles.length > 0 && initialActiveFile && initialActiveFile.content !== null) {
            console.log(`EditorDidMount: Setting initial model value for ${initialActiveFile.path}`);
            editor.setValue(initialActiveFile.content);
            lastSetModelPath.current = initialActiveFile.path;
            monacoInstance.editor.setModelLanguage(editor.getModel()!, getLanguageFromPath(initialActiveFile.path));
            // Restore view state or set default position
            const previousViewState = viewStateCache.current.get(initialActiveFile.path);
            if (previousViewState) {
                editor.restoreViewState(previousViewState);
            } else {
                editor.setPosition({ lineNumber: 1, column: 1 });
            }
            const currentPosition = editor.getPosition();
            if (currentPosition) setCursorPosition(currentPosition);
            editor.getModel()?.pushStackElement(); // Set initial undo point
            editor.focus();
        } else if (openFiles.length > 0) {
            // Case where files are open, but initial active file is loading/null
            editor.setValue('// Loading file...');
            lastSetModelPath.current = null;
            monacoInstance.editor.setModelLanguage(editor.getModel()!, 'plaintext');
            setCursorPosition(null);
        }
        // If openFiles is empty, WelcomeScreen is shown, no need to set value

        // Attach onChange listener
        changeListenerDisposable.current = editor.onDidChangeModelContent(() => {
            if (openFiles.length > 0) { handleInternalChange(); }
        });
        console.log("EditorDidMount: Attached onDidChangeModelContent listener.");

        // Attach onCursor listener
        cursorListenerDisposable.current = editor.onDidChangeCursorPosition((e) => {
            if (openFiles.length > 0) {
                setCursorPosition(e.position ? e.position : null);
            } else {
                setCursorPosition(null);
            }
        });
        console.log("EditorDidMount: Attached onDidChangeCursorPosition listener.");

        // Add Ctrl+S Command
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (openFiles.length > 0) {
                console.log(`[Ctrl+S Handler] Triggered.`);
                const currentContent = editorRef.current?.getValue();
                const activeFileNow = getActiveFile();
                if (activeFileNow && currentContent !== undefined) {
                    console.log(`[Ctrl+S Handler] Calling saveActiveFile for ${activeFileNow.path}.`);
                    saveActiveFile(currentContent)
                        .catch(err => { console.error(`[Ctrl+S Handler] Error during save:`, err); });
                } else {
                    console.log(`[Ctrl+S Handler] No active file or content unavailable.`);
                }
            } else {
                console.log(`[Ctrl+S Handler] No files open. Cannot save.`);
            }
         });
        console.log("EditorDidMount: Added Ctrl+S command.");

        // Cleanup function for when the component unmounts
        return () => {
             console.log("Editor unmounting, disposing listeners.");
             changeListenerDisposable.current?.dispose();
             cursorListenerDisposable.current?.dispose();
             // Don't null out refs here if component can remount,
             // but ensure listeners are cleaned up.
             // editorRef.current = null;
             // monacoRef.current = null;
        };
        // Dependencies for useCallback - include everything used inside
        }, [theme, getMonacoThemeName, getActiveFile, handleInternalChange, saveActiveFile, updateActiveFileDirtyState, setCursorPosition, openFiles]); // Add theme here


    // --- Effect to update editor content when ACTIVE file changes ---
    useEffect(() => {
        // Skip if no files are open (Welcome screen is showing)
        if (openFiles.length === 0) {
             if (lastSetModelPath.current !== null) lastSetModelPath.current = null; // Reset ref if needed
             return;
        }

        const editor = editorRef.current;
        const monaco = monacoRef.current;

        // Save view state of the previous file before switching
        const previousPath = lastSetModelPath.current;
        if (editor && previousPath && previousPath !== activeFile?.path) {
            const currentState = editor.saveViewState();
            if (currentState) { // Only save if not null
                viewStateCache.current.set(previousPath, currentState);
                console.log(`Saved view state for ${previousPath}`);
            } else {
                 console.log(`Could not save view state for ${previousPath}`);
            }
        }

        // Ensure editor is ready
        if (!editor || !monaco ) {
             console.log("Editor not ready, skipping active file update.");
             return;
        }

        // Handle case where active file becomes null (e.g., closing last tab)
        if (!activeFile) {
            if (lastSetModelPath.current !== null) {
                console.log("Active file is now null. Clearing editor display.");
                editor.setValue(''); // Clear display
                lastSetModelPath.current = null;
                monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
                editor.updateOptions({ readOnly: true });
                setCursorPosition(null);
            }
            return;
        }

        // Update editor only if path changed AND content is loaded
        if (activeFile.path !== lastSetModelPath.current && activeFile.content !== null && !activeFile.isLoading) {
            console.log(`Active file changed to ${activeFile.path}. Updating editor model.`);

            editor.setValue(activeFile.content); // Set the new content
            lastSetModelPath.current = activeFile.path; // Update the ref

             // Restore view state or set default position
             const previousViewState = viewStateCache.current.get(activeFile.path);
             if (previousViewState) {
                 console.log(`Restoring view state for ${activeFile.path}`);
                 editor.restoreViewState(previousViewState);
             } else {
                  console.log(`No view state found for ${activeFile.path}, setting default position.`);
                  editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
                  editor.setPosition({ lineNumber: 1, column: 1 });
             }

             // Update cursor position context
             const currentPosition = editor.getPosition();
             setCursorPosition(currentPosition ? currentPosition : null);

             // Update language model
             const newLanguage = getLanguageFromPath(activeFile.path);
             const model = editor.getModel();
             if (model && model.getLanguageId() !== newLanguage) {
                 monaco.editor.setModelLanguage(model, newLanguage);
                 console.log(`Editor language set to: ${newLanguage}`);
             }

             // Ensure editor has focus after switching
             editor.focus();

        } else if (activeFile.path === lastSetModelPath.current) {
             // Path didn't change, do nothing regarding model value
             console.log(`Active file path ${activeFile.path} hasn't changed, skipping model update.`);
        } else {
             // Path changed, but content isn't ready yet
             console.log(`Active file changed to ${activeFile.path} BUT content is null or loading. Deferring editor model update.`);
             // Optionally show a temporary loading state in the editor itself:
             // if (lastSetModelPath.current !== activeFile.path) { // Avoid flicker if already loading
             //     editor.setValue(`// Loading ${activeFile.path}...`);
             //     lastSetModelPath.current = activeFile.path; // Update ref even while loading
             //     monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext');
             // }
        }

        // Always update readOnly state based on latest activeFile status
        const shouldBeReadOnly = activeFile.isLoading || !activeFile.path;
        if (editor.getOption(monaco.editor.EditorOption.readOnly) !== shouldBeReadOnly) {
             console.log(`Updating editor readOnly state to: ${shouldBeReadOnly}`);
             editor.updateOptions({ readOnly: shouldBeReadOnly });
        }

    // Dependencies: Run when the active file object changes or when the list of open files changes
    }, [activeFile, openFiles, setCursorPosition]);


    // --- Effect to update theme and font size ON CHANGE ---
    useEffect(() => {
        const editor = editorRef.current;
        const monacoInstance = monacoRef.current; // Get instance from ref

        // --- ADD NULL CHECK HERE ---
        // Only proceed if editor AND monaco instance exist AND files are open
        if (editor && monacoInstance && openFiles.length > 0) {
        // --- END NULL CHECK ---

            const newMonacoTheme = getMonacoThemeName(theme);
            console.log(`Theme/Font Effect: Setting Monaco theme to ${newMonacoTheme} and updating font size.`);

            // --- Re-Define Themes When Global Theme Changes ---
            // Using a local helper function here for clarity
            const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => {
                 try {
                    // Define base colors using CSS variables with fallbacks
                    const colors: monaco.editor.IStandaloneThemeData['colors'] = {
                        'editor.background': getCssVar(`--color-bg-editor`, base === 'vs' ? '#ffffff' : '#1e1e1e'),
                        'editor.foreground': getCssVar(`--color-text-primary`, base === 'vs' ? '#000000' : '#d4d4d4'),
                        'editorCursor.foreground': getCssVar(`--color-text-accent`, base === 'vs' ? '#000000' : '#aeafad'),
                        'editorLineNumber.foreground': getCssVar(`--color-text-tertiary`, '#858585'),
                        'editorLineNumber.activeForeground': getCssVar(`--color-text-secondary`, '#c6c6c6'),
                        'editor.selectionBackground': getCssVar(`--color-bg-selected`, '#add6ff'),
                        'editor.selectionForeground': getCssVar(`--color-text-inverse`, '#000000'),
                        'editorWidget.background': getCssVar(`--color-bg-sidebar`, base === 'vs' ? '#f3f3f3' : '#252526'),
                        'editorWidget.border': getCssVar(`--color-border`, '#c8c8c8'),
                        'input.background': getCssVar(`--color-bg-input`, base === 'vs' ? '#ffffff' : '#3c3c3c'),
                        'input.foreground': getCssVar(`--color-text-primary`, base === 'vs' ? '#000000' : '#d4d4d4'),
                        'input.border': getCssVar(`--color-border-input`, '#bebebe'),
                         // Apply specific overrides
                         ...(name === 'win95-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }),
                         ...(name === 'mirc-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }),
                         ...(name === 'pipboy-monaco-theme' && { 'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.background': getCssVar('--pipboy-bg', '#0a1a0f'), 'editor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editorCursor.foreground': getCssVar('--pipboy-green', '#15ff60'), 'editor.selectionBackground': getCssVar('--pipboy-green-dark', '#10b445'), }),
                         ...(name === 'qbasic-monaco-theme' && { 'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.background': getCssVar('--qbasic-blue', '#0000AA'), 'editor.foreground': getCssVar('--qbasic-yellow', '#FFFF55'), 'editorCursor.foreground': getCssVar('--qbasic-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--qbasic-dark-gray', '#555555'), }),
                         ...(name === 'orange-monaco-theme' && { 'editor.selectionForeground': getCssVar('--orange-dark', '#201500'), 'editor.background': getCssVar('--orange-dark', '#201500'), 'editor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editorCursor.foreground': getCssVar('--orange-bright', '#FFA500'), 'editor.selectionBackground': getCssVar('--orange-medium', '#D98C00'), }),
                         ...(name === 'cga-monaco-theme' && { 'editor.selectionForeground': getCssVar('--cga-black', '#000000'), 'editor.background': getCssVar('--cga-black', '#000000'), 'editor.foreground': getCssVar('--cga-cyan', '#55FFFF'), 'editorCursor.foreground': getCssVar('--cga-white', '#FFFFFF'), 'editor.selectionBackground': getCssVar('--cga-cyan', '#55FFFF'), }),
                         ...(name === 'atari-monaco-theme' && { 'editor.selectionForeground': getCssVar('--atari-black', '#000000'), 'editor.background': getCssVar('--atari-black', '#000000'), 'editor.foreground': getCssVar('--atari-cyan', '#3FFFCF'), 'editorCursor.foreground': getCssVar('--atari-orange', '#D87050'), 'editor.selectionBackground': getCssVar('--atari-orange', '#D87050'), }),
                         ...(name === 'snes-monaco-theme' && { 'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F'), 'editor.background': getCssVar('--snes-bg', '#2F2F4F'), 'editor.foreground': getCssVar('--snes-text', '#E0E0FF'), 'editorCursor.foreground': getCssVar('--snes-accent4', '#E0E040'), 'editor.selectionBackground': getCssVar('--snes-accent1', '#8080FF'), }),
                         ...(name === 'bw-tv-monaco-theme' && { 'editor.selectionForeground': getCssVar('--bw-black', '#000000'), 'editor.background': getCssVar('--bw-black', '#000000'), 'editor.foreground': getCssVar('--bw-light-gray', '#cccccc'), 'editorCursor.foreground': getCssVar('--bw-white', '#ffffff'), 'editor.selectionBackground': getCssVar('--bw-light-gray', '#cccccc'), }),
                         ...colorsOverride
                    };
                    monacoInstance.editor.defineTheme(name, { base, inherit: true, rules: [], colors });
                 } catch (error) { console.error(`Failed to re-define Monaco theme '${name}':`, error); }
            };

            // Re-define all themes to pick up potentially changed CSS vars
            defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy');
            defineTheme('win95-monaco-theme', 'vs', 'win95');
            defineTheme('mirc-monaco-theme', 'vs', 'mirc');
            defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic');
            defineTheme('orange-monaco-theme', 'vs-dark', 'orange');
            defineTheme('cga-monaco-theme', 'vs-dark', 'cga');
            defineTheme('atari-monaco-theme', 'vs-dark', 'atari');
            defineTheme('snes-monaco-theme', 'vs-dark', 'snes');
            defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv');
            // --- End Re-Define ---

            // Set the currently selected theme name
            monacoInstance.editor.setTheme(newMonacoTheme);

            // Update font size
            editor.updateOptions({ fontSize: getEditorFontSize() });
        } else {
            // Optional: Log if the effect runs but skips due to null refs or no open files
            // console.log("Theme/Font Effect: Skipped (editor/monaco null or no files open)");
        }
    // Dependencies: React to changes in the global theme or the open files list
    }, [theme, getMonacoThemeName, openFiles]); // Dependencies remain the same

    return (
        <div className="editor-panel" id="editor-panel-main">
            {openFiles.length === 0 ? (
                // Pass the setter down to WelcomeScreen
                <WelcomeScreen setCurrentFolderPath={setCurrentFolderPath} />
            ) : (
                <>
                    {/* Indicators shown only when editor is active */}
                    {activeFile?.error && <div className="editor-context-error">Error: {activeFile.error}</div>}
                    {activeFile?.isLoading && <div className="editor-loading-indicator">Loading...</div>}

                    <MonacoEditor
                        key={activeFilePath || 'editor-active'} // Change key to force remount if needed? Maybe not necessary.
                        width="100%"
                        height="100%"
                        language={getLanguageFromPath(activeFilePath)}
                        // Theme prop is less critical now, but keep it consistent
                        theme={getMonacoThemeName(theme)}
                        options={editorOptions}
                        // Value is controlled by the useEffect hook reacting to activeFile
                        value={activeFile?.content ?? ''} // Default to empty string if content is null
                        editorDidMount={editorDidMount}
                        // onChange prop is redundant due to internal listener, can be removed
                        // onChange={handleInternalChange}
                    />
                </>
            )}
        </div>
    );
};

export default EditorPanel;