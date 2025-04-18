// src/renderer/components/TerminalPanel.tsx
import React, { useRef, useEffect } from 'react';
import { Terminal, ITerminalOptions, ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useTheme, ThemeName } from '../contexts/ThemeContext'; // Import ThemeName

const baseTerminalOptions: Omit<ITerminalOptions, 'theme'> = {
    cursorBlink: true,
    fontFamily: 'var(--font-family-mono)',
    fontSize: 13, // This might need adjustment based on theme via useEffect later
    scrollback: 1000,
};

// Define theme configurations for XTerm
const terminalThemes: Record<ThemeName, ITheme> = { // Use ThemeName as key type
    light: {
        background: '#ffffff', // Corresponds to --color-bg-terminal in :root
        foreground: '#333333', // Corresponds to --color-text-terminal in :root
        cursor: '#333333',
        selectionBackground: '#d5e5f6', // Corresponds to --color-bg-selected in :root
        selectionForeground: '#000000',
    },
    dark: {
        background: '#1e1e1e', // Corresponds to --color-bg-terminal in .theme-dark
        foreground: '#cccccc', // Corresponds to --color-text-terminal in .theme-dark
        cursor: '#cccccc',
        selectionBackground: '#094771', // Corresponds to --color-bg-selected in .theme-dark
        selectionForeground: '#ffffff',
    },
    win95: { // Corresponds to .theme-win95 variables
        background: '#000080',
        foreground: '#c0c0c0',
        cursor: '#c0c0c0',
        selectionBackground: '#c0c0c0',
        selectionForeground: '#000080',
        // ANSI colors could be added for more accuracy
    },
    pipboy: { // Corresponds to .theme-pipboy variables
        background: '#0a1a0f', // --pipboy-bg
        foreground: '#15ff60', // --pipboy-green
        cursor: '#15ff60',
        cursorAccent: '#0a1a0f',
        selectionBackground: '#10b445', // --pipboy-green-dark
        selectionForeground: '#0a1a0f', // --pipboy-bg
    },
    mirc: { // Corresponds to .theme-mirc variables
        background: '#000000', // Usually black background
        foreground: '#00ff00', // Green text
        cursor: '#00ff00',
        selectionBackground: '#008000', // Dark green selection
        selectionForeground: '#ffffff',
    }
};

const TerminalPanel: React.FC = () => {
    const { theme } = useTheme();
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const fitAddon = useRef(new FitAddon());
    const effect2Cleanupables = useRef<Array<() => void>>([]);

    // Effect 1: Create Terminal Instance & Request Backend PTY
    useEffect(() => {
        // ... (keep logic inside the same, it already uses the theme variable) ...
        if (terminalInstanceRef.current === null && terminalContainerRef.current) {
            console.log("Effect 1: Creating Frontend Terminal instance.");
            const container = terminalContainerRef.current;
            container.innerHTML = '';

            // Theme is selected here based on initial state
            const currentTerminalTheme = terminalThemes[theme] || terminalThemes['dark'];
            const termOptions: ITerminalOptions = {
                ...baseTerminalOptions,
                // Use font size variable from CSS maybe? Requires access or another approach
                // fontSize: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size-terminal').trim()) || 13,
                theme: currentTerminalTheme,
            };

            const term = new Terminal(termOptions);
            terminalInstanceRef.current = term;

            term.open(container);
            console.log("Effect 1: Frontend Terminal instance created and attached.");

            try {
                term.loadAddon(fitAddon.current);
                console.log("Effect 1: FitAddon loaded.");
            } catch (e) { console.warn("FitAddon load failed:", e); }

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
                        .then((result) => { // Check result from preload
                            if (result?.success) {
                                console.log("Effect 1: Backend PTY creation request successful.");
                                term.focus();
                            } else {
                                console.error("Effect 1: Backend PTY creation request failed:", result?.error);
                                term.writeln(`\nFailed to create backend shell: ${result?.error || 'Unknown error'}`);
                            }
                        })
                        .catch(err => {
                            console.error("Effect 1: IPC Backend PTY creation request failed:", err);
                            term.writeln(`\nIPC Error creating backend shell: ${err.message || err}`);
                        });

                } catch (e) { console.warn("Initial fit failed:", e); }
            }, 50);
        }

        return () => {
            console.log("Effect 1 Cleanup: Disposing frontend terminal instance.");
            terminalInstanceRef.current?.dispose();
            terminalInstanceRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    // Effect 2: Setup IPC Listeners, Input Forwarding, and Resizing
    // ... (keep effect 2 logic the same) ...
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

            // Add error listener
            const unsubscribeOnError = window.electronAPI.term_onError((errorMessage) => term.writeln(`\n\n[PTY Error: ${errorMessage}]`));
            effect2Cleanupables.current.push(unsubscribeOnError);


            const dataListener = term.onData((data: string) => window.electronAPI.term_write(data));

            let resizeObserver: ResizeObserver | null = new ResizeObserver(() => {
                // Debounce or throttle this if it fires too rapidly
                try {
                    if (!terminalInstanceRef.current || !fitAddon.current) return;
                     fitAddon.current.fit(); // Use fit addon ref
                     // Only send if cols/rows actually changed?
                    // console.log(`Resized Frontend. Sending dimensions to backend: ${term.cols}x${term.rows}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalInstanceRef.current]);

    // Effect 3: Handle Theme Changes for Existing Terminal
    // ... (keep effect 3 logic the same) ...
    useEffect(() => {
        const term = terminalInstanceRef.current;
        if (term) {
            console.log(`Effect 3: Applying theme '${theme}' to terminal.`);
            const currentTerminalTheme = terminalThemes[theme] || terminalThemes['dark'];
            term.options.theme = currentTerminalTheme;

            // Also update font size if desired, maybe based on CSS vars
             const newFontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size-terminal').replace('px','').trim()) || 13;
             if (term.options.fontSize !== newFontSize) {
                 term.options.fontSize = newFontSize;
                 // Need to refit after font size change
                 setTimeout(() => fitAddon.current?.fit(), 0);
             }

        }
    }, [theme]); // Rerun whenever the theme changes


    // Effect 4: Final Unmount Cleanup
    // ... (keep effect 4 logic the same) ...
    useEffect(() => {
        return () => {
            console.log("Effect 4: Component unmounting. Disposing terminal from ref.");
             try { fitAddon.current?.dispose(); } catch(e) { /* ignore */ }
             if (terminalInstanceRef.current) {
                terminalInstanceRef.current.dispose();
                terminalInstanceRef.current = null;
                console.log("Effect 4: Terminal instance from ref disposed and ref cleared.");
            }
             // Clean up any remaining listeners just in case
            effect2Cleanupables.current.forEach(cleanup => cleanup());
            effect2Cleanupables.current = [];
        };
    }, []);


    return (
        <div className="terminal-panel" ref={terminalContainerRef}></div>
    );
};

export default TerminalPanel;