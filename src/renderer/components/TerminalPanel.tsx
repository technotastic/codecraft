// src/renderer/components/TerminalPanel.tsx
import React, { useRef, useEffect } from 'react';
import { Terminal, ITerminalOptions } from 'xterm';
import { FitAddon } from 'xterm-addon-fit'; // Import FitAddon again
import 'xterm/css/xterm.css';

const terminalOptions: ITerminalOptions = {
    cursorBlink: true,
    theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
    fontFamily: 'var(--font-family-mono)',
    fontSize: 13,
    // Rows/Cols are determined by FitAddon + container size
    scrollback: 1000,
};

const TerminalPanel: React.FC = () => {
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    // Instantiate FitAddon and store in a ref
    const fitAddon = useRef(new FitAddon());
    // Ref to store cleanup functions from Effect 2
    const effect2Cleanupables = useRef<Array<() => void>>([]);


    // Effect 1: Create Terminal Instance & Request Backend PTY
    useEffect(() => {
        if (terminalInstanceRef.current === null && terminalContainerRef.current) {
            console.log("Effect 1: Creating Frontend Terminal instance.");
            const container = terminalContainerRef.current;
            container.innerHTML = '';

            const term = new Terminal(terminalOptions);
            terminalInstanceRef.current = term;

            term.open(container);
            console.log("Effect 1: Frontend Terminal instance created and attached.");

            // --- Load FitAddon ---
            try {
                term.loadAddon(fitAddon.current); // Use the ref's current value
                console.log("Effect 1: FitAddon loaded.");
            } catch (e) { console.warn("FitAddon load failed:", e); }

            // --- Initial Fit and PTY Creation ---
            let initialCols = 80; // Default fallbacks
            let initialRows = 24;
            // Use setTimeout to allow DOM to settle before first fit
            setTimeout(() => {
                try {
                    fitAddon.current.fit();
                    initialCols = term.cols;
                    initialRows = term.rows;
                    console.log(`Effect 1: Initial fit complete. Dimensions: ${initialCols}x${initialRows}`);

                    // --- Request Backend PTY Creation via IPC ---
                    console.log("Effect 1: Requesting backend PTY creation...");
                    term.writeln("Connecting to backend shell..."); // Moved here to appear after fit
                    window.electronAPI.term_create({ cols: initialCols, rows: initialRows })
                        .then(() => {
                            console.log("Effect 1: Backend PTY creation request successful.");
                            term.focus();
                        })
                        .catch(err => {
                            console.error("Effect 1: Backend PTY creation request failed:", err);
                            term.writeln(`\nFailed to create backend shell: ${err.message || err}`);
                        });

                } catch (e) { console.warn("Initial fit failed:", e); }
            }, 50); // Small delay before first fit and pty create
        }

        // Cleanup for Effect 1 remains the same (dispose terminal instance)
        return () => {
            console.log("Effect 1 Cleanup: Disposing frontend terminal instance.");
            terminalInstanceRef.current?.dispose();
            terminalInstanceRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount


    // Effect 2: Setup IPC Listeners, Input Forwarding, and Resizing
    useEffect(() => {
        const term = terminalInstanceRef.current;
        const container = terminalContainerRef.current;

        if (term && container) {
            console.log("Effect 2: Setting up IPC listeners, input forwarding, and resize observer...");
            // Clear previous listeners first
            effect2Cleanupables.current.forEach(cleanup => cleanup());
            effect2Cleanupables.current = [];

            // 1. Listen for data FROM backend PTY
            const unsubscribeOnData = window.electronAPI.term_onData((data) => {
                term.write(data);
            });
            effect2Cleanupables.current.push(unsubscribeOnData);

            // 2. Listen for exit FROM backend PTY
            const unsubscribeOnExit = window.electronAPI.term_onExit((code) => {
                term.writeln(`\n\n[Process exited with code ${code ?? 'N/A'}]`);
            });
            effect2Cleanupables.current.push(unsubscribeOnExit);

            // 3. Forward input FROM frontend terminal TO backend PTY
            const dataListener = term.onData((data: string) => {
                window.electronAPI.term_write(data);
            });
            // No need to add dataListener to cleanupables if terminal dispose handles it

            // 4. --- Setup Resize Observer ---
            let resizeObserver: ResizeObserver | null = new ResizeObserver(() => {
                console.log("Resize Observer triggered.");
                try {
                    if (!terminalInstanceRef.current) return; // Check if terminal still exists
                     // Use fitAddon ref's current value
                    fitAddon.current.fit();
                    // Send new dimensions to backend PTY
                    console.log(`Resized Frontend. Sending dimensions to backend: ${term.cols}x${term.rows}`);
                    window.electronAPI.term_resize({ cols: term.cols, rows: term.rows });
                } catch (e) { console.error("Resize handling error:", e); }
            });
            resizeObserver.observe(container);
            effect2Cleanupables.current.push(() => { resizeObserver?.disconnect(); resizeObserver = null; });
            // --- End Resize Observer Setup ---

            // Cleanup for THIS effect (IPC listeners, observer)
            return () => {
                console.log('Effect 2: Cleaning up IPC listeners and observer...');
                effect2Cleanupables.current.forEach(cleanup => cleanup());
                effect2Cleanupables.current = [];
                // Dispose dataListener manually if term.dispose() doesn't
                 try { dataListener?.dispose(); } catch (e) { /* ignore */ }
            };
        } else {
             console.log("Effect 2: Waiting for terminal instance and container...");
        }
    // Rerun effect if the terminal instance becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalInstanceRef.current]);


    // Effect 3: Final Unmount Cleanup (no change)
    useEffect(() => {
        return () => {
            console.log("Effect 3: Component unmounting. Disposing terminal from ref.");
             try { fitAddon.current?.dispose(); } catch(e) { /* ignore */ } // Dispose addon on final unmount
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