// --- START FILE: src/renderer/components/MainPanel.tsx ---
import React from 'react';
import { Allotment } from 'allotment';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
import TabContainer from './TabContainer'; // Import the new TabContainer

// Helper function to get initial terminal size hint from CSS variable
const getTerminalInitialSize = (): number => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const heightValue = getComputedStyle(document.documentElement)
                              .getPropertyValue('--terminal-height')?.trim();
        if (heightValue) {
          return parseInt(heightValue.replace('px', ''), 10) || 200;
        }
      } catch (e) { console.error("Error getting terminal height CSS variable:", e); }
    }
    return 200;
};

const MainPanel: React.FC = () => {
  return (
    // Container now needs to allow TabContainer AND Allotment
    <div className="main-panel">
      {/* 1. Render the Tab Container */}
      <TabContainer />

      {/* 2. Allotment for Editor/Terminal Split */}
      {/* Make Allotment take remaining space */}
      <div style={{ flexGrow: 1, overflow: 'hidden' }}>
        <Allotment vertical>
          <Allotment.Pane>
            {/* Editor takes up the remaining space initially */}
            <EditorPanel />
          </Allotment.Pane>
          <Allotment.Pane
            preferredSize={getTerminalInitialSize()}
            minSize={50}
            snap
          >
            <TerminalPanel />
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
};

export default MainPanel;
// --- END FILE: src/renderer/components/MainPanel.tsx ---