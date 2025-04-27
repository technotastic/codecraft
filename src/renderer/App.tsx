// src/renderer/App.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import './App.css';

const getSidebarInitialSize = (): number => {
  if (typeof document === 'undefined') return 150;
  try {
      const widthValue = getComputedStyle(document.documentElement)
                           .getPropertyValue('--sidebar-width')?.trim() || '150px';
      return parseInt(widthValue.replace('px', ''), 10) || 150;
  } catch (e) {
      console.warn("Could not get computed style for sidebar width, using default.", e);
      return 150;
  }
};


function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  // --- LIFTED STATE ---
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  // --- END LIFTED STATE ---

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(prev => !prev);
  }, []);

  // Effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrlAlt = event.ctrlKey && event.altKey;
      const ctrlShift = event.ctrlKey && event.shiftKey;
      const metaShift = event.metaKey && event.shiftKey;

      if (ctrlAlt && event.key.toLowerCase() === 'q') { event.preventDefault(); window.electronAPI.app_quit(); }
      else if (ctrlAlt && event.key.toLowerCase() === 'f') { event.preventDefault(); window.electronAPI.window_toggleFullscreen(); }
      else if (ctrlAlt && event.key.toLowerCase() === 'i') { event.preventDefault(); window.electronAPI.window_toggleDevTools(); }
      else if ((ctrlShift || metaShift) && event.key.toLowerCase() === 'p') { event.preventDefault(); toggleCommandPalette(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [toggleCommandPalette]);

  // --- Function to handle opening a folder via DIALOG ---
  const handleOpenFolderRequest = useCallback(async () => {
      console.log('App: Requesting to open directory dialog...');
      try {
        const folderPath = await window.electronAPI.dialog_openDirectory();
        if (folderPath) {
          console.log(`App: Folder selected via dialog: ${folderPath}`);
          setCurrentFolderPath(folderPath); // Update lifted state
        } else {
          console.log('App: Folder selection cancelled.');
        }
      } catch (err) {
        console.error('App: Error opening directory dialog:', err);
        // Optionally show error to user
      }
  }, []); // No dependencies needed as it uses window API and setter

  return (
    <div className="app-container">
      {/* Main content area */}
      <div className="main-content-area">
        <Allotment>
          <Allotment.Pane
            preferredSize={getSidebarInitialSize()}
            minSize={150}
            maxSize={500}
            snap
          >
            {/* Pass state and handlers down */}
            <Sidebar
                currentFolderPath={currentFolderPath}
                setCurrentFolderPath={setCurrentFolderPath}
                onOpenFolderRequest={handleOpenFolderRequest} // Pass dialog handler
            />
          </Allotment.Pane>

          <Allotment.Pane minSize={300} >
             {/* Pass setter function down for WelcomeScreen */}
             <MainPanel setCurrentFolderPath={setCurrentFolderPath} />
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default App;