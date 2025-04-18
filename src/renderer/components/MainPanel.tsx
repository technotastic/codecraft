// --- START FILE: src/renderer/components/MainPanel.tsx ---
import React from 'react';
import { Allotment } from 'allotment'; // Make sure Allotment is installed
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
// Removed useTheme import as it's not strictly needed here anymore

const MainPanel: React.FC = () => {

  // Helper function to get initial terminal size hint from CSS variable
  const getTerminalInitialSize = (): number => {
    // Check if running in a browser environment before accessing document/window
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const heightValue = getComputedStyle(document.documentElement)
                              .getPropertyValue('--terminal-height')?.trim();
        if (heightValue) {
          return parseInt(heightValue.replace('px', ''), 10) || 200;
        }
      } catch (e) {
        console.error("Error getting terminal height CSS variable:", e);
      }
    }
    // Fallback if not in browser or variable not found/parsable
    return 200;
  };

  return (
    <div className="main-panel"> {/* Container with flex-grow: 1, flex-direction: column */}
      {/*
        Allotment handles the resizable split.
        The 'vertical' prop means the separator moves up/down.
        The sizes array provides initial proportional distribution or fixed sizes.
        Giving the terminal pane a fixed initial size based on CSS var.
      */}
      <Allotment vertical>
        <Allotment.Pane>
          {/* Editor takes up the remaining space initially */}
          <EditorPanel />
        </Allotment.Pane>
        <Allotment.Pane
          preferredSize={getTerminalInitialSize()} // Use helper function for initial size
          minSize={50} // Prevent terminal from becoming too small
          // maxSize={600} // Optional: Limit terminal max height
          snap // Enable snapping when near the edges or minimum/maximum size
        >
          <TerminalPanel />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default MainPanel;
// --- END FILE: src/renderer/components/MainPanel.tsx ---