// --- START FILE: src/renderer/components/TerminalPanel.tsx ---
import React, { useRef, useEffect, useState } from 'react'; // Import useState
import { Terminal, ITerminalOptions, ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useTheme, ThemeName } from '../contexts/ThemeContext'; // Import ThemeName

const baseTerminalOptions: Omit<ITerminalOptions, 'theme'> = {
    cursorBlink: true,
    fontFamily: 'var(--font-family-mono)', // Use CSS var for consistency
    // fontSize is now handled dynamically in useEffect based on CSS var
    scrollback: 1000,
    convertEol: true, // Useful for Windows
};

// Define theme configurations for XTerm using hardcoded values from index.css
const terminalThemes: Record<ThemeName, ITheme> = { // Use ThemeName as key type
    light: { // Matches :root
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selectionBackground: '#d5e5f6',
        selectionForeground: '#000000',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
    },
    dark: { // Matches .theme-dark
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        selectionBackground: '#094771',
        selectionForeground: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
    },
    win95: { // Matches .theme-win95 terminal colors
        background: '#000080', // Blue background
        foreground: '#c0c0c0', // Light gray text
        cursor: '#c0c0c0',
        selectionBackground: '#c0c0c0', // Inverted selection
        selectionForeground: '#000080',
        // Basic ANSI
        black: '#000000', red: '#800000', green: '#008000', yellow: '#808000',
        blue: '#000080', magenta: '#800080', cyan: '#008080', white: '#c0c0c0',
        brightBlack: '#808080', brightRed: '#ff0000', brightGreen: '#00ff00', brightYellow: '#ffff00',
        brightBlue: '#0000ff', brightMagenta: '#ff00ff', brightCyan: '#00ffff', brightWhite: '#ffffff',
    },
    pipboy: { // Matches .theme-pipboy terminal colors
        background: '#0a1a0f', // --pipboy-bg
        foreground: '#15ff60', // --pipboy-green
        cursor: '#15ff60',
        cursorAccent: '#0a1a0f',
        selectionBackground: '#10b445', // --pipboy-green-dark
        selectionForeground: '#0a1a0f', // --pipboy-bg
        // Make ANSI colors shades of green
        black: '#050d07', red: '#0a702a', green: '#15ff60', yellow: '#10b445',
        blue: '#0a702a', magenta: '#10b445', cyan: '#15ff60', white: '#a0ffc0', // Lighter green
        brightBlack: '#0a702a', brightRed: '#10b445', brightGreen: '#a0ffc0', brightYellow: '#e0ffe0', // Very light
        brightBlue: '#10b445', brightMagenta: '#a0ffc0', brightCyan: '#e0ffe0', brightWhite: '#ffffff',
    },
    mirc: { // Matches .theme-mirc terminal colors
        background: '#000000', // Black background
        foreground: '#00ff00', // Green text
        cursor: '#00ff00',
        selectionBackground: '#008000', // Dark green selection
        selectionForeground: '#ffffff',
        // Similar to win95 but with green default fg
        black: '#000000', red: '#800000', green: '#008000', yellow: '#808000',
        blue: '#000080', magenta: '#800080', cyan: '#008080', white: '#c0c0c0',
        brightBlack: '#808080', brightRed: '#ff0000', brightGreen: '#00ff00', brightYellow: '#ffff00',
        brightBlue: '#0000ff', brightMagenta: '#ff00ff', brightCyan: '#00ffff', brightWhite: '#ffffff',
    },
    qbasic: { // Matches .theme-qbasic terminal colors
        background: '#0000AA', // Blue background
        foreground: '#FFFF55', // Yellow text
        cursor: '#FFFFFF', // White cursor
        selectionBackground: '#555555', // Dark gray selection
        selectionForeground: '#FFFFFF',
        // Basic ANSI, maybe adjusted?
        black: '#000000', red: '#AA0000', green: '#00AA00', yellow: '#AA5500',
        blue: '#0000AA', magenta: '#AA00AA', cyan: '#00AAAA', white: '#AAAAAA',
        brightBlack: '#555555', brightRed: '#FF5555', brightGreen: '#55FF55', brightYellow: '#FFFF55',
        brightBlue: '#5555FF', brightMagenta: '#FF55FF', brightCyan: '#55FFFF', brightWhite: '#FFFFFF',
    },
    orange: { // Matches .theme-orange terminal colors
        background: '#201500', // Dark background
        foreground: '#FFA500', // Bright Orange text
        cursor: '#FFA500',
        cursorAccent: '#201500',
        selectionBackground: '#D98C00', // Medium orange selection
        selectionForeground: '#201500',
        // Make ANSI colors shades of orange/brown
        black: '#100A00', red: '#D98C00', green: '#FFA500', yellow: '#FFC04D', // Lighter orange
        blue: '#D98C00', magenta: '#FFA500', cyan: '#FFC04D', white: '#FFE0B3', // Pale orange
        brightBlack: '#5A3D00', brightRed: '#FFC04D', brightGreen: '#FFE0B3', brightYellow: '#FFF5E0', // Very pale
        brightBlue: '#FFC04D', brightMagenta: '#FFE0B3', brightCyan: '#FFF5E0', brightWhite: '#FFFFFF',
    },
    cga: { // Matches .theme-cga terminal colors
        background: '#000000', // Black background
        foreground: '#55FFFF', // Cyan text
        cursor: '#FFFFFF', // White cursor
        selectionBackground: '#55FFFF', // Cyan selection
        selectionForeground: '#000000', // Black text on selection
        // CGA Palette 1 (High Intensity)
        black: '#000000', red: '#FF5555', green: '#55FF55', yellow: '#FFFF55',
        blue: '#5555FF', magenta: '#FF55FF', cyan: '#55FFFF', white: '#FFFFFF',
        brightBlack: '#555555', brightRed: '#FF5555', brightGreen: '#55FF55', brightYellow: '#FFFF55',
        brightBlue: '#5555FF', brightMagenta: '#FF55FF', brightCyan: '#55FFFF', brightWhite: '#FFFFFF',
    },
    atari: { // Matches .theme-atari terminal colors
        background: '#000000', // Black background
        foreground: '#3FFFCF', // Cyan text
        cursor: '#D87050', // Orange cursor
        selectionBackground: '#D87050', // Orange selection
        selectionForeground: '#000000',
        // Atari-like colors
        black: '#000000', red: '#D87050', green: '#3FFFCF', yellow: '#D8D850',
        blue: '#5070D8', magenta: '#D870D8', cyan: '#3FFFCF', white: '#AAAAAA',
        brightBlack: '#444444', brightRed: '#F0A080', brightGreen: '#7FFFEF', brightYellow: '#F0F080',
        brightBlue: '#80A0F0', brightMagenta: '#F0A0F0', brightCyan: '#7FFFEF', brightWhite: '#FFFFFF',
    },
    snes: { // Matches .theme-snes terminal colors
        background: '#2F2F4F', // Dark purplish gray bg
        foreground: '#E0E0FF', // Light lavender text
        cursor: '#E0E040', // Yellow cursor
        selectionBackground: '#8080FF', // Purple selection
        selectionForeground: '#2F2F4F',
        // SNES-like accents
        black: '#101020', red: '#E04040', green: '#40C040', yellow: '#E0E040',
        blue: '#8080FF', magenta: '#C080FF', cyan: '#80C0FF', white: '#E0E0FF',
        brightBlack: '#505070', brightRed: '#FF7070', brightGreen: '#70F070', brightYellow: '#F0F070',
        brightBlue: '#B0B0FF', brightMagenta: '#F0B0FF', brightCyan: '#B0F0FF', brightWhite: '#FFFFFF',
    },
    bw_tv: { // Matches .theme-bw_tv terminal colors
        background: '#000000', // Black background
        foreground: '#cccccc', // Light gray text
        cursor: '#ffffff', // White cursor
        selectionBackground: '#cccccc', // Light gray selection
        selectionForeground: '#000000', // Black text on selection
        // Greyscale ANSI
        black: '#000000', red: '#888888', green: '#aaaaaa', yellow: '#bbbbbb',
        blue: '#888888', magenta: '#aaaaaa', cyan: '#bbbbbb', white: '#cccccc',
        brightBlack: '#555555', brightRed: '#aaaaaa', brightGreen: '#cccccc', brightYellow: '#dddddd',
        brightBlue: '#aaaaaa', brightMagenta: '#cccccc', brightCyan: '#dddddd', brightWhite: '#ffffff',
    }
};

const TerminalPanel: React.FC = () => {
    const { theme } = useTheme(); // theme object from context includes theme name and font size modifier
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null); // Hold FitAddon instance
    const effect2Cleanupables = useRef<Array<() => void>>([]);
    const [isPtyCreated, setIsPtyCreated] = useState(false); // Track PTY creation

    // Helper function to get terminal font size from CSS variable
    const getTerminalFontSize = (): number => {
        // Use the --font-size-terminal CSS variable which is updated by ThemeContext
        const fontSizeValue = getComputedStyle(document.documentElement).getPropertyValue('--font-size-terminal');
        return parseInt(fontSizeValue?.replace('px', '').trim() || '13', 10); // Default to 13px
    };


    // Effect 1: Create Terminal Instance (NO PTY CREATION HERE)
    useEffect(() => {
        let isMounted = true;
        if (terminalInstanceRef.current === null && terminalContainerRef.current) {
            console.log("Effect 1: Creating Frontend Terminal instance.");
            const container = terminalContainerRef.current;
            container.innerHTML = ''; // Clear previous instance if any lingered

            // Theme/Fontsize are set initially in Effect 3 now
            const initialTermOptions: ITerminalOptions = {
                ...baseTerminalOptions,
                // Set placeholder theme/size, will be overwritten by Effect 3
                theme: terminalThemes.dark,
                fontSize: 13,
            };

            const term = new Terminal(initialTermOptions);
            terminalInstanceRef.current = term;

            // Create and store FitAddon instance
            fitAddonRef.current = new FitAddon();
            term.loadAddon(fitAddonRef.current);

            term.open(container);
            console.log("Effect 1: Frontend Terminal instance created and attached.");
            // NOTE: No fit or term_create here anymore
        }

        return () => {
            isMounted = false; // Mark as unmounted
            console.log("Effect 1 Cleanup: Disposing frontend terminal instance.");
            // Dispose addon first
            try { fitAddonRef.current?.dispose(); fitAddonRef.current = null; } catch(e) {/* ignore */}
            // Dispose terminal
            terminalInstanceRef.current?.dispose();
            terminalInstanceRef.current = null;
            setIsPtyCreated(false); // Reset PTY status on unmount
        };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect 2: Setup IPC Listeners, Input Forwarding, and Resizing
    useEffect(() => {
        const term = terminalInstanceRef.current;
        const container = terminalContainerRef.current;
        let isEffect2Mounted = true; // Scope mount status to this effect

        if (term && container) {
            console.log("Effect 2: Setting up IPC listeners, input forwarding, and resize observer...");
            // Clear previous listeners from this effect
            effect2Cleanupables.current.forEach(cleanup => cleanup());
            effect2Cleanupables.current = [];

            const unsubscribeOnData = window.electronAPI.term_onData((data) => {
                if(isEffect2Mounted && terminalInstanceRef.current) terminalInstanceRef.current.write(data)
            });
            effect2Cleanupables.current.push(unsubscribeOnData);

            const unsubscribeOnExit = window.electronAPI.term_onExit((code) => {
                 if(isEffect2Mounted && terminalInstanceRef.current) {
                    terminalInstanceRef.current.writeln(`\n\n[Process exited with code ${code ?? 'N/A'}]`);
                    setIsPtyCreated(false); // Allow recreation if process exits
                 }
             });
            effect2Cleanupables.current.push(unsubscribeOnExit);

            const unsubscribeOnError = window.electronAPI.term_onError((errorMessage) => {
                 if(isEffect2Mounted && terminalInstanceRef.current) {
                    terminalInstanceRef.current.writeln(`\n\n[PTY Error: ${errorMessage}]`);
                 }
             });
            effect2Cleanupables.current.push(unsubscribeOnError);

            const dataListener = term.onData((data: string) => {
                // Only send if still mounted conceptually
                if (isEffect2Mounted) window.electronAPI.term_write(data)
            });

            // Resize Observer
            let resizeTimeout: NodeJS.Timeout | null = null;
            const resizeObserver = new ResizeObserver(() => {
                // Debounce resize event
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    // Check refs inside the debounced function
                    if (!isEffect2Mounted || !terminalInstanceRef.current || !fitAddonRef.current) return;
                    try {
                        console.log("ResizeObserver: Fitting terminal"); // Add log
                        fitAddonRef.current.fit();
                        // Send resize only if PTY exists
                        if (isPtyCreated) {
                           console.log(`ResizeObserver: Sending dimensions ${terminalInstanceRef.current.cols}x${terminalInstanceRef.current.rows}`); // Add log
                           window.electronAPI.term_resize({ cols: terminalInstanceRef.current.cols, rows: terminalInstanceRef.current.rows });
                        }
                    } catch (e) { console.error("Resize handling error:", e); }
                }, 150); // Increased debounce slightly
            });
            resizeObserver.observe(container);
            effect2Cleanupables.current.push(() => {
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeObserver.disconnect();
            });

            return () => {
                isEffect2Mounted = false; // Mark as unmounted for this effect's scope
                console.log('Effect 2 Cleanup: Cleaning up IPC listeners and observer...');
                effect2Cleanupables.current.forEach(cleanup => cleanup());
                effect2Cleanupables.current = [];
                try { dataListener?.dispose(); } catch (e) { /* ignore */ }
            };
        } else {
             console.log("Effect 2: Waiting for terminal instance and container...");
        }
    // Re-run if terminal instance ref *itself* changes OR isPtyCreated changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalInstanceRef.current, isPtyCreated]);

    // Effect 3: Handle Theme/Font Changes & INITIAL PTY CREATION
    useEffect(() => {
        const term = terminalInstanceRef.current;
        const addon = fitAddonRef.current;

        if (term && addon) {
            const currentThemeName = theme; // Extract theme name from context object
            const currentTerminalTheme = terminalThemes[currentThemeName] || terminalThemes['dark'];
            const currentFontSize = getTerminalFontSize(); // Get font size based on CSS var
            let fontChanged = false;

            // Update theme if needed
            if (term.options.theme !== currentTerminalTheme) {
                console.log(`Effect 3: Updating terminal theme to ${currentThemeName}`);
                term.options.theme = currentTerminalTheme;
            }

            // Update font size if needed
            if (term.options.fontSize !== currentFontSize) {
                console.log(`Effect 3: Updating terminal font size to ${currentFontSize}px`);
                term.options.fontSize = currentFontSize;
                fontChanged = true; // Mark that font size changed
            }

            // Perform fit & PTY creation *only* on the first run after mount OR if font size changed
            const performFitAndCreate = () => {
                try {
                    console.log("Effect 3: Fitting terminal...");
                    addon.fit();
                    const initialCols = term.cols;
                    const initialRows = term.rows;
                    console.log(`Effect 3: Fit complete. Dimensions: ${initialCols}x${initialRows}`);

                    // --- Create PTY only if not already created ---
                    if (!isPtyCreated && initialCols > 0 && initialRows > 0) {
                        console.log("Effect 3: Requesting backend PTY creation...");
                        term.writeln("Connecting to backend shell..."); // Give feedback
                        window.electronAPI.term_create({ cols: initialCols, rows: initialRows })
                            .then((result) => {
                                // Check if component is still mounted and PTY wasn't created concurrently
                                if (terminalInstanceRef.current && !isPtyCreated) {
                                    if (result?.success) {
                                        console.log("Effect 3: Backend PTY creation request successful.");
                                        setIsPtyCreated(true); // Mark as created
                                        terminalInstanceRef.current?.focus();
                                    } else {
                                        console.error("Effect 3: Backend PTY creation request failed:", result?.error);
                                        terminalInstanceRef.current?.writeln(`\nFailed to create backend shell: ${result?.error || 'Unknown error'}`);
                                    }
                                }
                            })
                            .catch(err => {
                                if (terminalInstanceRef.current) { // Check ref exists
                                     console.error("Effect 3: IPC Backend PTY creation request failed:", err);
                                     terminalInstanceRef.current?.writeln(`\nIPC Error creating backend shell: ${err.message || err}`);
                                }
                            });
                    } else if (isPtyCreated) {
                        // If PTY already exists and font changed, just resize
                        console.log(`Effect 3: PTY exists, sending resize ${initialCols}x${initialRows}`);
                        window.electronAPI.term_resize({ cols: initialCols, rows: initialRows });
                    } else if (initialCols <= 0 || initialRows <= 0) {
                         console.warn(`Effect 3: Skipping PTY creation due to invalid dimensions: ${initialCols}x${initialRows}`);
                         // Maybe schedule a retry after a short delay?
                         // setTimeout(performFitAndCreate, 300); // Example retry
                    }

                } catch (e) {
                    console.warn("Effect 3: Fit or PTY creation/resize failed:", e);
                }
            };

            // If font changed, always refit/resize.
            // If it's the initial run (isPtyCreated is false), also fit/create.
            if (fontChanged || !isPtyCreated) {
                 // Use RAF to ensure DOM updates are applied before fit
                 requestAnimationFrame(performFitAndCreate);
            }
        }
    // Dependency includes the theme object and isPtyCreated state
    }, [theme, isPtyCreated]);


    return (
        // Ensure the container takes full space of its parent (.terminal-panel)
        <div className="terminal-panel-container" ref={terminalContainerRef} style={{ width: '100%', height: '100%' }}></div>
    );
};

export default TerminalPanel;
// --- END FILE: src/renderer/components/TerminalPanel.tsx ---