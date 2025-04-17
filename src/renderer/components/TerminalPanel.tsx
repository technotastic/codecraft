// src/renderer/components/TerminalPanel.tsx
import React, { useRef, useEffect } from 'react';
import { Terminal } from 'xterm';
// REMOVED: FitAddon import
import 'xterm/css/xterm.css';

const TerminalPanel: React.FC = () => {
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const effect2Cleanupables = useRef<{ dispose: () => void }[]>([]);

    // Effect 1: Create Terminal Instance
    useEffect(() => {
        if (terminalInstanceRef.current !== null || !terminalContainerRef.current) {
            console.log("Effect 1: Skipping terminal creation.");
            return;
        }
        const container = terminalContainerRef.current;
        console.log("Effect 1: Creating Terminal instance.");
        container.innerHTML = '';
        console.log("Effect 1: Container cleared.");
        const term = new Terminal({
            cursorBlink: true,
            theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
            fontFamily: 'var(--font-family-mono)',
            fontSize: 13,
            rows: 10, scrollback: 1000,
        });
        terminalInstanceRef.current = term;
        term.open(container);
        console.log("Effect 1: Terminal instance created and attached.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect 2: Setup Listeners (NO FitAddon)
    useEffect(() => {
        const term = terminalInstanceRef.current;
        const container = terminalContainerRef.current;
        if (term && container) {
            console.log("Effect 2: Setting up listeners (NO FitAddon)...");
            effect2Cleanupables.current = [];
            if (term.buffer.active.length === 0) {
                term.writeln('Welcome to the CodeCraft Terminal!');
                term.write('$ ');
            }
            const dataListener = term.onData((data: string) => {
                 if (data === '\r') { term.write('\r\n$ '); }
                 else if (data === '\x7f') { if (term.buffer.active.cursorX > 2) { term.write('\b \b'); } }
                 else { term.write(data); }
             });
            effect2Cleanupables.current.push(dataListener);
            term.focus();
            // REMOVED Resize Observer
            return () => {
                console.log('Effect 2: Cleaning up listeners...');
                 effect2Cleanupables.current.forEach(c => c.dispose());
                 effect2Cleanupables.current = [];
            };
        } else {
             console.log("Effect 2: Waiting for terminal instance and container...");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalInstanceRef.current]); // Depend on instance being ready


    // Effect 3: Final Unmount Cleanup
    useEffect(() => {
        return () => {
            console.log("Effect 3: Component unmounting. Disposing terminal.");
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.dispose();
                terminalInstanceRef.current = null;
                console.log("Effect 3: Terminal instance disposed and ref cleared.");
            }
        };
    }, []);

    return (
        <div className="terminal-panel" ref={terminalContainerRef}></div>
    );
};

export default TerminalPanel;