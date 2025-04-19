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

interface EditorContextProps {
    currentFilePath: string | null;
    currentFileContent: string | null;
    openFile: (filePath: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    isDirty: boolean; // NEW: Track unsaved changes
    markAsDirty: (dirty: boolean) => void; // NEW: Function to set dirty state
    saveCurrentFile: (content: string) => Promise<void>; // NEW: Function to save
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

interface EditorProviderProps {
    children: ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [currentFileContent, setCurrentFileContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false); // Initialize dirty state

    const openFile = useCallback(async (filePath: string) => {
        console.log(`EditorContext: Request to open file - ${filePath}`);
        setIsLoading(true); // <<< SET LOADING TRUE
        console.log('EditorContext: isLoading set to TRUE (openFile start)'); // <<< ADD LOG
        setError(null);
        setIsDirty(false); // Reset dirty state on open
        setCurrentFilePath(filePath);
        setCurrentFileContent(''); // Clear content immediately

        try {
            const response: ReadFileResponse = await window.electronAPI.fs_readFile(filePath);
            if (response.success) {
                console.log(`EditorContext: File loaded successfully - ${filePath}`);
                setCurrentFileContent(response.content);
                setIsDirty(false); // Reset dirty again after successful load
            } else {
                console.error(`EditorContext: Failed to read file ${filePath}:`, response.error);
                setError(`Error loading file: ${response.error}`);
                setCurrentFileContent(`// Error loading file: ${response.error}`);
                setCurrentFilePath(null);
                setIsDirty(false);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext: IPC Error reading file ${filePath}:`, errorMsg);
            setError(`IPC Error: ${errorMsg}`);
            setCurrentFileContent(`// IPC Error loading file: ${errorMsg}`);
            setCurrentFilePath(null);
            setIsDirty(false);
        } finally {
            setIsLoading(false); // <<< SET LOADING FALSE
            console.log('EditorContext: isLoading set to FALSE (openFile finally)'); // <<< ADD LOG
        }
    }, []); // Dependencies are empty

    const markAsDirty = useCallback((dirty: boolean) => {
         if (dirty !== isDirty) {
            console.log(`EditorContext: Setting dirty state to ${dirty}`);
            setIsDirty(dirty);
         }
    }, [isDirty]); // Dependency on isDirty

    const saveCurrentFile = useCallback(async (content: string) => {
        if (!currentFilePath) {
            console.warn("EditorContext: Cannot save, no file path specified.");
            setError("Cannot save: No file is currently open.");
            return;
        }
        if (!isDirty) {
            console.log("EditorContext: No changes to save.");
            return; // Nothing to save
        }

        console.log(`EditorContext: Request to save file - ${currentFilePath}`);
        setIsLoading(true); // <<< SET LOADING TRUE
        console.log('EditorContext: isLoading set to TRUE (saveCurrentFile start)'); // <<< ADD LOG
        setError(null);

        try {
            const response: SaveFileResponse = await window.electronAPI.fs_saveFile(currentFilePath, content);
            if (response.success) {
                console.log(`EditorContext: File saved successfully - ${currentFilePath}`);
                setCurrentFileContent(content);
                setIsDirty(false); // Mark as not dirty after successful save
            } else {
                console.error(`EditorContext: Failed to save file ${currentFilePath}:`, response.error);
                setError(`Error saving file: ${response.error || 'Unknown error'}`);
                // Keep isDirty true because save failed
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext: IPC Error saving file ${currentFilePath}:`, errorMsg);
            setError(`IPC Error saving file: ${errorMsg}`);
            // Keep isDirty true because save failed
        } finally {
            setIsLoading(false); // <<< SET LOADING FALSE
            console.log('EditorContext: isLoading set to FALSE (saveCurrentFile finally)'); // <<< ADD LOG
        }
    }, [currentFilePath, isDirty]); // Dependencies for save function


    const contextValue = useMemo(() => ({
        currentFilePath,
        currentFileContent,
        openFile,
        isLoading,
        error,
        isDirty,
        markAsDirty,
        saveCurrentFile
    }), [
        currentFilePath, currentFileContent, openFile, isLoading, error,
        isDirty, markAsDirty, saveCurrentFile
    ]);

    return (
        <EditorContext.Provider value={contextValue}>
            {children}
        </EditorContext.Provider>
    );
};

export const useEditor = (): EditorContextProps => {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
};
// --- END FILE: src/renderer/contexts/EditorContext.tsx ---