// src/renderer/components/EditorPanel.tsx
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';
import WelcomeScreen from './WelcomeScreen';
import './WelcomeScreen.css';

// Helpers (getEditorFontSize, getCssVar, getLanguageFromPath) remain the same
const getEditorFontSize = (): number => { /* ... */ if (typeof document === 'undefined') return 13; try { const fontSizeValue = getComputedStyle(document.documentElement).getPropertyValue('--font-size-editor'); return parseInt(fontSizeValue?.replace('px', '').trim() || '13', 10); } catch (e) { console.warn("Could not get computed style for font size, using default.", e); return 13; } };
const getCssVar = (varName: string, fallback: string): string => { /* ... */ if (typeof document !== 'undefined') { try { return getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim() || fallback; } catch(e) { console.warn(`Could not get computed style for CSS var ${varName}, using fallback.`, e); return fallback; } } return fallback; };
const getLanguageFromPath = (filePath: string | null): string => { /* ... */ if (!filePath) return 'plaintext'; const extension = filePath.split('.').pop()?.toLowerCase(); switch (extension) { case 'js': case 'jsx': return 'javascript'; case 'ts': case 'tsx': return 'typescript'; case 'json': return 'json'; case 'css': return 'css'; case 'html': case 'htm': return 'html'; case 'md': case 'markdown': return 'markdown'; case 'py': return 'python'; case 'java': return 'java'; case 'c': case 'h': return 'c'; case 'cpp': case 'hpp': return 'cpp'; case 'cs': return 'csharp'; case 'sh': return 'shell'; case 'xml': return 'xml'; case 'yaml': case 'yml': return 'yaml'; case 'sql': return 'sql'; default: return 'plaintext'; } };

// --- Define Props Interface ---
interface EditorPanelProps {
    setCurrentFolderPath: (path: string | null) => void; // Expect the setter
}

// --- Apply Props Type to the Component ---
const EditorPanel: React.FC<EditorPanelProps> = ({ setCurrentFolderPath }) => { // <<< Use React.FC<EditorPanelProps>
    const { theme } = useTheme();
    const {
        openFiles,
        activeFilePath,
        getActiveFile,
        updateActiveFileDirtyState,
        saveActiveFile,
        setCursorPosition,
    } = useEditor();

    // Refs and other hooks remain the same
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const lastSetModelPath = useRef<string | null>(null);
    const changeListenerDisposable = useRef<monaco.IDisposable | null>(null);
    const cursorListenerDisposable = useRef<monaco.IDisposable | null>(null);
    const viewStateCache = useRef<Map<string, monaco.editor.ICodeEditorViewState | null>>(new Map());

    // Memoized values and callbacks (remain the same)
    const activeFile = useMemo(() => getActiveFile(), [getActiveFile]);
    const getMonacoThemeName = useCallback(/* ... */ (currentTheme: ThemeName): string => { switch (currentTheme) { case 'light': return 'vs'; case 'dark': return 'vs-dark'; case 'win95': return 'win95-monaco-theme'; case 'pipboy': return 'pipboy-monaco-theme'; case 'mirc': return 'mirc-monaco-theme'; case 'qbasic': return 'qbasic-monaco-theme'; case 'orange': return 'orange-monaco-theme'; case 'cga': return 'cga-monaco-theme'; case 'atari': return 'atari-monaco-theme'; case 'snes': return 'snes-monaco-theme'; case 'bw_tv': return 'bw-tv-monaco-theme'; default: return 'vs-dark'; } }, []);
    const editorOptions = useMemo(/* ... */ (): monaco.editor.IStandaloneEditorConstructionOptions => ({ selectOnLineNumbers: true, automaticLayout: true, fontFamily: 'var(--font-family-mono)', fontSize: getEditorFontSize(), minimap: { enabled: true }, wordWrap: 'on', scrollBeyondLastLine: false, readOnly: activeFile?.isLoading ?? !activeFile, }), [activeFile]);
    const handleInternalChange = useCallback(/* ... */ () => { const editor = editorRef.current; const currentModelValue = editor?.getValue(); if (editor && currentModelValue !== undefined) { updateActiveFileDirtyState(currentModelValue); } }, [updateActiveFileDirtyState]);
    const editorDidMount = useCallback(/* ... editorDidMount logic remains exactly the same ... */ ( editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco ) => { console.log('Editor mounted!'); editorRef.current = editor; monacoRef.current = monacoInstance; lastSetModelPath.current = null; viewStateCache.current.clear(); changeListenerDisposable.current?.dispose(); cursorListenerDisposable.current?.dispose(); const defineTheme = (name: string, base: 'vs' | 'vs-dark', cssVarPrefix: string, colorsOverride?: monaco.editor.IStandaloneThemeData['colors']) => { try { monacoInstance.editor.defineTheme(name, { base: base, inherit: true, rules: [], colors: { 'editor.background': getCssVar(`--${cssVarPrefix}-bg`, base === 'vs' ? '#ffffff' : '#1e1e1e'), 'editor.foreground': getCssVar(`--${cssVarPrefix}-text`, base === 'vs' ? '#000000' : '#d4d4d4'), 'editorCursor.foreground': getCssVar(`--${cssVarPrefix}-accent`, base === 'vs' ? '#000000' : '#aeafad'), 'editorLineNumber.foreground': getCssVar(`--${cssVarPrefix}-tertiary`, '#858585'), 'editorLineNumber.activeForeground': getCssVar(`--${cssVarPrefix}-secondary`, '#c6c6c6'), 'editor.selectionBackground': getCssVar(`--${cssVarPrefix}-selected-bg`, '#add6ff'), 'editor.selectionForeground': getCssVar(`--${cssVarPrefix}-selected-text`, '#000000'), 'editorWidget.background': getCssVar(`--${cssVarPrefix}-widget-bg`, base === 'vs' ? '#f3f3f3' : '#252526'), 'editorWidget.border': getCssVar(`--${cssVarPrefix}-border`, '#c8c8c8'), 'input.background': getCssVar(`--${cssVarPrefix}-input-bg`, base === 'vs' ? '#ffffff' : '#3c3c3c'), 'input.foreground': getCssVar(`--${cssVarPrefix}-input-text`, base === 'vs' ? '#000000' : '#d4d4d4'), 'input.border': getCssVar(`--${cssVarPrefix}-input-border`, '#bebebe'), ...(name === 'win95-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }), ...(name === 'mirc-monaco-theme' && { 'editor.selectionForeground': getCssVar('--color-text-inverse', '#ffffff') }), ...(name === 'pipboy-monaco-theme' && { 'editor.selectionForeground': getCssVar('--pipboy-bg', '#0a1a0f') }), ...(name === 'qbasic-monaco-theme' && { 'editor.selectionForeground': getCssVar('--qbasic-white', '#FFFFFF') }), ...(name === 'orange-monaco-theme' && { 'editor.selectionForeground': getCssVar('--orange-dark', '#201500') }), ...(name === 'cga-monaco-theme' && { 'editor.selectionForeground': getCssVar('--cga-black', '#000000') }), ...(name === 'atari-monaco-theme' && { 'editor.selectionForeground': getCssVar('--atari-black', '#000000') }), ...(name === 'snes-monaco-theme' && { 'editor.selectionForeground': getCssVar('--snes-bg', '#2F2F4F') }), ...(name === 'bw-tv-monaco-theme' && { 'editor.selectionForeground': getCssVar('--bw-black', '#000000') }), ...colorsOverride } }); } catch (error) { console.error(`Failed to define Monaco theme '${name}':`, error); } }; defineTheme('pipboy-monaco-theme', 'vs-dark', 'pipboy', { /* ... */ }); defineTheme('win95-monaco-theme', 'vs', 'win95', { /* ... */ }); defineTheme('mirc-monaco-theme', 'vs', 'mirc', { /* ... */ }); defineTheme('qbasic-monaco-theme', 'vs-dark', 'qbasic', { /* ... */ }); defineTheme('orange-monaco-theme', 'vs-dark', 'orange', { /* ... */ }); defineTheme('cga-monaco-theme', 'vs-dark', 'cga', { /* ... */ }); defineTheme('atari-monaco-theme', 'vs-dark', 'atari', { /* ... */ }); defineTheme('snes-monaco-theme', 'vs-dark', 'snes', { /* ... */ }); defineTheme('bw-tv-monaco-theme', 'vs-dark', 'bw-tv', { /* ... */ }); monacoInstance.editor.setTheme(getMonacoThemeName(theme)); editor.updateOptions({ fontSize: getEditorFontSize() }); const initialActiveFile = getActiveFile(); if (openFiles.length > 0 && initialActiveFile && initialActiveFile.content !== null) { editor.setValue(initialActiveFile.content); lastSetModelPath.current = initialActiveFile.path; monacoInstance.editor.setModelLanguage(editor.getModel()!, getLanguageFromPath(initialActiveFile.path)); const initialPosition = editor.getPosition(); if (initialPosition) setCursorPosition(initialPosition); editor.getModel()?.pushStackElement(); editor.focus(); } else if (openFiles.length > 0) { editor.setValue('// Loading file...'); lastSetModelPath.current = null; monacoInstance.editor.setModelLanguage(editor.getModel()!, 'plaintext'); setCursorPosition(null); } changeListenerDisposable.current = editor.onDidChangeModelContent(() => { if (openFiles.length > 0) { handleInternalChange(); } }); cursorListenerDisposable.current = editor.onDidChangeCursorPosition((e) => { if (openFiles.length > 0) { if (e.position) setCursorPosition(e.position); else setCursorPosition(null); } else { setCursorPosition(null); } }); editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => { if (openFiles.length > 0) { const currentContent = editorRef.current?.getValue(); const activeFileNow = getActiveFile(); if (activeFileNow && currentContent !== undefined) { saveActiveFile(currentContent).catch(err => { console.error(`[Ctrl+S Handler] Error during save:`, err); }); } } }); return () => { changeListenerDisposable.current?.dispose(); cursorListenerDisposable.current?.dispose(); editorRef.current = null; monacoRef.current = null; }; }, [theme, getMonacoThemeName, getActiveFile, handleInternalChange, saveActiveFile, updateActiveFileDirtyState, setCursorPosition, openFiles]);

    // Effect to update editor content (remains the same)
    useEffect(() => { if (openFiles.length === 0) { if (lastSetModelPath.current !== null) lastSetModelPath.current = null; return; } const editor = editorRef.current; const monaco = monacoRef.current; const previousPath = lastSetModelPath.current; if (editor && previousPath && previousPath !== activeFile?.path) { const currentState = editor.saveViewState(); viewStateCache.current.set(previousPath, currentState); } if (!editor || !monaco ) { return; } if (!activeFile) { if (lastSetModelPath.current !== null) { editor.setValue(''); lastSetModelPath.current = null; monaco.editor.setModelLanguage(editor.getModel()!, 'plaintext'); editor.updateOptions({ readOnly: true }); setCursorPosition(null); } return; } if (activeFile.path !== lastSetModelPath.current && activeFile.content !== null && !activeFile.isLoading) { editor.setValue(activeFile.content); lastSetModelPath.current = activeFile.path; const previousViewState = viewStateCache.current.get(activeFile.path); if (previousViewState) { editor.restoreViewState(previousViewState); } else { editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 }); editor.setPosition({ lineNumber: 1, column: 1 }); } const currentPosition = editor.getPosition(); if (currentPosition) setCursorPosition(currentPosition); const newLanguage = getLanguageFromPath(activeFile.path); const model = editor.getModel(); if (model && model.getLanguageId() !== newLanguage) { monaco.editor.setModelLanguage(model, newLanguage); } editor.focus(); } const shouldBeReadOnly = activeFile.isLoading || !activeFile.path; if (editor.getOption(monaco.editor.EditorOption.readOnly) !== shouldBeReadOnly) { editor.updateOptions({ readOnly: shouldBeReadOnly }); } }, [activeFile, setCursorPosition, openFiles]);

    // Effect to update theme/font (remains the same)
    useEffect(() => { if (openFiles.length === 0) return; const editor = editorRef.current; const monaco = monacoRef.current; if (editor && monaco) { monaco.editor.setTheme(getMonacoThemeName(theme)); editor.updateOptions({ fontSize: getEditorFontSize() }); } }, [theme, getMonacoThemeName, openFiles]);


    return (
        <div className="editor-panel" id="editor-panel-main">
            {openFiles.length === 0 ? (
                // Pass the setter down to WelcomeScreen
                <WelcomeScreen setCurrentFolderPath={setCurrentFolderPath} />
            ) : (
                <>
                    {activeFile?.error && <div className="editor-context-error">Error: {activeFile.error}</div>}
                    {activeFile?.isLoading && <div className="editor-loading-indicator">Loading...</div>}
                    <MonacoEditor
                        key={activeFilePath || 'editor-active'}
                        width="100%"
                        height="100%"
                        language={getLanguageFromPath(activeFilePath)}
                        theme={getMonacoThemeName(theme)}
                        options={editorOptions}
                        value={activeFile?.content ?? ''}
                        editorDidMount={editorDidMount}
                    />
                </>
            )}
        </div>
    );
};

export default EditorPanel;