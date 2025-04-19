// --- START FILE: src/renderer/components/FileTreeNode.tsx ---
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    FaFolder, FaFolderOpen, FaFileAlt,
    FaChevronRight, FaChevronDown, FaSpinner // Added FaSpinner for loading
} from 'react-icons/fa';

import type { DirectoryEntry } from '../../shared.types';

interface FileTreeNodeProps {
    entry: DirectoryEntry;
    isExpanded: boolean;
    allExpandedFolders: Record<string, boolean>;
    onToggleExpand: (path: string) => void;
    onEntryClick: (entry: DirectoryEntry) => void;
    level: number;
}

const FileIcon: React.FC<{ isDirectory: boolean; isExpanded?: boolean }> = memo(({ isDirectory, isExpanded }) => {
    const icon = isDirectory
        ? (isExpanded ? <FaFolderOpen /> : <FaFolder />)
        : <FaFileAlt />;
    return <span className="file-icon">{icon}</span>;
});
FileIcon.displayName = 'FileIcon';

const ExpandIcon: React.FC<{ isExpanded: boolean }> = memo(({ isExpanded }) => {
    const icon = isExpanded ? <FaChevronDown /> : <FaChevronRight />;
    return <span className="expand-icon">{icon}</span>;
});
ExpandIcon.displayName = 'ExpandIcon';

// Loading Spinner Icon
const LoadingIcon: React.FC = memo(() => (
    <span className="loading-spinner">
        <FaSpinner className="spin-animation" /> {/* Apply animation via CSS */}
    </span>
));
LoadingIcon.displayName = 'LoadingIcon';


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
    // *** NEW STATE: Track if fetch has been attempted ***
    const [hasFetchedChildren, setHasFetchedChildren] = useState<boolean>(false);

    // Effect to fetch children
    useEffect(() => {
        // *** UPDATED CONDITION: Fetch only if not already fetched ***
        if (entry.isDirectory && isExpanded && !hasFetchedChildren && !isLoading) {
            console.log(`Node ${entry.name} [${entry.path}]: Expanding, fetching children (first time)...`);
            setIsLoading(true);
            setError(null);
            setChildren([]); // Clear any potential stale children data

            window.electronAPI.fs_readDirectory(entry.path)
                .then(response => {
                    if (response.success) {
                        setChildren(response.entries);
                        setError(null); // Clear any previous error
                    } else {
                        setError(response.error);
                        setChildren([]); // Ensure children are empty on error
                    }
                })
                .catch(err => {
                    setError(err.message || 'IPC Error');
                    setChildren([]); // Ensure children are empty on error
                })
                .finally(() => {
                    setIsLoading(false);
                    // *** Mark as fetched regardless of success/failure ***
                    setHasFetchedChildren(true);
                    console.log(`Node ${entry.name} [${entry.path}]: Fetch complete.`);
                });
        } else if (entry.isDirectory && !isExpanded && hasFetchedChildren) {
             // Optional: Reset fetch status if folder is collapsed, to allow refresh on re-expand
             // Comment this out if you want expansion to always show cached children after first load
             // console.log(`Node ${entry.name} [${entry.path}]: Collapsed, resetting fetch status.`);
             // setHasFetchedChildren(false);
             // setChildren([]); // Also clear children if resetting fetch status
        }
    }, [entry.isDirectory, entry.path, isExpanded, hasFetchedChildren, isLoading]); // Add hasFetchedChildren to dependencies


    const handleNodeClick = useCallback(() => {
        onEntryClick(entry);
    }, [onEntryClick, entry]);


    const indentStyle = { paddingLeft: `${level * 15}px` };

    return (
        <li className={`file-tree-node ${entry.isDirectory ? 'directory' : 'file'} ${isLoading ? 'loading' : ''}`}>
            <div
                className="node-content"
                style={indentStyle}
                onClick={handleNodeClick}
                title={entry.path}
            >
                {/* Render ExpandIcon, LoadingIcon, or spacer */}
                {entry.isDirectory ? (
                    <span className="toggle-icon">
                        {isLoading ? <LoadingIcon /> : <ExpandIcon isExpanded={isExpanded} />}
                    </span>
                ) : (
                    <span className="toggle-icon spacer"></span>
                )}

                <FileIcon isDirectory={entry.isDirectory} isExpanded={isExpanded} />
                <span className="node-name">{entry.name}</span>
            </div>

            {/* Render Children Recursively */}
            {entry.isDirectory && isExpanded && !isLoading && (
                <ul>
                    {error && <li className="error-message" style={{ paddingLeft: `${(level + 1) * 15}px` }}>Error: {error}</li>}
                    {/* *** ADDED CHECK: Show (empty) message only if fetched and empty *** */}
                    {children.length === 0 && !error && hasFetchedChildren && (
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