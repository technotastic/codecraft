// src/renderer/components/MainPanel.tsx
import React from 'react';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';

const MainPanel: React.FC = () => {
  // This component simply structures the main area and doesn't
  // need direct access to the theme context itself.
  // Its children (EditorPanel, TerminalPanel) might later.
  return (
    <div className="main-panel"> {/* Container with flex-direction: column */}
      <EditorPanel />   {/* Child 1: Flexible height */}
      <TerminalPanel /> {/* Child 2: Fixed height */}
    </div>
  );
};

export default MainPanel;