// src/renderer/components/TerminalTabContainer.tsx
import React, { useRef, useEffect } from "react";
import TerminalTab from "./TerminalTab";
import { useTerminals, OpenTerminal } from "../contexts/TerminalContext";
import { FaPlus } from "react-icons/fa"; // Remove FaBroom
import "./TabContainer.css"; // Reuse editor tab container styles

const TerminalTabContainer: React.FC = () => {
  const {
    openTerminals,
    activeTerminalId,
    setActiveTerminal,
    closeTerminal,
    createTerminal, // Function to create a new terminal
    // clearActiveTerminal, // Removed
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


  const handleAddNewTerminal = () => {
    createTerminal(); // Call context function
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