// --- START FILE: src/renderer/contexts/EditorContext.tsx ---
import React, {
    createContext,
    useState,
    useContext,
    ReactNode,
    useCallback,
    useMemo,
} from 'react';

import type { ReadFileResponse, SaveFileResponse } from '../../shared.types';

// Define the structure for an open file
export interface OpenFile {
    path: string;
    content: string | null; // Content from last load/save
    isDirty: boolean;
    isLoading: boolean;
    error: string | null;
    // Could add language later if needed separate from path derivation
}

interface EditorContextProps {
    openFiles: OpenFile[]; // Array of open files
    activeFilePath: string | null; // Path of the currently active file/tab
    openOrFocusFile: (filePath: string) => Promise<void>; // Opens a new file or focuses existing tab
    closeFile: (filePath: string) => void; // Closes a tab/file
    setActiveFile: (filePath: string | null) => void; // Switches active tab
    updateActiveFileDirtyState: (isNowDirty: boolean) => void; // Updates dirty flag ONLY for the active file
    saveActiveFile: (currentEditorContent: string) => Promise<void>; // Saves the currently active file's provided content
    getActiveFile: () => OpenFile | undefined; // Helper to get the active file object
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

interface EditorProviderProps {
    children: ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);

    // Helper to get the active file object
    const getActiveFile = useCallback((): OpenFile | undefined => {
        return openFiles.find(f => f.path === activeFilePath);
    }, [openFiles, activeFilePath]);

    // Helper to update a specific file in the state
    const updateFileState = useCallback((filePath: string, updates: Partial<OpenFile>) => {
        setOpenFiles(prevFiles =>
            prevFiles.map(file =>
                file.path === filePath ? { ...file, ...updates } : file
            )
        );
    }, []);


    // --- Core Tab/File Management Functions ---

    const setActiveFile = useCallback((filePath: string | null) => {
        // Avoid unnecessary updates if already active
        if (filePath !== activeFilePath) {
            console.log(`EditorContext: Setting active file path to: ${filePath}`);
            setActiveFilePath(filePath);
        }
    }, [activeFilePath]); // Depends only on activeFilePath for comparison

    const openOrFocusFile = useCallback(async (filePath: string) => {
        console.log(`EditorContext: Request to open or focus file - ${filePath}`);

        // 1. Check if file is already open
        const existingFileIndex = openFiles.findIndex(f => f.path === filePath);
        if (existingFileIndex !== -1) {
            console.log(`EditorContext: File ${filePath} already open, focusing.`);
            setActiveFile(filePath); // Just make it active
            return;
        }

        // 2. If not open, add it and load content
        console.log(`EditorContext: File ${filePath} not open, adding new entry and loading.`);
        const newFileEntry: OpenFile = {
            path: filePath,
            content: null, // Start with null content
            isDirty: false,
            isLoading: true, // Mark as loading
            error: null,
        };

        // Add to state FIRST, then set active
        setOpenFiles(prevFiles => [...prevFiles, newFileEntry]);
        setActiveFile(filePath); // Make the new file active immediately

        // 3. Fetch content via IPC
        try {
            const response: ReadFileResponse = await window.electronAPI.fs_readFile(filePath);
            // Introduce a small delay if needed to ensure state update has rendered before updating file state
            // await new Promise(resolve => setTimeout(resolve, 0));
            if (response.success) {
                console.log(`EditorContext: File loaded successfully - ${filePath}`);
                // Update the specific file entry with content and clear loading/error
                updateFileState(filePath, { content: response.content, isLoading: false, error: null, isDirty: false });
            } else {
                console.error(`EditorContext: Failed to read file ${filePath}:`, response.error);
                updateFileState(filePath, { content: `// Error: ${response.error}`, isLoading: false, error: `Load Error: ${response.error}`, isDirty: false });
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext: IPC Error reading file ${filePath}:`, errorMsg);
            updateFileState(filePath, { content: `// IPC Error: ${errorMsg}`, isLoading: false, error: `IPC Error: ${errorMsg}`, isDirty: false });
        }
    }, [openFiles, setActiveFile, updateFileState]); // Dependencies

    const closeFile = useCallback((filePath: string) => {
        console.log(`EditorContext: Request to close file - ${filePath}`);
        const fileToCloseIndex = openFiles.findIndex(f => f.path === filePath);

        if (fileToCloseIndex === -1) return; // File not found

        const fileToClose = openFiles[fileToCloseIndex];

        // Basic close - TODO: Add "dirty check" prompt later
        if (fileToClose?.isDirty) {
             const confirmClose = window.confirm(`File "${fileToClose.path}" has unsaved changes. Close anyway?`);
             if (!confirmClose) {
                 console.log(`EditorContext: Close cancelled for dirty file ${filePath}.`);
                 return; // Abort close
             }
             console.warn(`EditorContext: Closing dirty file ${filePath} without saving.`);
        }

        const remainingFiles = openFiles.filter(f => f.path !== filePath);
        setOpenFiles(remainingFiles);

        // If the closed file was the active one, determine the next active file
        if (activeFilePath === filePath) {
            let nextActivePath: string | null = null;
            if (remainingFiles.length > 0) {
                // Try to activate the previous tab, otherwise the first tab
                const nextIndex = Math.min(remainingFiles.length - 1, Math.max(0, fileToCloseIndex -1));
                 nextActivePath = remainingFiles[nextIndex]?.path || null; // Get path or null
            }
            setActiveFile(nextActivePath); // Activate the new tab or null if none left
        }
    }, [openFiles, activeFilePath, setActiveFile]);

    // Called by EditorPanel just to update the dirty flag based on its comparison
    const updateActiveFileDirtyState = useCallback((isNowDirty: boolean) => {
        const activeFile = getActiveFile();
        // Check both activeFile exists and dirty state actually needs changing
        if (activeFile && activeFile.isDirty !== isNowDirty) {
            console.log(`EditorContext: Setting dirty state for ${activeFilePath} to ${isNowDirty}`);
            updateFileState(activeFile.path, { isDirty: isNowDirty });
        }
    }, [activeFilePath, getActiveFile, updateFileState]); // Dependencies on helpers and path

    // Called by EditorPanel with the current editor content to save
    const saveActiveFile = useCallback(async (currentEditorContent: string) => {
        const activeFile = getActiveFile();

        if (!activeFile || activeFile.isLoading) {
            console.warn("EditorContext: Cannot save, no active file or file is loading.");
            // Maybe set an error on the active file?
            if(activeFile) updateFileState(activeFile.path, { error: "Cannot save while loading." });
            return;
        }

        console.log(`EditorContext: Request to save file - ${activeFile.path}`);
        updateFileState(activeFile.path, { isLoading: true, error: null }); // Mark as loading during save

        try {
            // Send IPC request with the provided content
            const response: SaveFileResponse = await window.electronAPI.fs_saveFile(activeFile.path, currentEditorContent);

            if (response.success) {
                console.log(`EditorContext: File saved successfully - ${activeFile.path}`);
                // Update the file state: mark as not dirty, not loading, and store the NEWLY SAVED content
                updateFileState(activeFile.path, {
                    content: currentEditorContent, // Store the successfully saved content as the new base
                    isDirty: false,
                    isLoading: false,
                    error: null
                });
            } else {
                console.error(`EditorContext: Failed to save file ${activeFile.path}:`, response.error);
                updateFileState(activeFile.path, { isLoading: false, error: `Save Error: ${response.error || 'Unknown error'}` });
                // isDirty remains true implicitly because content mismatches saved content
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext: IPC Error saving file ${activeFile.path}:`, errorMsg);
            updateFileState(activeFile.path, { isLoading: false, error: `IPC Save Error: ${errorMsg}` });
             // isDirty remains true implicitly
        }
    }, [getActiveFile, updateFileState]);


    // --- Context Value ---
    const contextValue = useMemo(() => ({
        openFiles,
        activeFilePath,
        openOrFocusFile,
        closeFile,
        setActiveFile,
        updateActiveFileDirtyState, // Expose the function to update dirty state
        saveActiveFile, // Expose save function
        getActiveFile, // Expose helper
    }), [
        openFiles, activeFilePath, openOrFocusFile, closeFile, setActiveFile,
        updateActiveFileDirtyState, saveActiveFile, getActiveFile
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