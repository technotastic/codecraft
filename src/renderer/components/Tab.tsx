// --- START FILE: src/renderer/components/Tab.tsx ---
import React, { useMemo } from 'react';
import path from 'path-browserify';
import { FaTimes } from 'react-icons/fa'; // Close icon

interface TabProps {
    filePath: string;
    isActive: boolean;
    isDirty: boolean;
    onClick: (filePath: string) => void;
    onClose: (filePath: string) => void;
    // No need for ref prop here, forwardRef handles it
}

// Use React.forwardRef to allow passing a ref to the underlying div
const Tab = React.forwardRef<HTMLDivElement, TabProps>(({
    filePath,
    isActive,
    isDirty,
    onClick,
    onClose
}, ref) => { // ref is the second argument provided by forwardRef
    const fileName = useMemo(() => path.basename(filePath), [filePath]);

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent tab click when clicking close
        onClose(filePath);
    };

    const handleClick = () => {
        // Only call onClick if the tab is not already active
        if (!isActive) {
            onClick(filePath);
        }
    };

    return (
        // Assign the forwarded ref to this div
        <div
            ref={ref} // Assign the ref here
            className={`tab ${isActive ? 'active' : ''}`}
            onClick={handleClick}
            title={filePath}
            role="tab"
            aria-selected={isActive}
        >
            {isDirty && <span className="tab-dirty-indicator">●</span>}
            <span className="tab-filename">{fileName}</span>
            <button
                className="tab-close-button"
                onClick={handleCloseClick}
                title="Close Tab"
                aria-label={`Close ${fileName} tab`}
                type="button"
                // Make focusable only if the tab itself is active for better keyboard nav
                tabIndex={isActive ? 0 : -1}
            >
                <FaTimes />
            </button>
        </div>
    );
});

Tab.displayName = 'Tab'; // Good practice for dev tools when using forwardRef
export default Tab;
// --- END FILE: src/renderer/components/Tab.tsx ---