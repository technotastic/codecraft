// --- START FILE: src/renderer/components/StatusBar.tsx ---
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import path from 'path-browserify';
import { useEditor } from '../contexts/EditorContext';
import './StatusBar.css'; // Import styles

// Simple Language Mapping Utility (copied from EditorPanel for now)
// TODO: Extract to a shared utility file later
const getLanguageFromPath = (filePath: string | null): string => {
    if (!filePath) return 'Plain Text'; // More user-friendly default
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js': case 'jsx': return 'JavaScript';
        case 'ts': case 'tsx': return 'TypeScript';
        case 'json': return 'JSON';
        case 'css': return 'CSS';
        case 'html': case 'htm': return 'HTML';
        case 'md': case 'markdown': return 'Markdown';
        case 'py': return 'Python';
        case 'java': return 'Java';
        case 'c': case 'h': return 'C';
        case 'cpp': case 'hpp': return 'C++';
        case 'cs': return 'C#';
        case 'sh': return 'Shell Script';
        case 'xml': return 'XML';
        case 'yaml': case 'yml': return 'YAML';
        case 'sql': return 'SQL';
        // Add more user-friendly names
        default: return 'Plain Text';
    }
};

// Helper to format time with leading zeros
const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};


const StatusBar: React.FC = () => {
    const { activeFilePath, getActiveFile, cursorPosition } = useEditor();
    const activeFile = getActiveFile();
    const [currentTime, setCurrentTime] = useState<string>(formatTime(new Date())); // State for time

    // Effect to update the time every second
    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(formatTime(new Date()));
        }, 1000); // Update every 1000ms (1 second)

        // Cleanup interval on component unmount
        return () => {
            clearInterval(timerId);
        };
    }, []); // Empty dependency array ensures this runs only once on mount


    const fileName = activeFilePath ? path.basename(activeFilePath) : 'No file selected';
    const isDirty = activeFile?.isDirty ?? false;
    const isLoading = activeFile?.isLoading ?? false;
    const errorMessage = activeFile?.error ?? null;

    const line = cursorPosition?.lineNumber ?? 0;
    const column = cursorPosition?.column ?? 0;
    const detectedLanguage = getLanguageFromPath(activeFilePath);

    return (
        <div className="status-bar">
            {/* Left Side: File Status */}
            <div className="status-bar-left">
                <span className="status-item file-path" title={activeFilePath ?? ''}>
                    {isLoading ? 'Loading...' : (errorMessage ? `Error: ${fileName}` : fileName)}
                    {isDirty && !isLoading && !errorMessage && <span className="dirty-indicator">*</span>}
                </span>
                {errorMessage && (
                     <span className="status-item error-message" title={errorMessage}>
                         ⚠️ Error
                     </span>
                )}
            </div>

            {/* Right Side: Editor Info & Time */}
            <div className="status-bar-right">
                 {/* Show Ln/Col only if a file is active and we have position info */}
                 {activeFilePath && !isLoading && !errorMessage && line > 0 && column > 0 && (
                      <span className="status-item cursor-position" title="Line number, Column number">
                          Ln {line}, Col {column}
                      </span>
                  )}
                  {/* Show language only if a file is active */}
                  {activeFilePath && !isLoading && !errorMessage && (
                    <span className="status-item language" title="Detected File Language">
                        {detectedLanguage}
                    </span>
                  )}
                  <span className="status-item encoding" title="File Encoding">UTF-8</span> {/* Placeholder */}
                  <span className="status-item time" title="Current Time">{currentTime}</span>
            </div>
        </div>
    );
};

export default StatusBar;
// --- END FILE: src/renderer/components/StatusBar.tsx ---