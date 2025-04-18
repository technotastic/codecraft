// src/renderer/components/TerminalPanel.tsx
import React, { useRef, useEffect } from 'react';
import { Terminal, ITerminalOptions, ITheme } from 'xterm'; // Import ITheme
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme

// Define base terminal options that don't depend on the theme
const baseTerminalOptions: Omit<ITerminalOptions, 'theme'> = {
    cursorBlink: true,
    fontFamily: 'var(--font-family-mono)', // Use CSS variable
    fontSize: 13, // Adjust as needed, or use CSS variable if preferred
    scrollback: 1000,
    // Rows/Cols are determined by FitAddon + container size
};

// Define theme configurations for XTerm
const terminalThemes: Record<string, ITheme> = {
    light: {
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selectionBackground: '#d5e5f6', // Match CSS var if possible
        selectionForeground: '#000000',
        // Add other ANSI colors if needed
    },
    dark: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        selectionBackground: '#094771', // Match CSS var if possible
        selectionForeground: '#ffffff',
        // Add other ANSI colors if needed
    },
    'win95-placeholder': { // Example for Win95
        background: '#000080', // Classic blue
        foreground: '#c0c0c0', // Light grey/silver
        cursor: '#c0c0c0',
        selectionBackground: '#c0c0c0', // Often inverse
        selectionForeground: '#000080',
        // Add other ANSI colors if needed
    }
};

const TerminalPanel: React.FC = () => {
    const { theme } = useTheme(); // Get the current theme
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const fitAddon = useRef(new FitAddon());
    const effect2Cleanupables = useRef<Array<() => void>>([]);

    // Effect 1: Create Terminal Instance & Request Backend PTY
    useEffect(() => {
        if (terminalInstanceRef.current === null && terminalContainerRef.current) {
            console.log("Effect 1: Creating Frontend Terminal instance.");
            const container = terminalContainerRef.current;
            container.innerHTML = ''; // Clear previous content if any

            // Combine base options with the current theme's configuration
            const currentTerminalTheme = terminalThemes[theme] || terminalThemes['dark']; // Fallback to dark
            const termOptions: ITerminalOptions = {
                ...baseTerminalOptions,
                theme: currentTerminalTheme,
            };

            const term = new Terminal(termOptions);
            terminalInstanceRef.current = term;

            term.open(container);
            console.log("Effect 1: Frontend Terminal instance created and attached.");

            // --- Load FitAddon ---
            try {
                term.loadAddon(fitAddon.current);
                console.log("Effect 1: FitAddon loaded.");
            } catch (e) { console.warn("FitAddon load failed:", e); }

            // --- Initial Fit and PTY Creation ---
            let initialCols = 80;
            let initialRows = 24;
            setTimeout(() => {
                try {
                    fitAddon.current.fit();
                    initialCols = term.cols;
                    initialRows = term.rows;
                    console.log(`Effect 1: Initial fit complete. Dimensions: ${initialCols}x${initialRows}`);

                    console.log("Effect 1: Requesting backend PTY creation...");
                    term.writeln("Connecting to backend shell...");
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
            }, 50);
        }

        return () => {
            console.log("Effect 1 Cleanup: Disposing frontend terminal instance.");
            terminalInstanceRef.current?.dispose();
            terminalInstanceRef.current = null;
        };
    // Run only on mount, theme changes handled by separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

     // Effect 2: Setup IPC Listeners, Input Forwarding, and Resizing
     useEffect(() => {
        const term = terminalInstanceRef.current;
        const container = terminalContainerRef.current;

        if (term && container) {
            console.log("Effect 2: Setting up IPC listeners, input forwarding, and resize observer...");
            effect2Cleanupables.current.forEach(cleanup => cleanup());
            effect2Cleanupables.current = [];

            const unsubscribeOnData = window.electronAPI.term_onData((data) => term.write(data));
            effect2Cleanupables.current.push(unsubscribeOnData);

            const unsubscribeOnExit = window.electronAPI.term_onExit((code) => term.writeln(`\n\n[Process exited with code ${code ?? 'N/A'}]`));
            effect2Cleanupables.current.push(unsubscribeOnExit);

            const dataListener = term.onData((data: string) => window.electronAPI.term_write(data));
            // No need to add dataListener to cleanupables if terminal dispose handles it

            let resizeObserver: ResizeObserver | null = new ResizeObserver(() => {
                console.log("Resize Observer triggered.");
                try {
                    if (!terminalInstanceRef.current) return;
                    fitAddon.current.fit();
                    console.log(`Resized Frontend. Sending dimensions to backend: ${term.cols}x${term.rows}`);
                    window.electronAPI.term_resize({ cols: term.cols, rows: term.rows });
                } catch (e) { console.error("Resize handling error:", e); }
            });
            resizeObserver.observe(container);
            effect2Cleanupables.current.push(() => { resizeObserver?.disconnect(); resizeObserver = null; });

            return () => {
                console.log('Effect 2: Cleaning up IPC listeners and observer...');
                effect2Cleanupables.current.forEach(cleanup => cleanup());
                effect2Cleanupables.current = [];
                 try { dataListener?.dispose(); } catch (e) { /* ignore */ }
            };
        } else {
             console.log("Effect 2: Waiting for terminal instance and container...");
        }
    // Rerun effect if the terminal instance becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalInstanceRef.current]); // Dependency only on terminal instance ref's presence

    // Effect 3: Handle Theme Changes for Existing Terminal
    useEffect(() => {
        const term = terminalInstanceRef.current;
        if (term) {
            console.log(`Effect 3: Applying theme '${theme}' to terminal.`);
            const currentTerminalTheme = terminalThemes[theme] || terminalThemes['dark']; // Fallback needed
            term.options.theme = currentTerminalTheme;
            // Optionally force a refresh if theme change doesn't apply automatically
            // term.refresh(0, term.rows - 1);
        }
    }, [theme]); // Rerun whenever the theme changes

    // Effect 4: Final Unmount Cleanup (no change needed here)
    useEffect(() => {
        return () => {
            console.log("Effect 4: Component unmounting. Disposing terminal from ref.");
             try { fitAddon.current?.dispose(); } catch(e) { /* ignore */ }
             if (terminalInstanceRef.current) {
                terminalInstanceRef.current.dispose();
                terminalInstanceRef.current = null;
                console.log("Effect 4: Terminal instance from ref disposed and ref cleared.");
            }
        };
    }, []);


    return (
        <div className="terminal-panel" ref={terminalContainerRef}></div>
    );
};

export default TerminalPanel;