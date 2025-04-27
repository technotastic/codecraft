// src/renderer/components/Sidebar.tsx
import React, { /* useState, */ useEffect, useCallback } from 'react'; // Remove useState
import path from 'path-browserify';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';
import CustomSelect from './CustomSelect';
import FileTreeNode from './FileTreeNode';
import type { DirectoryEntry } from '../../shared.types';
import { FaFolderOpen, FaLevelUpAlt } from 'react-icons/fa';

// Theme options (remain the same)
const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
  { value: 'win95', label: 'Win95' }, { value: 'pipboy', label: 'Pip-Boy' },
  { value: 'mirc', label: 'mIRC' }, { value: 'qbasic', label: 'QBasic' },
  { value: 'orange', label: 'Amber' }, { value: 'cga', label: 'CGA' },
  { value: 'atari', label: 'Atari 2600' }, { value: 'snes', label: 'SNES' },
  { value: 'bw_tv', label: 'B&W TV' },
];

// --- Define Props Interface ---
interface SidebarProps {
    currentFolderPath: string | null;
    setCurrentFolderPath: (path: string | null) => void;
    onOpenFolderRequest: () => void; // Expect the handler from App
}

const Sidebar: React.FC<SidebarProps> = ({
    currentFolderPath,    // Use prop
    setCurrentFolderPath, // Use prop
    onOpenFolderRequest   // Use prop
}) => {
  const { theme, setTheme } = useTheme();
  const { openOrFocusFile } = useEditor();
  // Removed local state: const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [rootDirectoryEntries, setRootDirectoryEntries] = React.useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});

  // Use the passed-in handler for the button click
  const handleOpenFolder = () => {
      onOpenFolderRequest();
  };

  // Effect to read root directory (uses prop currentFolderPath)
   useEffect(() => {
    if (currentFolderPath) {
      console.log(`Sidebar: Reading ROOT directory: ${currentFolderPath}`);
      setIsLoading(true);
      setError(null);
      setRootDirectoryEntries([]);
      setExpandedFolders({}); // Reset expanded state when root changes

      window.electronAPI.fs_readDirectory(currentFolderPath)
        .then(response => {
          if (response.success) {
            setRootDirectoryEntries(response.entries);
          } else {
            console.error('Sidebar: Failed to read directory:', response.error);
            setError(`Error reading directory: ${response.error}`);
          }
        })
        .catch(err => {
          console.error('Sidebar: IPC Error reading directory:', err);
          setError(`IPC Error: ${err.message || 'Unknown error'}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setRootDirectoryEntries([]); // Clear tree if no folder path
      setError(null); // Clear error when folder is cleared
      setExpandedFolders({}); // Clear expansion state
    }
  }, [currentFolderPath]); // Dependency is the prop


  const toggleFolderExpansion = useCallback((folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  }, []);

  // Use the passed-in setter for going up
  const handleGoUp = () => {
    if (currentFolderPath) {
        const parentPath = path.dirname(currentFolderPath);
        if (parentPath !== currentFolderPath) {
            console.log(`Sidebar: Navigating up to: ${parentPath}`);
            setCurrentFolderPath(parentPath); // Use prop setter
        } else {
             console.log("Sidebar: Already at root, cannot go up further.");
        }
    }
  };

   // Logic for clicking entry remains the same
   const handleEntryClick = useCallback((entry: DirectoryEntry) => {
    if (entry.isDirectory) {
      toggleFolderExpansion(entry.path);
    } else {
      openOrFocusFile(entry.path).catch(err => {
          console.error("Sidebar: Error returned from openOrFocusFile call:", err);
      });
    }
  }, [toggleFolderExpansion, openOrFocusFile]);


  return (
    <div className="sidebar">
      {/* Header and Open Folder Button */}
      <div className="sidebar-header">
        <h2>Files</h2>
        {/* Button now calls handleOpenFolder which calls the prop */}
        <button
          onClick={handleOpenFolder}
          title="Open Folder..."
          aria-label="Open Folder"
          className="open-folder-button icon-button"
        >
          <FaFolderOpen />
        </button>
      </div>

      {/* Navigation Controls */}
      {currentFolderPath && (
        <div className="navigation-controls">
           {/* Up button calls handleGoUp which uses the prop setter */}
           <button
             onClick={handleGoUp}
             disabled={!currentFolderPath || path.dirname(currentFolderPath) === currentFolderPath}
             title="Go Up One Level"
             aria-label="Go Up One Level"
             className="up-button icon-button"
           >
             <FaLevelUpAlt />
           </button>
           {/* Display uses the prop */}
           <div className="current-folder-path" title={currentFolderPath}>
              <small>{currentFolderPath}</small>
           </div>
        </div>
      )}

      {/* File Tree Area (Rendering logic remains same) */}
      <div className="file-tree">
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
                  allExpandedFolders={expandedFolders}
                  onToggleExpand={toggleFolderExpansion}
                  onEntryClick={handleEntryClick}
                  level={0}
                />
             ))}
           </ul>
      </div>

      {/* Theme Switcher (Remains same) */}
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