// src/renderer/components/TerminalPanel.tsx
import React, { useRef, useEffect } from 'react';
import { Terminal, ITerminalOptions } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Define Terminal Options separately for clarity
// REMOVED 'rows' from the initial options type as it's not valid here
const terminalOptions: ITerminalOptions = {
    cursorBlink: true,
    theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
    fontFamily: 'var(--font-family-mono)',
    fontSize: 13,
    // rows: 10, // <-- REMOVE THIS LINE
    scrollback: 1000,
};

const TerminalPanel: React.FC = () => {
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const fitAddon = useRef(new FitAddon());
    const ipcListenerCleanupRefs = useRef<Array<() => void>>([]);


    // Effect 1: Create Terminal Instance & Request Backend PTY
    useEffect(() => {
        if (terminalInstanceRef.current === null && terminalContainerRef.current) {
            console.log("Effect 1: Creating Frontend Terminal instance.");
            const container = terminalContainerRef.current;
            container.innerHTML = '';

            // Use the defined options object (without rows)
            const term = new Terminal(terminalOptions);
            terminalInstanceRef.current = term;

            term.open(container);
            console.log("Effect 1: Frontend Terminal instance created and attached.");

            try {
                term.loadAddon(fitAddon.current);
                console.log("Effect 1: FitAddon loaded.");
            } catch (e) { console.warn("FitAddon load failed:", e); }

            let initialCols = term.cols; // Get cols AFTER open/attach
            let initialRows = term.rows; // Get rows AFTER open/attach
            try {
                 fitAddon.current.fit();
                 initialCols = term.cols; // Update dimensions AFTER fitting
                 initialRows = term.rows;
                 console.log(`Effect 1: Initial fit complete. Dimensions: ${initialCols}x${initialRows}`);
            } catch (e) { console.warn("Initial fit failed:", e); }

            console.log("Effect 1: Requesting backend PTY creation...");
            term.writeln("Connecting to backend shell...");
            window.electronAPI.term_create({ cols: initialCols, rows: initialRows })
                .then(() => {
                    console.log("Effect 1: Backend PTY creation request successful (or acknowledged).");
                    term.focus();
                })
                .catch(err => {
                    console.error("Effect 1: Backend PTY creation request failed:", err);
                    term.writeln(`\nFailed to create backend shell: ${err.message || err}`);
                });
        }

        // Cleanup for Effect 1
        return () => {
            console.log("Effect 1 Cleanup: Disposing frontend terminal instance.");
            terminalInstanceRef.current?.dispose();
            terminalInstanceRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Effect 2: Setup IPC Listeners & Frontend Input Forwarding
    useEffect(() => {
        const term = terminalInstanceRef.current;
        const container = terminalContainerRef.current;

        if (term && container) {
            console.log("Effect 2: Setting up IPC listeners and input forwarding...");
            ipcListenerCleanupRefs.current.forEach(cleanup => cleanup());
            ipcListenerCleanupRefs.current = [];

            const unsubscribeOnData = window.electronAPI.term_onData((data) => {
                term.write(data);
            });
            ipcListenerCleanupRefs.current.push(unsubscribeOnData);

            const unsubscribeOnExit = window.electronAPI.term_onExit((code) => {
                term.writeln(`\n\n[Process exited with code ${code ?? 'N/A'}]`);
            });
            ipcListenerCleanupRefs.current.push(unsubscribeOnExit);

            const dataListener = term.onData((data: string) => {
                window.electronAPI.term_write(data);
            });

            let resizeObserver: ResizeObserver | null = new ResizeObserver(() => {
                try {
                    if (!term || !fitAddon.current) return;
                    fitAddon.current.fit();
                    console.log(`Resized Frontend. Sending dimensions to backend: ${term.cols}x${term.rows}`);
                    window.electronAPI.term_resize({ cols: term.cols, rows: term.rows });
                } catch (e) { console.error("Resize handling error:", e); }
            });
            resizeObserver.observe(container);

            // Cleanup for THIS effect
            return () => {
                console.log('Effect 2: Cleaning up IPC listeners, data listener, and observer...');
                dataListener.dispose();
                resizeObserver?.disconnect();
                resizeObserver = null; // Help GC
                ipcListenerCleanupRefs.current.forEach(cleanup => cleanup());
                ipcListenerCleanupRefs.current = [];
            };
        } else {
             console.log("Effect 2: Waiting for frontend terminal instance...");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalInstanceRef.current]); // Re-run if instance becomes available

    // Effect 3: Unmount (No change needed)
    useEffect(() => {
        return () => {
            console.log("Effect 3: Component unmounting. Disposing terminal from ref.");
            // Addon dispose should happen automatically if it was loaded by the terminal instance
             if (terminalInstanceRef.current) {
                terminalInstanceRef.current.dispose();
                terminalInstanceRef.current = null;
                console.log("Effect 3: Terminal instance from ref disposed and ref cleared.");
            }
        };
    }, []);


    return (
        <div className="terminal-panel" ref={terminalContainerRef}></div>
    );
};

export default TerminalPanel;