// --- START FILE: src/renderer/contexts/EditorContext.tsx ---
import React, {
    createContext,
    useState,
    useContext,
    ReactNode,
    useCallback,
    useMemo,
} from 'react';
import path from 'path-browserify'; // Import path for basename in close confirmation

import type { ReadFileResponse, SaveFileResponse } from '../../shared.types';

// Define the structure for an open file
export interface OpenFile {
    path: string;
    content: string | null; // Content from last load/save
    isDirty: boolean;
    isLoading: boolean;
    error: string | null;
}

// Define the structure for cursor position
export interface CursorPosition {
    lineNumber: number;
    column: number;
}

interface EditorContextProps {
    openFiles: OpenFile[]; // Array of open files
    activeFilePath: string | null; // Path of the currently active file/tab
    cursorPosition: CursorPosition | null; // Track cursor position
    openOrFocusFile: (filePath: string) => Promise<void>; // Opens a new file or focuses existing tab
    closeFile: (filePath: string) => void; // Closes a tab/file
    setActiveFile: (filePath: string | null) => void; // Switches active tab
    updateActiveFileDirtyState: (currentEditorContent: string) => void; // Updates dirty flag ONLY for the active file
    saveActiveFile: (currentEditorContent: string) => Promise<void>; // Saves the currently active file's provided content
    getActiveFile: () => OpenFile | undefined; // Helper to get the active file object
    setCursorPosition: (position: CursorPosition | null) => void; // Setter for cursor position
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

interface EditorProviderProps {
    children: ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);

    const getActiveFile = useCallback((): OpenFile | undefined => {
        return openFiles.find(f => f.path === activeFilePath);
    }, [openFiles, activeFilePath]);

    const setActiveFile = useCallback((filePath: string | null) => {
        if (filePath !== activeFilePath) {
            console.log(`EditorContext: Setting active file path to: ${filePath}`);
            setActiveFilePath(filePath);
            setCursorPosition(null);
        }
    }, [activeFilePath]);

    const openOrFocusFile = useCallback(async (filePath: string) => {
        console.log(`EditorContext: Request to open or focus file - ${filePath}`);
        const existingFile = openFiles.find(f => f.path === filePath);
        if (existingFile) {
            console.log(`EditorContext: File ${filePath} already open, focusing.`);
            setActiveFile(filePath);
            return;
        }
        console.log(`EditorContext: File ${filePath} not open, adding new entry and loading.`);
        const newFileEntry: OpenFile = { path: filePath, content: null, isDirty: false, isLoading: true, error: null };
        setOpenFiles(prevFiles => [...prevFiles, newFileEntry]);
        setActiveFile(filePath);
        try {
            const response: ReadFileResponse = await window.electronAPI.fs_readFile(filePath);
            if (response.success) {
                console.log(`EditorContext: File loaded successfully - ${filePath}`);
                setOpenFiles(currentFiles => {
                     const updatedFiles = currentFiles.map(file =>
                        file.path === filePath
                            ? { ...file, content: response.content, isLoading: false, error: null, isDirty: false }
                            : file
                     );
                     console.log(`[EditorContext -> openOrFocusFile -> success] State update executed for ${filePath}. isLoading should be false.`);
                     return updatedFiles;
                 });
            } else {
                console.error(`EditorContext: Failed to read file ${filePath}:`, response.error);
                 setOpenFiles(currentFiles => currentFiles.map(file =>
                    file.path === filePath
                        ? { ...file, content: `// Error: ${response.error}`, isLoading: false, error: `Load Error: ${response.error}`, isDirty: false }
                        : file
                 ));
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext: IPC Error reading file ${filePath}:`, errorMsg);
             setOpenFiles(currentFiles => currentFiles.map(file =>
                file.path === filePath
                    ? { ...file, content: `// IPC Error: ${errorMsg}`, isLoading: false, error: `IPC Error: ${errorMsg}`, isDirty: false }
                    : file
             ));
        }
    }, [openFiles, activeFilePath, setActiveFile]);

    const closeFile = useCallback((filePath: string) => {
        console.log(`EditorContext: Request to close file - ${filePath}`);
        const currentOpenFiles = openFiles;
        const fileToClose = currentOpenFiles.find(f => f.path === filePath);
        const fileToCloseIndex = currentOpenFiles.findIndex(f => f.path === filePath);
        if (!fileToClose) return;
        if (fileToClose.isDirty) {
             const confirmClose = window.confirm(`File "${path.basename(fileToClose.path)}" has unsaved changes. Close anyway?`);
             if (!confirmClose) {
                 console.log(`EditorContext: Close cancelled for dirty file ${filePath}.`);
                 return;
             }
             console.warn(`EditorContext: Closing dirty file ${filePath} without saving.`);
        }
        const remainingFiles = currentOpenFiles.filter(f => f.path !== filePath);
        setOpenFiles(remainingFiles);
        if (activeFilePath === filePath) {
            let nextActivePath: string | null = null;
            if (remainingFiles.length > 0) {
                const nextIndex = Math.min(remainingFiles.length - 1, Math.max(0, fileToCloseIndex -1));
                 nextActivePath = remainingFiles[nextIndex]?.path || null;
            }
            setActiveFile(nextActivePath);
        }
    }, [openFiles, activeFilePath, setActiveFile]);

    const updateActiveFileDirtyState = useCallback((currentEditorContent: string) => {
        const currentActivePath = activeFilePath;
        if (!currentActivePath) return;
        setOpenFiles(currentFiles => {
            const activeFileIndex = currentFiles.findIndex(f => f.path === currentActivePath);
            if (activeFileIndex === -1) {
                 console.warn(`[updateActiveFileDirtyState] Active file path ${currentActivePath} not found in state.`);
                 return currentFiles;
            }
            const activeFile = currentFiles[activeFileIndex];
            if (activeFile.content === null || activeFile.isLoading) {
                 console.log(`[updateActiveFileDirtyState] Skipping dirty check for ${currentActivePath}, content not loaded or is loading.`);
                 return currentFiles;
            }
            const shouldBeDirty = currentEditorContent !== activeFile.content;
            console.log(`[updateActiveFileDirtyState] Comparing for ${currentActivePath}: Editor content (len ${currentEditorContent.length}) !== Context content (len ${activeFile.content.length})? Result: ${shouldBeDirty}. Current state isDirty: ${activeFile.isDirty}`);
            if (activeFile.isDirty !== shouldBeDirty) {
                console.log(`[updateActiveFileDirtyState] *** State Change Needed *** Setting dirty state for ${currentActivePath} to ${shouldBeDirty}`);
                return currentFiles.map((file, index) =>
                    index === activeFileIndex ? { ...file, isDirty: shouldBeDirty } : file
                );
            }
            return currentFiles;
        });
    }, [activeFilePath]);

    // *** MODIFIED saveActiveFile ***
    const saveActiveFile = useCallback(async (currentEditorContent: string) => {
        const currentActiveFilePath = activeFilePath;
        const currentOpenFiles = openFiles;

        const activeFile = currentOpenFiles.find(f => f.path === currentActiveFilePath);

        console.log(`[EditorContext -> saveActiveFile] Called for path: ${activeFile?.path}.`);
        console.log(`[EditorContext -> saveActiveFile] Content passed from EditorPanel (length: ${currentEditorContent?.length}):`, currentEditorContent?.substring(0, 50) + '...');

        // *** SIMPLIFIED CHECK: Only ensure we found *an* active file object ***
        if (!activeFile) {
            console.warn(`EditorContext [saveActiveFile]: Cannot save. No active file object found for path: ${currentActiveFilePath}.`);
            // Maybe set a general error? This case shouldn't happen if activeFilePath is valid.
            return;
        }

        // *** Log the state we *do* have, even if we don't block on it anymore ***
        console.log(`[EditorContext -> saveActiveFile] State of active file (${activeFile.path}) at save time: isLoading=${activeFile.isLoading}, contentIsNull=${activeFile.content === null}, isDirty=${activeFile.isDirty}`);

        // Check if save is needed (content changed or already dirty)
        // We still need activeFile.content for this comparison, but if it's null, the comparison will likely proceed (which is okay)
        // Let's add a specific log for this check
        const isContentSame = activeFile.content !== null && currentEditorContent === activeFile.content;
        console.log(`[EditorContext -> saveActiveFile] Checking if save needed: isContentSame=${isContentSame}, isDirty=${activeFile.isDirty}`);
        if (isContentSame && !activeFile.isDirty) {
             console.log(`EditorContext [saveActiveFile]: Content for ${activeFile.path} has not changed and not dirty. Skipping save.`);
             return;
        }

        console.log(`EditorContext [saveActiveFile]: Request to save file - ${activeFile.path}`);
        const targetPath = activeFile.path;
        // Mark as loading
        setOpenFiles(files => files.map(f => f.path === targetPath ? { ...f, isLoading: true, error: null } : f));

        try {
            console.log(`EditorContext [saveActiveFile]: Calling window.electronAPI.fs_saveFile for ${targetPath}...`);
            const response: SaveFileResponse = await window.electronAPI.fs_saveFile(targetPath, currentEditorContent);

            console.log(`[EditorContext -> saveActiveFile] IPC Response for ${targetPath}:`, response);

            if (response.success) {
                console.log(`EditorContext [saveActiveFile]: File saved successfully via IPC - ${targetPath}`);
                console.log(`[EditorContext -> saveActiveFile] Updating context state: isDirty=false, content=currentEditorContent`);
                setOpenFiles(files => files.map(f => f.path === targetPath ? {
                    ...f,
                    content: currentEditorContent,
                    isDirty: false,
                    isLoading: false,
                    error: null
                 } : f));
            } else {
                console.error(`EditorContext [saveActiveFile]: Failed to save file ${targetPath} (IPC Response):`, response.error);
                console.log(`[EditorContext -> saveActiveFile] Updating context state: isLoading=false, error=${response.error}`);
                setOpenFiles(files => files.map(f => f.path === targetPath ? {
                    ...f,
                    isLoading: false, // Still set isLoading false even on error
                    error: `Save Error: ${response.error || 'Unknown error'}`
                 } : f));
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext [saveActiveFile]: IPC Error saving file ${targetPath}:`, errorMsg);
            console.log(`[EditorContext -> saveActiveFile] Updating context state after IPC error: isLoading=false, error=${errorMsg}`);
             setOpenFiles(files => files.map(f => f.path === targetPath ? {
                    ...f,
                    isLoading: false, // Still set isLoading false even on error
                    error: `IPC Save Error: ${errorMsg}`
             } : f));
        }
    }, [openFiles, activeFilePath]); // Keep dependencies


    // --- Context Value ---
    const contextValue = useMemo(() => ({
        openFiles,
        activeFilePath,
        cursorPosition,
        openOrFocusFile,
        closeFile,
        setActiveFile,
        updateActiveFileDirtyState,
        saveActiveFile,
        getActiveFile,
        setCursorPosition,
    }), [
        openFiles, activeFilePath, cursorPosition, openOrFocusFile, closeFile, setActiveFile,
        updateActiveFileDirtyState, saveActiveFile, getActiveFile, setCursorPosition
    ]);

    return (
        <EditorContext.Provider value={contextValue}>
            {children}
        </EditorContext.Provider>
    );
};

// --- Hook to use the context ---
export const useEditor = (): EditorContextProps => {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
};
// --- END FILE: src/renderer/contexts/EditorContext.tsx ---