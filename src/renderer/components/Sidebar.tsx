// --- START FILE: src/renderer/components/Sidebar.tsx ---
import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import path from 'path-browserify'; // Use browser-compatible path module
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext';
import CustomSelect from './CustomSelect';
import FileTreeNode from './FileTreeNode'; // Import the new component
import type { DirectoryEntry } from '../../shared.types';

// Define the options for the custom select - ADD NEW THEMES HERE
const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark (VS Code)' },
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
  const { openFile } = useEditor(); // Get openFile function from context
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [rootDirectoryEntries, setRootDirectoryEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // NEW: State to track expanded folders (path -> boolean)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const handleOpenFolder = async () => {
    console.log('Requesting to open directory...');
    setError(null); // Clear previous errors
    setExpandedFolders({}); // Reset expanded state when opening a new root
    try {
      const folderPath = await window.electronAPI.dialog_openDirectory();
      if (folderPath) {
        console.log(`Folder selected: ${folderPath}`);
        setCurrentFolderPath(folderPath);
        // Directory reading will be triggered by the useEffect below
      } else {
        console.log('Folder selection cancelled.');
      }
    } catch (err) {
      console.error('Error opening directory dialog:', err);
      setError('Failed to open directory dialog.');
    }
  };

  // Effect to read the ROOT directory contents when folder path changes
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
      // Clear entries if no folder is selected
      setRootDirectoryEntries([]);
    }
    // Only depends on the root folder path
  }, [currentFolderPath]);

  // --- NEW: Toggle Folder Expansion ---
  const toggleFolderExpansion = useCallback((folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath], // Toggle the specific path
    }));
  }, []); // No dependencies, it only uses the callback form of setState

  // --- NEW: Navigate Up ---
  const handleGoUp = () => {
    if (currentFolderPath) {
        // Use path-browserify for dirname
        const parentPath = path.dirname(currentFolderPath);
        // Basic check to prevent going above root (e.g., '/' or 'C:\')
        // This might need refinement depending on OS specifics if path.dirname('/') behaves differently
        if (parentPath !== currentFolderPath) {
            console.log(`Navigating up to: ${parentPath}`);
            setCurrentFolderPath(parentPath);
            setExpandedFolders({}); // Collapse all when going up for simplicity
        } else {
             console.log("Already at root, cannot go up further.");
        }
    }
  };


  // Click handler passed down to nodes
  const handleEntryClick = useCallback((entry: DirectoryEntry) => {
    if (entry.isDirectory) {
      // Toggle expansion when a directory is clicked
      toggleFolderExpansion(entry.path);
    } else {
      // Open file when a file is clicked
      openFile(entry.path).catch(err => {
          console.error("Error returned from openFile call:", err);
      });
    }
  }, [toggleFolderExpansion, openFile]); // Dependencies


  return (
    <div className="sidebar">
      {/* Header and Open Folder Button */}
      <div className="sidebar-header">
        <h2>Files</h2>
        <button onClick={handleOpenFolder} title="Open Folder...">
           📂 Open...
        </button>
      </div>

      {/* --- NEW: Up Button and Current Path --- */}
      {currentFolderPath && (
        <div className="navigation-controls">
           <button
             onClick={handleGoUp}
             // Disable if parent is same as current (simple root check)
             disabled={!currentFolderPath || path.dirname(currentFolderPath) === currentFolderPath}
             title="Go Up One Level"
             className="up-button"
           >
             ⬆️ Up
           </button>
           <div className="current-folder-path" title={currentFolderPath}>
             {/* Display only the base name of the current folder for brevity? Or full path? */}
             {/* <small>{path.basename(currentFolderPath)}</small> */}
              <small>{currentFolderPath}</small> {/* Show full path for now */}
           </div>
        </div>
      )}

      {/* --- MODIFIED: File Tree Area --- */}
      <div className="file-tree">
        {isLoading && <p>Loading root...</p>}
        {error && <p className="error-message">Error: {error}</p>}
        {!isLoading && !error && rootDirectoryEntries.length === 0 && !currentFolderPath && (
          <p className="placeholder-message">Click "Open..." to browse files.</p>
        )}
        {!isLoading && !error && rootDirectoryEntries.length === 0 && currentFolderPath && (
          <p className="placeholder-message">Folder is empty.</p>
        )}
        {/* Use FileTreeNode for rendering */}
        <ul>
          {rootDirectoryEntries.map((entry) => (
            <FileTreeNode
              key={entry.path}
              entry={entry}
              // Pass down the expanded state for *this specific* node
              isExpanded={!!expandedFolders[entry.path]}
              // Pass down the *entire* map for child lookups
              allExpandedFolders={expandedFolders}
              onToggleExpand={toggleFolderExpansion} // Can be used by node too if needed later
              onEntryClick={handleEntryClick} // Pass click handler
              level={0} // Starting level
            />
          ))}
        </ul>
      </div>

      {/* Theme Switcher Section - At the bottom */}
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