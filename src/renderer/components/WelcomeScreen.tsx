// src/renderer/components/WelcomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { FaFolderOpen, FaKeyboard, FaHistory } from 'react-icons/fa';
import path from 'path-browserify';
import './WelcomeScreen.css';

// --- Define Props Interface ---
interface WelcomeScreenProps {
    setCurrentFolderPath: (path: string | null) => void; // Expect the setter
}

// --- Apply Props Type and Use Prop ---
const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ setCurrentFolderPath }) => {
    const [recentFolders, setRecentFolders] = useState<string[]>([]);
    const [isLoadingRecents, setIsLoadingRecents] = useState<boolean>(true);

    // Fetch recent folders (remains same)
    useEffect(() => {
        setIsLoadingRecents(true);
        window.electronAPI.app_getRecentFolders()
            .then(folders => {
                console.log("WelcomeScreen: Received recent folders:", folders);
                setRecentFolders(folders || []);
            })
            .catch(err => {
                console.error("WelcomeScreen: Error fetching recent folders:", err);
                setRecentFolders([]); // Set empty on error
            })
            .finally(() => {
                setIsLoadingRecents(false);
            });
    }, []); // Empty dependency array means run once on mount

    // --- Implement Click Handler using the Prop ---
    const handleRecentClick = (folderPath: string) => {
        console.log(`WelcomeScreen: Clicked recent folder - ${folderPath}. Calling setCurrentFolderPath.`);
        setCurrentFolderPath(folderPath); // <<< Call the prop function
        // This will update the state in App.tsx, triggering Sidebar to reload its file tree.
    };
    // --- End Implement Click Handler ---


    return (
        <div className="welcome-screen-container">
            <div className="welcome-content">
                <h1>Welcome to CodeCraft IDE</h1>
                <p> No files are currently open. </p>

                {/* Recent Folders Section */}
                <div className="recent-folders-section">
                    <h2><FaHistory className="section-icon" /> Recent Folders</h2>
                    {isLoadingRecents && <p>Loading recent folders...</p>}
                    {!isLoadingRecents && recentFolders.length === 0 && (
                        <p className="no-recents-message">No recent folders found.</p>
                    )}
                    {!isLoadingRecents && recentFolders.length > 0 && (
                        <ul className="recent-folders-list">
                            {recentFolders.map((folderPath) => (
                                <li key={folderPath}>
                                    {/* Button is now fully active and calls the handler */}
                                    <button
                                        className="recent-folder-button"
                                        onClick={() => handleRecentClick(folderPath)} // <<< Calls implemented handler
                                        title={folderPath}
                                    >
                                        <FaFolderOpen className="recent-folder-icon" />
                                        <span className="recent-folder-name">{path.basename(folderPath)}</span>
                                        <span className="recent-folder-path">{folderPath}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Hints Section */}
                <div className="welcome-hints">
                   <h2><FaKeyboard className="section-icon" /> Quick Start</h2>
                   <div className="hint-item">
                        <FaFolderOpen className="hint-icon" />
                        <span>Use the <span className="icon-inline"><FaFolderOpen /></span> button or <kbd>Ctrl/Cmd</kbd>+<kbd>O</kbd> to open a folder.</span>
                    </div>
                   <div className="hint-item">
                        <FaKeyboard className="hint-icon" />
                        <span>Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> (or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) for the Command Palette.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;