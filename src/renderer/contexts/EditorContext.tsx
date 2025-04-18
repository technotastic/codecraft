// --- START FILE: src/renderer/contexts/EditorContext.tsx ---
import React, {
    createContext,
    useState,
    useContext,
    ReactNode,
    useCallback,
    useMemo,
} from 'react';

import type { ReadFileResponse } from '../../shared.types'; // Import shared type

interface EditorContextProps {
    currentFilePath: string | null;
    currentFileContent: string | null;
    openFile: (filePath: string) => Promise<void>; // Async function to handle loading
    isLoading: boolean;
    error: string | null;
    // Later: add isDirty, saveFile, etc.
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

    const openFile = useCallback(async (filePath: string) => {
        console.log(`EditorContext: Request to open file - ${filePath}`);
        setIsLoading(true);
        setError(null);
        setCurrentFilePath(filePath); // Set path immediately for feedback
        setCurrentFileContent(''); // Clear previous content

        try {
            const response: ReadFileResponse = await window.electronAPI.fs_readFile(filePath);
            if (response.success) {
                console.log(`EditorContext: File loaded successfully - ${filePath}`);
                setCurrentFileContent(response.content);
            } else {
                console.error(`EditorContext: Failed to read file ${filePath}:`, response.error);
                setError(`Error loading file: ${response.error}`);
                setCurrentFileContent(`// Error loading file: ${response.error}`); // Show error in editor
                 setCurrentFilePath(null); // Clear path on error? Or keep it to show which file failed? Let's clear it for now.
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`EditorContext: IPC Error reading file ${filePath}:`, errorMsg);
            setError(`IPC Error: ${errorMsg}`);
            setCurrentFileContent(`// IPC Error loading file: ${errorMsg}`);
            setCurrentFilePath(null);
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies needed for useCallback here

    const contextValue = useMemo(() => ({
        currentFilePath,
        currentFileContent,
        openFile,
        isLoading,
        error,
    }), [currentFilePath, currentFileContent, openFile, isLoading, error]); // Dependencies for useMemo

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