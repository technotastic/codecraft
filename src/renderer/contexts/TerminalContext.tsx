// --- START FILE: src/renderer/contexts/TerminalContext.tsx ---
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { v4 as uuidv4 } from "uuid"; // Use UUID for unique IDs

// Define the structure for an open terminal session
export interface OpenTerminal {
  id: string;
  title: string;
  isLoading: boolean; // Is the backend PTY starting up?
  isReady: boolean; // Has the backend PTY confirmed creation?
  exitCode?: number | null; // Store exit code if process terminates (null means exited normally with 0 or unknown, number is specific code)
  error?: string | null; // Store any errors related to this terminal
}

// Define the shape of the context properties
interface TerminalContextProps {
  openTerminals: OpenTerminal[];
  activeTerminalId: string | null;
  createTerminal: (initialCols?: number, initialRows?: number) => void;
  closeTerminal: (terminalId: string) => void;
  setActiveTerminal: (terminalId: string | null) => void;
  writeToActiveTerminal: (data: string) => void;
  resizeActiveTerminal: (cols: number, rows: number) => void;
  clearActiveTerminal: () => void; // <<< NEW FUNCTION ADDED
  getActiveTerminal: () => OpenTerminal | undefined;
}

// Create the context
const TerminalContext = createContext<TerminalContextProps | undefined>(
  undefined
);

// Define the props for the provider component
interface TerminalProviderProps {
  children: ReactNode; // Prop type for children components
}

// Create the provider component
export const TerminalProvider: React.FC<TerminalProviderProps> = ({
  children,
}) => {
  const [openTerminals, setOpenTerminals] = useState<OpenTerminal[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const globalListenersAttached = useRef(false);

  // Helper to update a specific terminal in the state
  const updateTerminalState = useCallback(
    (terminalId: string, updates: Partial<OpenTerminal>) => {
      setOpenTerminals((prevTerminals) =>
        prevTerminals.map((term) =>
          term.id === terminalId ? { ...term, ...updates } : term
        )
      );
    },
    []
  ); // No dependencies needed as setOpenTerminals is stable

  // Helper to get the active terminal object
  const getActiveTerminal = useCallback((): OpenTerminal | undefined => {
    return openTerminals.find((t) => t.id === activeTerminalId);
  }, [openTerminals, activeTerminalId]); // Depends on these state values

  // Function to create a new terminal tab and request backend PTY
  const createTerminal = useCallback(
    async (initialCols: number = 80, initialRows: number = 24) => {
      const newId = uuidv4();
      // Default title based on the number of terminals *about* to exist
      const newTerminalTitle = `Terminal ${openTerminals.length + 1}`;
      const newTerminal: OpenTerminal = {
        id: newId,
        title: newTerminalTitle,
        isLoading: true,
        isReady: false,
        error: null,
        exitCode: undefined, // Use undefined initially to mean "not exited"
      };

      console.log(
        `TerminalContext: Creating new terminal tab (ID: ${newId}, Title: ${newTerminalTitle})`
      );
      // Update state first
      setOpenTerminals((prev) => [...prev, newTerminal]);
      setActiveTerminalId(newId); // Make the new terminal active immediately

      // Request backend PTY creation
      console.log(`TerminalContext: Requesting backend PTY for ID ${newId}...`);
      try {
        // Ensure cols/rows are valid before sending
        const colsToSend = Math.max(1, initialCols);
        const rowsToSend = Math.max(1, initialRows);
        const result = await window.electronAPI.term_create({
          id: newId,
          cols: colsToSend,
          rows: rowsToSend,
        });
        if (result?.success) {
          console.log(
            `TerminalContext: Backend PTY creation request successful for ID ${newId}`
          );
          // Mark as ready now that the main process acknowledged creation
          updateTerminalState(newId, {
            isLoading: false,
            isReady: true,
            error: null,
          });
        } else {
          console.error(
            `TerminalContext: Backend PTY creation failed for ID ${newId}:`,
            result?.error
          );
          updateTerminalState(newId, {
            isLoading: false,
            isReady: false,
            error: `Backend Error: ${result?.error || "Unknown error"}`,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `TerminalContext: IPC Error creating PTY for ID ${newId}:`,
          errorMsg
        );
        updateTerminalState(newId, {
          isLoading: false,
          isReady: false,
          error: `IPC Error: ${errorMsg}`,
        });
      }
    },
    [openTerminals.length, updateTerminalState]
  ); // Dependency on length for title, and update helper

  // Function to close a terminal tab and kill backend PTY
  const closeTerminal = useCallback(
    async (terminalId: string) => {
      console.log(
        `TerminalContext: Requesting to close terminal ID: ${terminalId}`
      );
      // Find the index BEFORE filtering, needed for setting the next active tab
      const terminalToCloseIndex = openTerminals.findIndex(
        (t) => t.id === terminalId
      );
      const terminalToClose = openTerminals[terminalToCloseIndex];

      if (terminalToCloseIndex === -1 || !terminalToClose) {
        console.warn(
          `TerminalContext: Cannot close terminal ID ${terminalId}, not found.`
        );
        return;
      }

      // Remove from renderer state
      const remainingTerminals = openTerminals.filter(
        (t) => t.id !== terminalId
      );
      setOpenTerminals(remainingTerminals);

      // Determine next active terminal if the closed one was active
      if (activeTerminalId === terminalId) {
        let nextActiveId: string | null = null;
        if (remainingTerminals.length > 0) {
          // Try to activate the tab that was visually before the closed one,
          // otherwise the new last tab. Max(0,...) handles closing the first tab.
          const nextIndex = Math.min(
            remainingTerminals.length - 1,
            Math.max(0, terminalToCloseIndex - 1)
          );
          nextActiveId = remainingTerminals[nextIndex]?.id || null;
        }
        console.log(
          `TerminalContext: Setting next active terminal to: ${nextActiveId}`
        );
        setActiveTerminalId(nextActiveId); // Update active ID state
      }

      // Tell main process to kill the backend PTY
      // Only kill if it seems like it could be running (was ready or loading AND hasn't reported an exit code yet)
      if (
        (terminalToClose.isReady || terminalToClose.isLoading) &&
        terminalToClose.exitCode === undefined
      ) {
        console.log(
          `TerminalContext: Sending kill request for backend PTY ID: ${terminalId}`
        );
        try {
          await window.electronAPI.term_kill(terminalId);
          console.log(
            `TerminalContext: Backend kill request acknowledged for ID: ${terminalId}`
          );
        } catch (err) {
          console.error(
            `TerminalContext: IPC Error sending kill request for PTY ID ${terminalId}:`,
            err
          );
        }
      } else {
        console.log(
          `TerminalContext: No kill request needed for ID ${terminalId} (state: isLoading=${terminalToClose.isLoading}, isReady=${terminalToClose.isReady}, exitCode=${terminalToClose.exitCode}).`
        );
      }
    },
    [openTerminals, activeTerminalId, setActiveTerminalId]
  ); // Depends on state and the setter for active ID

  // Function to set the active terminal
  const setActiveTerminal = useCallback(
    (terminalId: string | null) => {
      // Prevent unnecessary state updates if already active
      if (terminalId !== activeTerminalId) {
        console.log(
          `TerminalContext: Setting active terminal ID to: ${terminalId}`
        );
        setActiveTerminalId(terminalId);
      }
    },
    [activeTerminalId]
  ); // Depends only on activeTerminalId for comparison

  // Function to send data to the *active* terminal's backend PTY
  const writeToActiveTerminal = useCallback(
    (data: string) => {
      if (!activeTerminalId) {
        console.warn("TerminalContext: Cannot write data, no active terminal.");
        return;
      }
      // Find the active terminal to ensure it's ready and not exited before sending
      const activeTerm = openTerminals.find((t) => t.id === activeTerminalId); // Use raw state here
      if (activeTerm?.isReady && activeTerm.exitCode === undefined) {
        // console.log(`TerminalContext: Writing data to active terminal ID ${activeTerminalId}`); // Very verbose
        window.electronAPI.term_write(activeTerminalId, data);
      } else {
        console.warn(
          `TerminalContext: Cannot write data, active terminal ${activeTerminalId} not ready or has exited.`
        );
      }
    },
    [activeTerminalId, openTerminals]
  ); // Depends on activeId and the list to find the term

  // Function to resize the *active* terminal's backend PTY
  const resizeActiveTerminal = useCallback(
    (cols: number, rows: number) => {
      if (!activeTerminalId) {
        console.warn("TerminalContext: Cannot resize, no active terminal.");
        return;
      }
      // Ensure cols/rows are valid positive numbers
      if (cols <= 0 || rows <= 0) {
        console.warn(
          `TerminalContext: Attempted to resize terminal ${activeTerminalId} with invalid dimensions: ${cols}x${rows}`
        );
        return;
      }
      // Find the active terminal to ensure it's ready and not exited
      const activeTerm = openTerminals.find((t) => t.id === activeTerminalId); // Use raw state
      if (activeTerm?.isReady && activeTerm.exitCode === undefined) {
        // console.log(`TerminalContext: Resizing active terminal ID ${activeTerminalId} to ${cols}x${rows}`); // Verbose
        window.electronAPI.term_resize(activeTerminalId, { cols, rows });
      } else {
        console.warn(
          `TerminalContext: Cannot resize, active terminal ${activeTerminalId} not ready or has exited.`
        );
      }
    },
    [activeTerminalId, openTerminals]
  ); // Depends on activeId and the list

  // --- Global IPC Listener Setup (runs once) ---
  useEffect(() => {
    if (globalListenersAttached.current) {
      // console.log("TerminalContext: Global listeners already attached."); // DEBUG
      return;
    }

    console.log(
      "TerminalContext: Attaching global IPC listeners (term_onData, term_onExit, term_onError)..."
    );

    // Data received FROM main process for a specific terminal ID
    const handleData = (terminalId: string, data: string) => {
      // console.log(`TerminalContext: Routing data for ID ${terminalId}`); // Very Verbose
      const event = new CustomEvent<{ data: string }>(
        `terminal-data-${terminalId}`,
        { detail: { data } }
      );
      window.dispatchEvent(event);
    };
    const unsubscribeData = window.electronAPI.term_onData(handleData);

    // Exit signal FROM main process for a specific terminal ID
    const handleExit = (terminalId: string, code?: number) => {
      console.log(
        `TerminalContext: Received exit signal for ID ${terminalId}, code: ${code}`
      );
      const exitCodeToStore = typeof code === "number" ? code : null; // Treat undefined exit as null
      updateTerminalState(terminalId, {
        isLoading: false,
        isReady: false,
        exitCode: exitCodeToStore,
      });
      const event = new CustomEvent<{ code?: number | null }>(
        `terminal-exit-${terminalId}`,
        { detail: { code: exitCodeToStore } }
      );
      window.dispatchEvent(event);
    };
    const unsubscribeExit = window.electronAPI.term_onExit(handleExit);

    // Error signal FROM main process for a specific terminal ID
    const handleError = (terminalId: string, errorMessage: string) => {
      console.error(
        `TerminalContext: Received error signal for ID ${terminalId}: ${errorMessage}`
      );
      // Mark as not loading/ready and store the error
      updateTerminalState(terminalId, {
        isLoading: false,
        isReady: false,
        error: errorMessage,
      });
      const event = new CustomEvent<{ error: string }>(
        `terminal-error-${terminalId}`,
        { detail: { error: errorMessage } }
      );
      window.dispatchEvent(event);
    };
    const unsubscribeError = window.electronAPI.term_onError(handleError);

    globalListenersAttached.current = true;
    console.log("TerminalContext: Global listeners attached successfully.");

    // Cleanup global listeners on provider unmount
    return () => {
      console.log("TerminalContext: Cleaning up global IPC listeners...");
      unsubscribeData();
      unsubscribeExit();
      unsubscribeError();
      globalListenersAttached.current = false;
      console.log("TerminalContext: Global listeners cleaned up.");
    };
    // updateTerminalState is stable due to its definition with useCallback and empty deps array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTerminalState]); // Run only once on mount

  // --- NEW FUNCTION: Clear Active Terminal ---
  const clearActiveTerminal = useCallback(() => {
    if (!activeTerminalId) {
      console.warn("TerminalContext: Cannot clear, no active terminal.");
      return;
    }
    // Find the active terminal to ensure it's ready and not exited before sending clear event
    const activeTerm = openTerminals.find((t) => t.id === activeTerminalId);
    if (activeTerm?.isReady && activeTerm.exitCode === undefined) {
      console.log(
        `TerminalContext: Dispatching clear event for active terminal ID ${activeTerminalId}`
      );
      const event = new CustomEvent(`terminal-clear-${activeTerminalId}`);
      window.dispatchEvent(event);
    } else {
      console.warn(
        `TerminalContext: Cannot clear, active terminal ${activeTerminalId} not ready or has exited.`
      );
    }
  }, [activeTerminalId, openTerminals]); // Depends on activeId and the list

  // --- Context Value ---
  // Use useMemo to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({
      openTerminals,
      activeTerminalId,
      createTerminal,
      closeTerminal,
      setActiveTerminal,
      writeToActiveTerminal,
      resizeActiveTerminal,
      clearActiveTerminal, // <<< ADDED HERE
      getActiveTerminal,
    }),
    [
      openTerminals,
      activeTerminalId,
      createTerminal,
      closeTerminal,
      setActiveTerminal,
      writeToActiveTerminal,
      resizeActiveTerminal,
      clearActiveTerminal, // <<< ADDED HERE
      getActiveTerminal,
    ]
  );

  return (
    <TerminalContext.Provider value={contextValue}>
      {children}
    </TerminalContext.Provider>
  );
};

// --- Hook to use the context ---
// Ensure this is exactly 'export const useTerminals'
export const useTerminals = (): TerminalContextProps => {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error("useTerminals must be used within a TerminalProvider");
  }
  return context;
};
// --- END FILE: src/renderer/contexts/TerminalContext.tsx ---
