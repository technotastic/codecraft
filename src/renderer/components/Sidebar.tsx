// --- START FILE: src/renderer/components/Sidebar.tsx ---
import React, { useState, useEffect, useCallback } from 'react';
import path from 'path-browserify';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext'; // Import the hook
import CustomSelect from './CustomSelect';
import FileTreeNode from './FileTreeNode';
import type { DirectoryEntry } from '../../shared.types';
import { FaFolderOpen, FaLevelUpAlt } from 'react-icons/fa';

// Theme options
const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
  { value: 'win95', label: 'Win95' }, { value: 'pipboy', label: 'Pip-Boy' },
  { value: 'mirc', label: 'mIRC' }, { value: 'qbasic', label: 'QBasic' },
  { value: 'orange', label: 'Amber' }, { value: 'cga', label: 'CGA' },
  { value: 'atari', label: 'Atari 2600' }, { value: 'snes', label: 'SNES' },
  { value: 'bw_tv', label: 'B&W TV' },
];


const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  // Use the new context function
  const { openOrFocusFile } = useEditor(); // Get openOrFocusFile from context
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [rootDirectoryEntries, setRootDirectoryEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const handleOpenFolder = async () => {
    console.log('Requesting to open directory...');
    setError(null);
    setExpandedFolders({});
    try {
      const folderPath = await window.electronAPI.dialog_openDirectory();
      if (folderPath) {
        console.log(`Folder selected: ${folderPath}`);
        setCurrentFolderPath(folderPath);
      } else {
        console.log('Folder selection cancelled.');
      }
    } catch (err) {
      console.error('Error opening directory dialog:', err);
      setError('Failed to open directory dialog.');
    }
  };

  // Effect to read root directory
   useEffect(() => {
    if (currentFolderPath) {
      console.log(`Reading ROOT directory: ${currentFolderPath}`);
      setIsLoading(true);
      setError(null);
      setRootDirectoryEntries([]);
      setExpandedFolders({}); // Reset expanded state when root changes

      window.electronAPI.fs_readDirectory(currentFolderPath)
        .then(response => {
          if (response.success) {
            setRootDirectoryEntries(response.entries);
          } else {
            console.error('Failed to read directory:', response.error);
            setError(`Error reading directory: ${response.error}`);
          }
        })
        .catch(err => {
          console.error('IPC Error reading directory:', err);
          setError(`IPC Error: ${err.message || 'Unknown error'}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setRootDirectoryEntries([]);
    }
  }, [currentFolderPath]);


  const toggleFolderExpansion = useCallback((folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  }, []);

  const handleGoUp = () => {
    if (currentFolderPath) {
        const parentPath = path.dirname(currentFolderPath);
        // Prevent going up from the root itself (e.g., '/')
        if (parentPath !== currentFolderPath) {
            console.log(`Navigating up to: ${parentPath}`);
            setCurrentFolderPath(parentPath);
            // No need to clear expandedFolders here, keep state if returning
        } else {
             console.log("Already at root, cannot go up further.");
        }
    }
  };

   // UPDATED: Use openOrFocusFile for files
   const handleEntryClick = useCallback((entry: DirectoryEntry) => {
    if (entry.isDirectory) {
      // Toggle expansion for directories
      toggleFolderExpansion(entry.path);
    } else {
      // Open or focus the file using the context function
      openOrFocusFile(entry.path).catch(err => {
          console.error("Error returned from openOrFocusFile call:", err);
          // Optionally show an error to the user
      });
    }
  }, [toggleFolderExpansion, openOrFocusFile]); // Use context function


  return (
    <div className="sidebar">
      {/* Header and Open Folder Button */}
      <div className="sidebar-header">
        <h2>Files</h2>
        {/* MODIFIED BUTTON: Icon only with title */}
        <button
          onClick={handleOpenFolder}
          title="Open Folder..." // Tooltip
          aria-label="Open Folder"
          // Use the generic icon-button class for styling
          className="open-folder-button icon-button"
        >
          <FaFolderOpen />
          {/* Removed the <span>Open...</span> text */}
        </button>
      </div>

      {/* Navigation Controls */}
      {currentFolderPath && (
        <div className="navigation-controls">
           {/* Up button remains the same */}
           <button
             onClick={handleGoUp}
             // Disable if parent is the same as current (e.g., at root '/')
             disabled={!currentFolderPath || path.dirname(currentFolderPath) === currentFolderPath}
             title="Go Up One Level"
             aria-label="Go Up One Level"
             className="up-button icon-button"
           >
             <FaLevelUpAlt />
           </button>
           <div className="current-folder-path" title={currentFolderPath}>
              <small>{currentFolderPath}</small>
           </div>
        </div>
      )}

      {/* File Tree Area */}
      <div className="file-tree">
          {/* Loading/Error/Placeholder/List remains the same */}
           {isLoading && <p>Loading...</p>}
           {error && <p className="error-message">Error: {error}</p>}
           {!isLoading && !error && rootDirectoryEntries.length === 0 && !currentFolderPath && (
             <p className="placeholder-message">Click the <FaFolderOpen style={{ verticalAlign: 'middle', margin: '0 2px'}} /> button above to browse files.</p>
           )}
           <ul>
             {rootDirectoryEntries.map((entry) => (
                <FileTreeNode
                  key={entry.path}
                  entry={entry}
                  isExpanded={!!expandedFolders[entry.path]}
                  allExpandedFolders={expandedFolders} // Pass the whole map down
                  onToggleExpand={toggleFolderExpansion} // Passed down for child nodes
                  onEntryClick={handleEntryClick} // Passed down for child nodes
                  level={0}
                />
             ))}
           </ul>
      </div>

      {/* Theme Switcher */}
      <div className="theme-switcher">
        {/* Theme switcher remains the same */}
        <label id="theme-select-label" htmlFor="theme-select">
          Theme:
        </label>
        <CustomSelect<ThemeName>
           labelId="theme-select-label"
           options={themeOptions}
           value={theme}
           onChange={(newTheme) => setTheme(newTheme)}
         />
       </div>
    </div>
  );
};

export default Sidebar;
// --- END FILE: src/renderer/components/Sidebar.tsx ---