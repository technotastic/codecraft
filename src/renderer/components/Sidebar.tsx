// --- START FILE: src/renderer/components/Sidebar.tsx ---
import React, { useState, useEffect } from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useEditor } from '../contexts/EditorContext'; // Import useEditor hook
import CustomSelect from './CustomSelect';
import type { DirectoryEntry } from '../../shared.types';

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

const FileIcon: React.FC<{ isDirectory: boolean }> = ({ isDirectory }) => {
  return <span style={{ marginRight: '5px' }}>{isDirectory ? '📁' : '📄'}</span>;
};


const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { openFile } = useEditor(); // Get openFile function from context
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [directoryEntries, setDirectoryEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenFolder = async () => {
    console.log('Requesting to open directory...');
    setError(null);
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

  // Effect to read directory contents when folder path changes
  useEffect(() => {
    if (currentFolderPath) {
      console.log(`Folder path changed, reading directory: ${currentFolderPath}`);
      setIsLoading(true);
      setError(null);
      setDirectoryEntries([]);

      window.electronAPI.fs_readDirectory(currentFolderPath)
        .then(response => {
          if (response.success) {
            console.log(`Received ${response.entries.length} directory entries.`);
            setDirectoryEntries(response.entries);
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
      setDirectoryEntries([]);
    }
  }, [currentFolderPath]);

  // --- NEW: Click Handler for Directory Entries ---
  const handleEntryClick = (entry: DirectoryEntry) => {
    if (entry.isDirectory) {
      // If directory, update current folder path to navigate
      console.log(`Navigating to folder: ${entry.path}`);
      setCurrentFolderPath(entry.path);
    } else {
      // If file, call the openFile function from context
      console.log(`Requesting to open file: ${entry.path}`);
      openFile(entry.path).catch(err => {
          // Optional: Handle potential errors from the openFile promise itself
          // (though EditorContext already logs/sets errors internally)
          console.error("Error returned from openFile call:", err);
      });
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Files</h2>
        <button onClick={handleOpenFolder} title="Open Folder...">
           📂 Open...
        </button>
      </div>

      {currentFolderPath && (
        <div className="current-folder-path">
          <small title={currentFolderPath}>Current: {currentFolderPath}</small>
        </div>
      )}

      <div className="file-tree">
        {isLoading && <p>Loading...</p>}
        {error && <p className="error-message">Error: {error}</p>}
        {!isLoading && !error && directoryEntries.length === 0 && !currentFolderPath && (
          <p className="placeholder-message">Click "Open..." to browse files.</p>
        )}
        {!isLoading && !error && directoryEntries.length === 0 && currentFolderPath && (
          <p className="placeholder-message">Folder is empty.</p>
        )}
        <ul>
          {directoryEntries.map((entry) => (
            <li
              key={entry.path}
              title={entry.path}
              className={`file-entry ${entry.isDirectory ? 'directory' : 'file'}`}
              onClick={() => handleEntryClick(entry)} // Add onClick handler
              style={{ cursor: 'pointer' }} // Indicate clickable
            >
              <FileIcon isDirectory={entry.isDirectory} />
              {entry.name}
            </li>
          ))}
        </ul>
      </div>

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