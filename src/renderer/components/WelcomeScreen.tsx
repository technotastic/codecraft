// src/renderer/components/WelcomeScreen.tsx
import React from 'react';
import { FaFolderOpen, FaKeyboard } from 'react-icons/fa';
import './WelcomeScreen.css'; // We'll create this CSS file

const WelcomeScreen: React.FC = () => {
    return (
        <div className="welcome-screen-container">
            <div className="welcome-content">
                <h1>Welcome to CodeCraft IDE</h1>
                <p>
                    No files are currently open.
                </p>
                <div className="welcome-hints">
                    <div className="hint-item">
                        <FaFolderOpen className="hint-icon" />
                        <span>Open a folder using the <span className="icon-inline"><FaFolderOpen /></span> button in the sidebar.</span>
                    </div>
                    <div className="hint-item">
                        <FaKeyboard className="hint-icon" />
                        <span>Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> (or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on Mac) to open the Command Palette.</span>
                    </div>
                    {/* Add more hints or links as desired */}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;