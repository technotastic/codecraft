// src/renderer/App.tsx
import React from 'react';
import { Allotment } from 'allotment'; // Import Allotment
import 'allotment/dist/style.css'; // Ensure styles are imported (already in main.tsx but doesn't hurt)
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import './App.css'; // Import the layout styles

// Helper function to get initial sidebar width from CSS variable
const getSidebarInitialSize = (): number => {
  // Ensure document exists before trying to access it
  if (typeof document === 'undefined') return 250; // Default for non-browser env
  const widthValue = getComputedStyle(document.documentElement)
                       .getPropertyValue('--sidebar-width')?.trim() || '250px';
  return parseInt(widthValue.replace('px', ''), 10) || 250;
};


function App() {
  return (
    // The app-container now primarily provides the full viewport boundary for Allotment
    <div className="app-container">
      {/*
        Top-level Allotment for horizontal split (Sidebar vs MainPanel).
        No 'vertical' prop means it splits horizontally by default.
      */}
      <Allotment>
        <Allotment.Pane
          preferredSize={getSidebarInitialSize()} // Use CSS var for initial width
          minSize={150}  // Minimum width for the sidebar
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
  );
}

export default App;