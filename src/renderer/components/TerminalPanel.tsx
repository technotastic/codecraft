import React, { useRef, useEffect, useCallback, useState } from "react";
import { Terminal, ITerminalOptions, ITheme } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useTheme, ThemeName } from "../contexts/ThemeContext";
import { useTerminals } from "../contexts/TerminalContext";
import process from "process"; // Assuming polyfill is working

// Base options
const baseTerminalOptions: Omit<ITerminalOptions, "theme"> = {
  cursorBlink: true,
  fontFamily: "var(--font-family-mono)",
  scrollback: 1000,
  convertEol: true,
  windowsMode: typeof process !== "undefined" && process.platform === "win32",
  allowProposedApi: true,
};

// Terminal themes (keep as before)
const terminalThemes: Record<ThemeName, ITheme> = {
  light: {
    background: "#ffffff",
    foreground: "#333333",
    cursor: "#333333",
    selectionBackground: "#d5e5f6",
    selectionForeground: "#000000",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#e5e5e5",
  },
  dark: {
    background: "#1e1e1e",
    foreground: "#cccccc",
    cursor: "#cccccc",
    selectionBackground: "#094771",
    selectionForeground: "#ffffff",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#e5e5e5",
  },
  win95: {
    background: "#000080",
    foreground: "#c0c0c0",
    cursor: "#c0c0c0",
    selectionBackground: "#c0c0c0",
    selectionForeground: "#000080",
    black: "#000000",
    red: "#800000",
    green: "#008000",
    yellow: "#808000",
    blue: "#000080",
    magenta: "#800080",
    cyan: "#008080",
    white: "#c0c0c0",
    brightBlack: "#808080",
    brightRed: "#ff0000",
    brightGreen: "#00ff00",
    brightYellow: "#ffff00",
    brightBlue: "#0000ff",
    brightMagenta: "#ff00ff",
    brightCyan: "#00ffff",
    brightWhite: "#ffffff",
  },
  pipboy: {
    background: "#0a1a0f",
    foreground: "#15ff60",
    cursor: "#15ff60",
    cursorAccent: "#0a1a0f",
    selectionBackground: "#10b445",
    selectionForeground: "#0a1a0f",
    black: "#050d07",
    red: "#0a702a",
    green: "#15ff60",
    yellow: "#10b445",
    blue: "#0a702a",
    magenta: "#10b445",
    cyan: "#15ff60",
    white: "#a0ffc0",
    brightBlack: "#0a702a",
    brightRed: "#10b445",
    brightGreen: "#a0ffc0",
    brightYellow: "#e0ffe0",
    brightBlue: "#10b445",
    brightMagenta: "#a0ffc0",
    brightCyan: "#e0ffe0",
    brightWhite: "#ffffff",
  },
  mirc: {
    background: "#000000",
    foreground: "#00ff00",
    cursor: "#00ff00",
    selectionBackground: "#008000",
    selectionForeground: "#ffffff",
    black: "#000000",
    red: "#800000",
    green: "#008000",
    yellow: "#808000",
    blue: "#000080",
    magenta: "#800080",
    cyan: "#008080",
    white: "#c0c0c0",
    brightBlack: "#808080",
    brightRed: "#ff0000",
    brightGreen: "#00ff00",
    brightYellow: "#ffff00",
    brightBlue: "#0000ff",
    brightMagenta: "#ff00ff",
    brightCyan: "#00ffff",
    brightWhite: "#ffffff",
  },
  qbasic: {
    background: "#0000AA",
    foreground: "#FFFF55",
    cursor: "#FFFFFF",
    selectionBackground: "#555555",
    selectionForeground: "#FFFFFF",
    black: "#000000",
    red: "#AA0000",
    green: "#00AA00",
    yellow: "#AA5500",
    blue: "#0000AA",
    magenta: "#AA00AA",
    cyan: "#00AAAA",
    white: "#AAAAAA",
    brightBlack: "#555555",
    brightRed: "#FF5555",
    brightGreen: "#55FF55",
    brightYellow: "#FFFF55",
    brightBlue: "#5555FF",
    brightMagenta: "#FF55FF",
    brightCyan: "#55FFFF",
    brightWhite: "#FFFFFF",
  },
  orange: {
    background: "#201500",
    foreground: "#FFA500",
    cursor: "#FFA500",
    cursorAccent: "#201500",
    selectionBackground: "#D98C00",
    selectionForeground: "#201500",
    black: "#100A00",
    red: "#D98C00",
    green: "#FFA500",
    yellow: "#FFC04D",
    blue: "#D98C00",
    magenta: "#FFA500",
    cyan: "#FFC04D",
    white: "#FFE0B3",
    brightBlack: "#5A3D00",
    brightRed: "#FFC04D",
    brightGreen: "#FFE0B3",
    brightYellow: "#FFF5E0",
    brightBlue: "#FFC04D",
    brightMagenta: "#FFE0B3",
    brightCyan: "#FFF5E0",
    brightWhite: "#FFFFFF",
  },
  cga: {
    background: "#000000",
    foreground: "#55FFFF",
    cursor: "#FFFFFF",
    selectionBackground: "#55FFFF",
    selectionForeground: "#000000",
    black: "#000000",
    red: "#FF5555",
    green: "#55FF55",
    yellow: "#FFFF55",
    blue: "#5555FF",
    magenta: "#FF55FF",
    cyan: "#55FFFF",
    white: "#FFFFFF",
    brightBlack: "#555555",
    brightRed: "#FF5555",
    brightGreen: "#55FF55",
    brightYellow: "#FFFF55",
    brightBlue: "#5555FF",
    brightMagenta: "#FF55FF",
    brightCyan: "#55FFFF",
    brightWhite: "#FFFFFF",
  },
  atari: {
    background: "#000000",
    foreground: "#3FFFCF",
    cursor: "#D87050",
    selectionBackground: "#D87050",
    selectionForeground: "#000000",
    black: "#000000",
    red: "#D87050",
    green: "#3FFFCF",
    yellow: "#D8D850",
    blue: "#5070D8",
    magenta: "#D870D8",
    cyan: "#3FFFCF",
    white: "#AAAAAA",
    brightBlack: "#444444",
    brightRed: "#F0A080",
    brightGreen: "#7FFFEF",
    brightYellow: "#F0F080",
    brightBlue: "#80A0F0",
    brightMagenta: "#F0A0F0",
    brightCyan: "#7FFFEF",
    brightWhite: "#FFFFFF",
  },
  snes: {
    background: "#2F2F4F",
    foreground: "#E0E0FF",
    cursor: "#E0E040",
    selectionBackground: "#8080FF",
    selectionForeground: "#2F2F4F",
    black: "#101020",
    red: "#E04040",
    green: "#40C040",
    yellow: "#E0E040",
    blue: "#8080FF",
    magenta: "#C080FF",
    cyan: "#80C0FF",
    white: "#E0E0FF",
    brightBlack: "#505070",
    brightRed: "#FF7070",
    brightGreen: "#70F070",
    brightYellow: "#F0F070",
    brightBlue: "#B0B0FF",
    brightMagenta: "#F0B0FF",
    brightCyan: "#B0F0FF",
    brightWhite: "#FFFFFF",
  },
  bw_tv: {
    background: "#000000",
    foreground: "#cccccc",
    cursor: "#ffffff",
    selectionBackground: "#cccccc",
    selectionForeground: "#000000",
    black: "#000000",
    red: "#888888",
    green: "#aaaaaa",
    yellow: "#bbbbbb",
    blue: "#888888",
    magenta: "#aaaaaa",
    cyan: "#bbbbbb",
    white: "#cccccc",
    brightBlack: "#555555",
    brightRed: "#aaaaaa",
    brightGreen: "#cccccc",
    brightYellow: "#dddddd",
    brightBlue: "#aaaaaa",
    brightMagenta: "#cccccc",
    brightCyan: "#dddddd",
    brightWhite: "#ffffff",
  },
};

interface TerminalPanelProps {
  id: string;
  isActive: boolean;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ id, isActive }) => {
  const { theme } = useTheme();
  const { writeToActiveTerminal, resizeActiveTerminal, getActiveTerminal } =
    useTerminals();
  const terminalMountRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(() => {
    const termState = getActiveTerminal();
    return termState?.id === id ? termState.isReady : false;
  });
  const initialCheckDone = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const xtermResizeListener = useRef<ReturnType<Terminal["onResize"]> | null>(
    null
  );
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get terminal font size
  const getTerminalFontSize = useCallback((): number => {
    if (typeof document === "undefined") return 13;
    try {
      const fontSizeValue = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--font-size-terminal");
      return parseInt(fontSizeValue?.replace("px", "").trim() || "13", 10);
    } catch (e) {
      return 13;
    }
  }, []);

  // Helper function to just fit the addon
  const fitTerminal = useCallback(() => {
    if (fitAddonRef.current && terminalInstanceRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch (e) {
        console.warn(`TerminalPanel [${id}]: Error during fitTerminal():`, e);
      }
    }
  }, [id]);

  // --- Effect 1: Create Frontend Terminal Instance & Addon (Mount Logic) ---
  useEffect(() => {
    if (!terminalInstanceRef.current && terminalMountRef.current) {
      console.log(
        `TerminalPanel [${id}]: Effect 1 - Creating Frontend Instance.`
      );
      const container = terminalMountRef.current;
      container.innerHTML = "";

      const term = new Terminal({
        ...baseTerminalOptions,
        theme: terminalThemes[theme] || terminalThemes["dark"],
        fontSize: getTerminalFontSize(),
      });
      const addon = new FitAddon();
      terminalInstanceRef.current = term;
      fitAddonRef.current = addon;
      term.loadAddon(addon);
      term.open(container);
      console.log(`TerminalPanel [${id}]: Effect 1 - Instance attached.`);
      // Initial fit deferred
    }
    return () => {
      console.log(`TerminalPanel [${id}]: Effect 1 Cleanup - Unmounting.`);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (activationTimeoutRef.current)
        clearTimeout(activationTimeoutRef.current); // Clear activation timeout too
      try {
        xtermResizeListener.current?.dispose();
        xtermResizeListener.current = null;
      } catch (e) {}
      try {
        fitAddonRef.current?.dispose();
        fitAddonRef.current = null;
      } catch (e) {}
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Effect 2: Setup Listeners (IPC, Input, Xterm Resize, Clear), Initial State Check ---
  useEffect(() => {
    const term = terminalInstanceRef.current;
    if (!term) return;

    console.log(`TerminalPanel [${id}]: Effect 2 - Setting up listeners.`);
    let isEffectMounted = true;
    xtermResizeListener.current?.dispose();

    // Xterm's onResize Listener -> Notifies Backend
    xtermResizeListener.current = term.onResize(({ cols, rows }) => {
      // console.log(`TerminalPanel [${id}]: Xterm onResize event: ${cols}x${rows}`);
      if (isActive && isReady) {
        if (cols > 0 && rows > 0) {
          // console.log(`TerminalPanel [${id}]: Notifying backend size ${cols}x${rows} from onResize.`);
          resizeActiveTerminal(cols, rows);
        }
      }
    });

    // Input Forwarding
    const dataListener = term.onData((data: string) => {
      if (isActive && isEffectMounted) writeToActiveTerminal(data);
    });

    // Event Listeners (IPC via custom events)
    const handleDataEvent = (event: CustomEvent<{ data: string }>) => {
      if (isEffectMounted && terminalInstanceRef.current) {
        terminalInstanceRef.current.write(event.detail.data);
        const currentCtxState = getActiveTerminal();
        if (currentCtxState?.id === id && currentCtxState.isReady && !isReady)
          setIsReady(true);
      }
    };
    const dataEventName = `terminal-data-${id}`;
    window.addEventListener(dataEventName, handleDataEvent as EventListener);

    const handleExitEvent = (event: CustomEvent<{ code?: number | null }>) => {
      if (isEffectMounted && terminalInstanceRef.current) {
        setIsReady(false);
        if (!initialCheckDone.current) initialCheckDone.current = true;
        terminalInstanceRef.current.writeln(
          `\n\n[Process exited with code ${event.detail.code ?? "N/A"}]`
        );
        terminalInstanceRef.current.options.cursorBlink = false;
        terminalInstanceRef.current.options.disableStdin = true;
      }
    };
    const exitEventName = `terminal-exit-${id}`;
    window.addEventListener(exitEventName, handleExitEvent as EventListener);

    const handleErrorEvent = (event: CustomEvent<{ error: string }>) => {
      if (isEffectMounted && terminalInstanceRef.current) {
        setIsReady(false);
        if (!initialCheckDone.current) initialCheckDone.current = true;
        terminalInstanceRef.current.writeln(
          `\n\n[Backend Error: ${event.detail.error}]`
        );
      }
    };
    const errorEventName = `terminal-error-${id}`;
    window.addEventListener(errorEventName, handleErrorEvent as EventListener);

    // <<< NEW: Listener for Clear Event >>>
    const handleClearEvent = () => {
      if (isEffectMounted && terminalInstanceRef.current) {
        console.log(
          `TerminalPanel [${id}]: Received clear event. Clearing terminal buffer.`
        );
        terminalInstanceRef.current.clear();
      }
    };
    const clearEventName = `terminal-clear-${id}`;
    window.addEventListener(clearEventName, handleClearEvent as EventListener);
    // <<< END NEW >>>

    // Initial State Check
    if (!initialCheckDone.current && term) {
      const currentCtxState = getActiveTerminal();
      if (currentCtxState?.id === id) {
        console.log(`TerminalPanel [${id}]: Effect 2 - Initial state check.`);
        setIsReady(currentCtxState.isReady);
        if (!currentCtxState.isReady) {
          if (currentCtxState.isLoading)
            term.writeln("Connecting to backend shell...");
          else if (currentCtxState.error)
            term.writeln(`\n\n[Failed to connect: ${currentCtxState.error}]`);
          else if (currentCtxState.exitCode !== undefined) {
            term.writeln(
              `\n\n[Process exited with code ${
                currentCtxState.exitCode ?? "N/A"
              }]`
            );
            term.options.cursorBlink = false;
            term.options.disableStdin = true;
          }
        }
        initialCheckDone.current = true;
      }
    }
    // Cleanup
    return () => {
      isEffectMounted = false;
      console.log(`TerminalPanel [${id}]: Effect 2 Cleanup.`);
      try {
        xtermResizeListener.current?.dispose();
        xtermResizeListener.current = null;
      } catch (e) {}
      try {
        dataListener?.dispose();
      } catch (e) {}
      window.removeEventListener(
        dataEventName,
        handleDataEvent as EventListener
      );
      window.removeEventListener(
        exitEventName,
        handleExitEvent as EventListener
      );
      window.removeEventListener(
        errorEventName,
        handleErrorEvent as EventListener
      );
      window.removeEventListener(
        clearEventName,
        handleClearEvent as EventListener
      ); // <<< NEW: Remove clear listener
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    isActive,
    isReady,
    writeToActiveTerminal,
    resizeActiveTerminal,
    getActiveTerminal,
  ]);

  // --- Effect 3: Handle Container Resizing (Debounced Observer on the Wrapper) ---
  useEffect(() => {
    const wrapperElement = terminalMountRef.current?.parentElement;
    if (!wrapperElement || !terminalInstanceRef.current || !fitAddonRef.current)
      return;

    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        // console.log(`TerminalPanel [${id}]: Effect 3 - Debounced resize executing fitTerminal().`);
        fitTerminal(); // Fit frontend. Backend notified via onResize.
      }, 100); // Keep debounce reasonable
    };

    console.log(
      `TerminalPanel [${id}]: Effect 3 - Setting up ResizeObserver on wrapper.`
    );
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(wrapperElement);
    requestAnimationFrame(() => fitTerminal()); // Initial fit

    // Cleanup
    return () => {
      console.log(
        `TerminalPanel [${id}]: Effect 3 Cleanup - Disconnecting ResizeObserver.`
      );
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (wrapperElement) resizeObserver.unobserve(wrapperElement);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fitTerminal]);

  // --- Effect 4: Handle Theme/Font Changes ---
  useEffect(() => {
    const term = terminalInstanceRef.current;
    if (!term) return;
    let optionsChanged = false;
    const currentThemeName = theme;
    const currentTerminalTheme =
      terminalThemes[currentThemeName] || terminalThemes["dark"];
    const currentFontSize = getTerminalFontSize();

    if (term.options.theme !== currentTerminalTheme) {
      term.options.theme = currentTerminalTheme;
      optionsChanged = true;
    }
    if (term.options.fontSize !== currentFontSize) {
      term.options.fontSize = currentFontSize;
      optionsChanged = true;
    }
    if (optionsChanged) {
      console.log(
        `TerminalPanel [${id}]: Effect 4 - Options changed, refitting frontend.`
      );
      requestAnimationFrame(() => fitTerminal()); // Fit frontend only
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, id, getTerminalFontSize, fitTerminal]);

  // --- Effect 5: Handle Activation (Fit, Explicit Backend Resize, Refresh, Scroll, Focus) ---
  useEffect(() => {
    const term = terminalInstanceRef.current;
    // Use the ref for the timeout ID
    let currentActivationTimeoutId: NodeJS.Timeout | null = null;

    // Only run when THIS panel becomes active
    if (isActive && term) {
      console.log(`TerminalPanel [${id}]: Effect 5 - Activating panel.`);

      // Schedule the activation steps using setTimeout
      const runActivationSteps = () => {
        activationTimeoutRef.current = null; // Clear ref once timeout runs
        if (!terminalInstanceRef.current || !fitAddonRef.current) return; // Check refs
        const currentTerm = terminalInstanceRef.current;

        console.log(
          `TerminalPanel [${id}]: Effect 5 - Running activation steps.`
        );
        try {
          // 1. Fit terminal
          console.log(`TerminalPanel [${id}]: Effect 5 - Fitting.`);
          fitTerminal(); // Triggers onResize internally
          const calculatedCols = currentTerm.cols;
          const calculatedRows = currentTerm.rows;
          console.log(
            `TerminalPanel [${id}]: Effect 5 - Fit complete. Dims: ${calculatedCols}x${calculatedRows}`
          );

          // 2. Explicitly Notify Backend on Activation
          if (isReady && calculatedCols > 0 && calculatedRows > 0) {
            console.log(
              `TerminalPanel [${id}]: Effect 5 - EXPLICIT backend resize notification: ${calculatedCols}x${calculatedRows}.`
            );
            resizeActiveTerminal(calculatedCols, calculatedRows);
          } else {
            /* log skip */
          }

          // 3. Refresh viewport forcefully
          if (currentTerm.rows > 0) {
            currentTerm.refresh(0, currentTerm.rows - 1);
            console.log(`TerminalPanel [${id}]: Effect 5 - Refresh complete.`);
          }

          // 4. Scroll to cursor line
          const cursorY = currentTerm.buffer.active.cursorY;
          if (cursorY >= 0 && cursorY < currentTerm.buffer.active.length) {
            currentTerm.scrollToLine(cursorY);
          } else {
            currentTerm.scrollToBottom(); /* Fallback */
          }

          // 5. Focus if ready
          if (isReady) {
            console.log(`TerminalPanel [${id}]: Effect 5 - Focusing.`);
            currentTerm.focus();
          }
          console.log(
            `TerminalPanel [${id}]: Effect 5 - Activation sequence finished.`
          );
        } catch (e) {
          console.warn(
            `TerminalPanel [${id}]: Effect 5 - Error during activation sequence:`,
            e
          );
        }
      };

      // Use regular setTimeout
      currentActivationTimeoutId = setTimeout(runActivationSteps, 100); // Keep delay reasonable
      activationTimeoutRef.current = currentActivationTimeoutId; // Store in ref
    }

    // Cleanup for Effect 5
    return () => {
      // Clear timeout using the ID stored in the ref
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current);
        activationTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isReady, id, fitTerminal, resizeActiveTerminal]);

  // --- Render the inner div where xterm will mount ---
  return (
    <div
      ref={terminalMountRef}
      className="terminal-mount-point" // Use a specific class for the inner div
      style={{ width: "100%", height: "100%", overflow: "hidden" }} // Fill the parent (.terminal-panel-instance)
    >
      {/* Xterm instance mounts here */}
    </div>
  );
};

export default TerminalPanel;
