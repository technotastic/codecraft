// --- START FILE: src/renderer/components/Sidebar.tsx ---
import React, { useState, useEffect, useCallback } from 'react';
import path from 'path-browserify';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';
import CustomSelect from './CustomSelect';
import FileTreeNode from './FileTreeNode';
import type { DirectoryEntry } from '../../shared.types';
import { FaFolderOpen, FaLevelUpAlt } from 'react-icons/fa'; // Correct icons

// (Keep themeOptions definition as before)
const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'win95', label: 'Windows 95' },
  { value: 'pipboy', label: 'Pip-Boy' },
  { value: 'mirc', label: 'mIRC' },
  { value: 'qbasic', label: 'QBasic' },
  { value: 'orange', label: 'Orange CRT' },
  { value: 'cga', label: 'CGA (Cyan)' },
  { value: 'atari', label: 'Atari 2600' },
  { value: 'snes', label: 'SNES' },
  { value: 'bw_tv', label: 'B&W TV' },
];


const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { openFile } = useEditor();
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

  // (Keep useEffect for reading directory as before)
   useEffect(() => {
    if (currentFolderPath) {
      console.log(`Reading ROOT directory: ${currentFolderPath}`);
      setIsLoading(true);
      setError(null);
      setRootDirectoryEntries([]); // Clear previous root entries

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


  // (Keep toggleFolderExpansion as before)
  const toggleFolderExpansion = useCallback((folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  }, []);

  // (Keep handleGoUp as before)
  const handleGoUp = () => {
    if (currentFolderPath) {
        const parentPath = path.dirname(currentFolderPath);
        if (parentPath !== currentFolderPath) {
            console.log(`Navigating up to: ${parentPath}`);
            setCurrentFolderPath(parentPath);
            setExpandedFolders({});
        } else {
             console.log("Already at root, cannot go up further.");
        }
    }
  };

  // (Keep handleEntryClick as before)
   const handleEntryClick = useCallback((entry: DirectoryEntry) => {
    if (entry.isDirectory) {
      toggleFolderExpansion(entry.path);
    } else {
      openFile(entry.path).catch(err => {
          console.error("Error returned from openFile call:", err);
      });
    }
  }, [toggleFolderExpansion, openFile]);


  return (
    <div className="sidebar">
      {/* Header and Open Folder Button */}
      <div className="sidebar-header">
        <h2>Files</h2>
        {/* *** Add text back, keep icon, adjust padding/style via CSS *** */}
        <button
          onClick={handleOpenFolder}
          title="Open Folder..."
          aria-label="Open Folder"
          className="open-folder-button" // Add specific class for styling
        >
          <FaFolderOpen />
          <span style={{ marginLeft: 'var(--spacing-xs)' }}>Open...</span> {/* Add text with space */}
        </button>
      </div>

      {/* Navigation Controls */}
      {currentFolderPath && (
        <div className="navigation-controls">
           {/* *** Use FaLevelUpAlt Icon, style as icon-only via CSS *** */}
           <button
             onClick={handleGoUp}
             disabled={!currentFolderPath || path.dirname(currentFolderPath) === currentFolderPath}
             title="Go Up One Level"
             aria-label="Go Up One Level"
             className="up-button icon-button" // Add specific class for icon-only styling
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
        {isLoading && <p>Loading root...</p>}
        {error && <p className="error-message">Error: {error}</p>}
        {!isLoading && !error && rootDirectoryEntries.length === 0 && !currentFolderPath && (
           <p className="placeholder-message">Click the <FaFolderOpen style={{ verticalAlign: 'middle', margin: '0 2px'}} /> <span style={{ verticalAlign: 'middle' }}>Open...</span> button to browse files.</p>
        )}
        {!isLoading && !error && rootDirectoryEntries.length === 0 && currentFolderPath && (
          <p className="placeholder-message">Folder is empty.</p>
        )}
        <ul>
          {rootDirectoryEntries.map((entry) => (
            <FileTreeNode
              key={entry.path}
              entry={entry}
              isExpanded={!!expandedFolders[entry.path]}
              allExpandedFolders={expandedFolders}
              onToggleExpand={toggleFolderExpansion}
              onEntryClick={handleEntryClick}
              level={0}
            />
          ))}
        </ul>
      </div>

      {/* (Keep Theme Switcher as before) */}
      <div className="theme-switcher">
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