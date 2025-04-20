// --- START FILE: src/renderer/components/TerminalTab.tsx ---
import React, { useMemo } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa'; // Close and Spinner icons
import './TabContainer.css'; // Reuse styles

interface TerminalTabProps {
    terminalId: string;
    title: string;
    isActive: boolean;
    isLoading: boolean;
    hasExited: boolean;
    onClick: (terminalId: string) => void;
    onClose: (terminalId: string) => void;
}

const TerminalTab = React.forwardRef<HTMLDivElement, TerminalTabProps>(({
    terminalId,
    title,
    isActive,
    isLoading,
    hasExited,
    onClick,
    onClose
}, ref) => {

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent tab click when clicking close
        onClose(terminalId);
    };

    const handleClick = () => {
        if (!isActive) {
            onClick(terminalId);
        }
    };

    const displayTitle = useMemo(() => {
        if (isLoading) return "Loading...";
        if (hasExited) return `${title} (Exited)`;
        return title;
    }, [title, isLoading, hasExited]);

    return (
        <div
            ref={ref}
            className={`tab terminal-tab ${isActive ? 'active' : ''} ${hasExited ? 'exited' : ''} ${isLoading ? 'loading' : ''}`}
            onClick={handleClick}
            title={`Terminal: ${title} (ID: ${terminalId})${hasExited ? ' - Exited' : ''}`}
            role="tab"
            aria-selected={isActive}
        >
            {/* Maybe show spinner instead of close button when loading? */}
            {isLoading && <FaSpinner className="tab-loading-spinner spin-animation" />}

            <span className="tab-filename">{displayTitle}</span>

            {/* Don't show close button if loading */}
            {!isLoading && (
                 <button
                    className="tab-close-button"
                    onClick={handleCloseClick}
                    title="Close Terminal Tab"
                    aria-label={`Close ${title} terminal tab`}
                    type="button"
                    tabIndex={isActive ? 0 : -1}
                >
                    <FaTimes />
                </button>
            )}
        </div>
    );
});

TerminalTab.displayName = 'TerminalTab';
export default TerminalTab;
// --- END FILE: src/renderer/components/TerminalTab.tsx ---