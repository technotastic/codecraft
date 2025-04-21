// --- START FILE: src/renderer/App.tsx ---
// src/renderer/App.tsx
import React, { useEffect } from 'react'; // <<< Import useEffect
import { Allotment } from 'allotment'; // Import Allotment
import 'allotment/dist/style.css'; // Ensure styles are imported
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import StatusBar from './components/StatusBar'; // <<< NEW: Import StatusBar
import './App.css'; // Import the layout styles

// Helper function to get initial sidebar width from CSS variable
const getSidebarInitialSize = (): number => {
  // Ensure document exists before trying to access it
  if (typeof document === 'undefined') return 150; // Default for non-browser env
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

  // Effect for keyboard shortcuts (no changes needed here)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Use Ctrl+Alt modifiers for less conflict potential in WSL
      const ctrlAlt = event.ctrlKey && event.altKey;

      if (ctrlAlt && event.key.toLowerCase() === 'q') { // Ctrl+Alt+Q to Quit
        console.log("Renderer: Ctrl+Alt+Q detected, requesting app quit.");
        event.preventDefault(); // Prevent potential browser/OS action
        window.electronAPI.app_quit();
      } else if (ctrlAlt && event.key.toLowerCase() === 'f') { // Ctrl+Alt+F to Toggle Fullscreen
        console.log("Renderer: Ctrl+Alt+F detected, requesting fullscreen toggle.");
        event.preventDefault();
        window.electronAPI.window_toggleFullscreen();
      } else if (ctrlAlt && event.key.toLowerCase() === 'i') { // Ctrl+Alt+I to Toggle DevTools
         console.log("Renderer: Ctrl+Alt+I detected, requesting devtools toggle.");
         event.preventDefault();
         window.electronAPI.window_toggleDevTools();
      }
        // Can add more shortcuts here (e.g., Ctrl+S handled in EditorPanel)
    };

    console.log("Adding global keyboard shortcuts listener.");
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      console.log("Removing global keyboard shortcuts listener.");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return (
    // The app-container is now a flex container for the main content and status bar
    <div className="app-container">
      {/* Main content area (Allotment for Sidebar/MainPanel split) */}
      <div className="main-content-area">
        <Allotment>
          <Allotment.Pane
            preferredSize={getSidebarInitialSize()} // Use CSS var for initial width
            minSize={150}  // Minimum width for the sidebar (matches default)
            maxSize={500}  // Maximum width for the sidebar
            snap           // Enable snapping
          >
            {/* Sidebar takes the first pane */}
            <Sidebar />
          </Allotment.Pane>

          <Allotment.Pane
            minSize={300} // Minimum width for the main content area
            // No preferredSize needed here, it will take remaining space
          >
            {/* MainPanel (containing the vertical editor/terminal split) takes the second pane */}
            <MainPanel />
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Status Bar rendered below the main content area */}
      <StatusBar />
    </div>
  );
}

export default App;
// --- END FILE: src/renderer/App.tsx ---