// src/renderer/components/MainPanel.tsx
import React from 'react';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';

const MainPanel: React.FC = () => {
  return (
    <div className="main-panel"> {/* Container with flex-direction: column */}
      <EditorPanel />   {/* Child 1: Flexible height */}
      <TerminalPanel /> {/* Child 2: Fixed height */}
    </div>
  );
};

export default MainPanel;