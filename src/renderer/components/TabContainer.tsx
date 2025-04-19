// --- START FILE: src/renderer/components/TabContainer.tsx ---
import React, { useRef, useEffect } from 'react';
import Tab from './Tab';
import { useEditor, OpenFile } from '../contexts/EditorContext';
import './TabContainer.css';

const TabContainer: React.FC = () => {
    const { openFiles, activeFilePath, setActiveFile, closeFile } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<HTMLDivElement>(null);

    // Effect to scroll the active tab into view when it changes
    useEffect(() => {
        // Introduce a slight delay using setTimeout to ensure DOM updates
        const timerId = setTimeout(() => {
            if (activeTabRef.current) {
                console.log(`Attempting to scroll tab ${activeFilePath} into view.`);
                activeTabRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest', // 'start' or 'center' might also work if 'nearest' fails
                });
            } else {
                 console.log(`Active tab ref not found for ${activeFilePath} when trying to scroll.`);
            }
        }, 0); // 0ms delay pushes execution after current browser tick

        // Cleanup the timer if the effect re-runs before the timeout finishes
        return () => clearTimeout(timerId);

    }, [activeFilePath]); // Dependency remains the same

    if (openFiles.length === 0) {
        return null;
    }

    return (
        <div ref={containerRef} className="tab-container" role="tablist" aria-label="Open file tabs">
            {openFiles.map((file: OpenFile) => (
                <Tab
                    key={file.path}
                    ref={file.path === activeFilePath ? activeTabRef : null}
                    filePath={file.path}
                    isActive={file.path === activeFilePath}
                    isDirty={file.isDirty}
                    onClick={setActiveFile}
                    onClose={closeFile}
                />
            ))}
        </div>
    );
};

export default TabContainer;
// --- END FILE: src/renderer/components/TabContainer.tsx ---