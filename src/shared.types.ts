// --- START FILE: src/shared.types.ts ---
// src/shared.types.ts

// This file can be used to define types that are shared
// between the main process, preload script, and renderer process.

export interface DirectoryEntry {
    name: string;       // File or folder name (e.g., 'index.ts', 'components')
    path: string;       // Full absolute path
    isDirectory: boolean; // True if it's a directory, false if it's a file
    // Add more properties later if needed (e.g., size, modified date)
}

// Define the expected response structure for reading a directory
export type ReadDirectoryResponse = {
    success: true;
    entries: DirectoryEntry[];
} | {
    success: false;
    error: string;
};

// Define the expected response structure for reading a file
export type ReadFileResponse = {
    success: true;
    content: string;
} | {
    success: false;
    error: string;
};

// Define the expected response structure for saving a file
export type SaveFileResponse = {
    success: boolean;
    error?: string;
};

// Example:
// export interface UserPreferences {
//   theme: string;
//   fontSize: number;
// }
// --- END FILE: src/shared.types.ts ---