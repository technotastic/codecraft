import React from 'react';
import { Allotment } from 'allotment';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
import TabContainer from './TabContainer'; // Editor tabs
import TerminalTabContainer from './TerminalTabContainer'; // Terminal tabs
import { useTerminals } from '../contexts/TerminalContext'; // To get active terminal ID and list

// Helper function to get initial terminal size hint
const getTerminalInitialSize = (): number => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const heightValue = getComputedStyle(document.documentElement)
                              .getPropertyValue('--terminal-height')?.trim();
        if (heightValue) return parseInt(heightValue.replace('px', ''), 10) || 200;
      } catch (e) { /* ignore */ }
    }
    return 200;
};

const MainPanel: React.FC = () => {
    // Get the full list of terminals and the active ID
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
                        <EditorPanel />
                    </Allotment.Pane>

                    {/* Terminal Pane: Contains tabs AND ALL terminal instances */}
                    <Allotment.Pane
                        preferredSize={getTerminalInitialSize()}
                        minSize={50}
                        snap
                    >
                        <div className="terminal-area-container">
                            {/* Render Terminal Tabs */}
                            <TerminalTabContainer />

                            {/* Wrapper for ALL terminal panel instances */}
                            <div className="terminal-panels-wrapper">
                                {openTerminals.length === 0 && (
                                     <div className="terminal-placeholder">
                                         Click the '+' button to open a new terminal.
                                     </div>
                                )}
                                {openTerminals.map(terminal => (
                                    <div
                                        key={terminal.id} // Key on the wrapper div
                                        // Apply 'active' class conditionally for CSS visibility
                                        className={`terminal-panel-instance ${terminal.id === activeTerminalId ? 'active' : ''}`}
                                    >
                                        <TerminalPanel
                                            id={terminal.id}
                                            isActive={terminal.id === activeTerminalId}
                                        />
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