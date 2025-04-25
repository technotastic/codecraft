// --- START FILE: src/renderer/App.tsx ---
// src/renderer/App.tsx
import React, { useEffect, useState, useCallback } from 'react'; // <<< Import useState, useCallback
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette'; // <<< NEW: Import CommandPalette
import './App.css';

// Helper function to get initial sidebar width from CSS variable
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false); // <<< NEW: State for palette

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(prev => !prev);
  }, []);

  // Effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrlAlt = event.ctrlKey && event.altKey;
      const ctrlShift = event.ctrlKey && event.shiftKey; // <<< NEW: For palette shortcut
      const metaShift = event.metaKey && event.shiftKey; // <<< NEW: For Mac palette shortcut

      if (ctrlAlt && event.key.toLowerCase() === 'q') {
        console.log("Renderer: Ctrl+Alt+Q detected, requesting app quit.");
        event.preventDefault();
        window.electronAPI.app_quit();
      } else if (ctrlAlt && event.key.toLowerCase() === 'f') {
        console.log("Renderer: Ctrl+Alt+F detected, requesting fullscreen toggle.");
        event.preventDefault();
        window.electronAPI.window_toggleFullscreen();
      } else if (ctrlAlt && event.key.toLowerCase() === 'i') {
         console.log("Renderer: Ctrl+Alt+I detected, requesting devtools toggle.");
         event.preventDefault();
         window.electronAPI.window_toggleDevTools();
      } else if ((ctrlShift || metaShift) && event.key.toLowerCase() === 'p') { // <<< NEW: Palette shortcut
          console.log("Renderer: Ctrl/Cmd+Shift+P detected, toggling command palette.");
          event.preventDefault();
          toggleCommandPalette(); // <<< NEW: Call toggle function
      }
    };

    console.log("Adding global keyboard shortcuts listener (including Cmd/Ctrl+Shift+P)."); // Updated log
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      console.log("Removing global keyboard shortcuts listener.");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleCommandPalette]); // <<< NEW: Add toggleCommandPalette dependency

  return (
    <div className="app-container">
      {/* Main content area (Allotment for Sidebar/MainPanel split) */}
      <div className="main-content-area">
        <Allotment>
          <Allotment.Pane
            preferredSize={getSidebarInitialSize()}
            minSize={150}
            maxSize={500}
            snap
          >
            <Sidebar />
          </Allotment.Pane>

          <Allotment.Pane minSize={300} >
            <MainPanel />
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Status Bar rendered below the main content area */}
      <StatusBar />

      {/* Command Palette rendered conditionally as an overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
// --- END FILE: src/renderer/App.tsx ---