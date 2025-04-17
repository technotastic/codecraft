// src/renderer/components/MainPanel.tsx
import React from 'react';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';

const MainPanel: React.FC = () => {
  return (
    <div className="main-panel">
      <EditorPanel />
      <TerminalPanel />
    </div>
  );
};

export default MainPanel;