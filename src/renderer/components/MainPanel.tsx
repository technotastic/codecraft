// --- START FILE: src/renderer/components/MainPanel.tsx ---
import React from 'react';
import { Allotment } from 'allotment';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme

const MainPanel: React.FC = () => {
  // Get access to font size settings if needed by Allotment itself (unlikely needed for now)
  // const { fontSizeModifier } = useTheme();

  // Retrieve terminal height from CSS variable to set initial size hint
  // Note: This is just a HINT. Allotment manages the actual size.
  const getTerminalInitialSize = () => {
    const heightValue = getComputedStyle(document.documentElement)
                          .getPropertyValue('--terminal-height')?.trim() || '200px';
    return parseInt(heightValue.replace('px', ''), 10) || 200;
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
          preferredSize={getTerminalInitialSize()} // Use CSS variable for initial size
          minSize={50} // Prevent terminal from becoming too small
          maxSize={600} // Optional: Limit terminal max height
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