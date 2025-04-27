// src/renderer/components/MainPanel.tsx
import React from 'react';
import { Allotment } from 'allotment';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
import TabContainer from './TabContainer';
import TerminalTabContainer from './TerminalTabContainer';
import { useTerminals } from '../contexts/TerminalContext';

// Helper function (remains same)
const getTerminalInitialSize = (): number => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') { try { const heightValue = getComputedStyle(document.documentElement).getPropertyValue('--terminal-height')?.trim(); if (heightValue) return parseInt(heightValue.replace('px', ''), 10) || 200; } catch (e) { /* ignore */ } } return 200;
};

// --- Define Props Interface ---
interface MainPanelProps {
    setCurrentFolderPath: (path: string | null) => void; // Expect the setter function
}

// --- Apply Props Type to the Component ---
const MainPanel: React.FC<MainPanelProps> = ({ setCurrentFolderPath }) => { // <<< Use React.FC<MainPanelProps>
    const { openTerminals, activeTerminalId } = useTerminals();

    return (
        <div className="main-panel">
            {/* 1. Editor Tab Container */}
            <TabContainer />

            {/* 2. Allotment for Editor/Terminal Split */}
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                <Allotment vertical>
                    {/* Editor Pane */}
                    <Allotment.Pane minSize={100}>
                        {/* Pass setter down to EditorPanel */}
                        <EditorPanel setCurrentFolderPath={setCurrentFolderPath} />
                    </Allotment.Pane>

                    {/* Terminal Pane (Remains same) */}
                    <Allotment.Pane
                        preferredSize={getTerminalInitialSize()}
                        minSize={50}
                        snap
                    >
                        <div className="terminal-area-container">
                            <TerminalTabContainer />
                            <div className="terminal-panels-wrapper">
                                {openTerminals.length === 0 && ( <div className="terminal-placeholder"> Click the '+' button to open a new terminal. </div> )}
                                {openTerminals.map(terminal => (
                                    <div key={terminal.id} className={`terminal-panel-instance ${terminal.id === activeTerminalId ? 'active' : ''}`} >
                                        <TerminalPanel id={terminal.id} isActive={terminal.id === activeTerminalId} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Allotment.Pane>
                </Allotment>
            </div>
        </div>
    );
};

export default MainPanel;