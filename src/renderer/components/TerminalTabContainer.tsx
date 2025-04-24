// --- START FILE: src/renderer/components/TerminalTabContainer.tsx ---
import React, { useRef, useEffect } from "react";
import TerminalTab from "./TerminalTab";
import { useTerminals, OpenTerminal } from "../contexts/TerminalContext";
import { FaPlus, FaBroom } from "react-icons/fa"; // <<< NEW: Import FaBroom for clear button
import "./TabContainer.css"; // Reuse editor tab container styles

const TerminalTabContainer: React.FC = () => {
  const {
    openTerminals,
    activeTerminalId,
    setActiveTerminal,
    closeTerminal,
    createTerminal, // Function to create a new terminal
    clearActiveTerminal, // <<< NEW: Get clear function
  } = useTerminals();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Effect to scroll the active tab into view when it changes
  useEffect(() => {
    const timerId = setTimeout(() => {
      if (activeTabRef.current) {
        activeTabRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }, 0);
    return () => clearTimeout(timerId);
  }, [activeTerminalId]);

  // Don't render the container if no terminals are open?
  // Or render with just the add button? Let's show it.
  // if (openTerminals.length === 0) {
  //     return null; // Or render differently?
  // }

  const handleAddNewTerminal = () => {
    createTerminal(); // Call context function
  };

  // <<< NEW: Handler for the clear button >>>
  const handleClearActiveTerminal = () => {
    clearActiveTerminal();
  };

  return (
    <div
      ref={containerRef}
      className="tab-container terminal-tab-container"
      role="tablist"
      aria-label="Open terminal tabs"
    >
      {openTerminals.map((term: OpenTerminal) => (
        <TerminalTab
          key={term.id}
          ref={term.id === activeTerminalId ? activeTabRef : null}
          terminalId={term.id}
          title={term.title}
          isActive={term.id === activeTerminalId}
          isLoading={term.isLoading}
          hasExited={term.exitCode !== null && term.exitCode !== undefined} // Adjusted check for exit code
          onClick={setActiveTerminal}
          onClose={closeTerminal}
          // Add props for isLoading, hasExited if needed for styling
        />
      ))}
      {/* Clear Active Terminal Button <<< NEW >>> */}
      {/* Only show clear button if there's an active, running terminal */}
      {activeTerminalId &&
        openTerminals.find(
          (t) =>
            t.id === activeTerminalId && t.isReady && t.exitCode === undefined
        ) && (
          <button
            className="clear-tab-button icon-button" // Style similarly
            onClick={handleClearActiveTerminal}
            title="Clear Active Terminal"
            aria-label="Clear Active Terminal"
          >
            <FaBroom />
          </button>
        )}
      {/* Add New Terminal Button */}
      <button
        className="add-tab-button icon-button" // Style similarly to other icon buttons
        onClick={handleAddNewTerminal}
        title="New Terminal Tab"
        aria-label="Create New Terminal Tab"
      >
        <FaPlus />
      </button>
    </div>
  );
};

export default TerminalTabContainer;
// --- END FILE: src/renderer/components/TerminalTabContainer.tsx ---
