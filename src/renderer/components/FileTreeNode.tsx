// --- START FILE: src/renderer/components/FileTreeNode.tsx ---
import React, { useState, useEffect, useCallback, memo } from 'react';
// *** NEW: Import icons from react-icons ***
import {
    FaFolder, FaFolderOpen, FaFileAlt, // File/Folder icons
    FaChevronRight, FaChevronDown // Expand/collapse icons
} from 'react-icons/fa'; // Using Font Awesome icons, but others exist

import type { DirectoryEntry } from '../../shared.types';

// Define the props for the component
interface FileTreeNodeProps {
    entry: DirectoryEntry;
    isExpanded: boolean;
    allExpandedFolders: Record<string, boolean>;
    onToggleExpand: (path: string) => void;
    onEntryClick: (entry: DirectoryEntry) => void;
    level: number;
}

// *** UPDATED Icon Components using react-icons ***
const FileIcon: React.FC<{ isDirectory: boolean; isExpanded?: boolean }> = memo(({ isDirectory, isExpanded }) => {
    // Use different icons for closed folder, open folder, and file
    const icon = isDirectory
        ? (isExpanded ? <FaFolderOpen /> : <FaFolder />)
        : <FaFileAlt />;
    // Apply the class for potential CSS styling (like color, size)
    return <span className="file-icon">{icon}</span>;
});
FileIcon.displayName = 'FileIcon';

const ExpandIcon: React.FC<{ isExpanded: boolean }> = memo(({ isExpanded }) => {
    // Use chevron icons for expand/collapse
    const icon = isExpanded ? <FaChevronDown /> : <FaChevronRight />;
    // Apply the class for potential CSS styling
    return <span className="expand-icon">{icon}</span>;
});
ExpandIcon.displayName = 'ExpandIcon';


// Use React.memo for performance optimization
const FileTreeNode: React.FC<FileTreeNodeProps> = memo(({
    entry,
    isExpanded,
    allExpandedFolders,
    onToggleExpand,
    onEntryClick,
    level
}) => {
    const [children, setChildren] = useState<DirectoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Effect to fetch children (remains the same logic)
    useEffect(() => {
        if (entry.isDirectory && isExpanded && children.length === 0 && !isLoading) {
            console.log(`Node ${entry.name} [${entry.path}]: Expanding, fetching children...`);
            setIsLoading(true);
            setError(null);
            window.electronAPI.fs_readDirectory(entry.path)
                .then(response => {
                    if (response.success) {
                        setChildren(response.entries);
                    } else {
                        setError(response.error);
                    }
                })
                .catch(err => {
                    setError(err.message || 'IPC Error');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [entry.isDirectory, entry.path, isExpanded, children.length, isLoading]);


    // Callback for click (remains the same)
    const handleNodeClick = useCallback(() => {
        onEntryClick(entry);
    }, [onEntryClick, entry]);


    // Style for indentation (remains the same)
    const indentStyle = { paddingLeft: `${level * 15}px` };

    return (
        <li className={`file-tree-node ${entry.isDirectory ? 'directory' : 'file'}`}>
            <div
                className="node-content"
                style={indentStyle}
                onClick={handleNodeClick}
                title={entry.path}
            >
                {/* Render ExpandIcon or spacer */}
                {entry.isDirectory ? (
                    <span className="toggle-icon">
                        {isLoading ? <span className="loading-spinner">⏳</span> : <ExpandIcon isExpanded={isExpanded} />}
                    </span>
                ) : (
                    <span className="toggle-icon spacer"></span>
                )}

                {/* Render FileIcon */}
                <FileIcon isDirectory={entry.isDirectory} isExpanded={isExpanded} />

                {/* Render Node name */}
                <span className="node-name">{entry.name}</span>
            </div>

            {/* Render Children Recursively (remains the same logic) */}
            {entry.isDirectory && isExpanded && !isLoading && (
                <ul>
                    {error && <li className="error-message" style={{ paddingLeft: `${(level + 1) * 15}px` }}>Error: {error}</li>}
                    {children.length === 0 && !error && (
                        <li className="empty-folder-message" style={{ paddingLeft: `${(level + 1) * 15}px` }}>
                            <small><i>(empty)</i></small>
                        </li>
                    )}
                    {children.map(childEntry => (
                        <FileTreeNode
                            key={childEntry.path}
                            entry={childEntry}
                            isExpanded={!!allExpandedFolders[childEntry.path]}
                            allExpandedFolders={allExpandedFolders}
                            onToggleExpand={onToggleExpand}
                            onEntryClick={onEntryClick}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
});

FileTreeNode.displayName = 'FileTreeNode';

export default FileTreeNode;
// --- END FILE: src/renderer/components/FileTreeNode.tsx ---