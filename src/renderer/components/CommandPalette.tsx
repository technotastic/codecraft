// --- START FILE: src/renderer/components/CommandPalette.tsx ---
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext'; // Import ThemeName
import { useTerminals } from '../contexts/TerminalContext';
import './CommandPalette.css';

interface Command {
    id: string;
    label: string;
    execute: () => void | Promise<void>; // Allow async execution
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

// Define theme options statically here if not exported from context
const availableThemes: { value: ThemeName; label: string }[] = [
    { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
    { value: 'win95', label: 'Win95' }, { value: 'pipboy', label: 'Pip-Boy' },
    { value: 'mirc', label: 'mIRC' }, { value: 'qbasic', label: 'QBasic' },
    { value: 'orange', label: 'Amber' }, { value: 'cga', label: 'CGA' },
    { value: 'atari', label: 'Atari 2600' }, { value: 'snes', label: 'SNES' },
    { value: 'bw_tv', label: 'B&W TV' },
];

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const { setTheme } = useTheme();
    const { createTerminal } = useTerminals();
    // Add other contexts if needed for commands (e.g., useEditor for file ops)
    // const { saveActiveFile } = useEditor(); // Example

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // --- Define All Available Commands ---
    const allCommands = useMemo<Command[]>(() => {
        const commands: Command[] = [
            // --- App & Window Commands ---
            { id: 'app.quit', label: 'Application: Quit', execute: () => window.electronAPI.app_quit() },
            { id: 'window.toggleDevTools', label: 'Developer: Toggle Developer Tools', execute: () => window.electronAPI.window_toggleDevTools() },
            { id: 'window.toggleFullscreen', label: 'View: Toggle Fullscreen', execute: () => window.electronAPI.window_toggleFullscreen() },

            // --- Terminal Commands ---
            { id: 'terminal.new', label: 'Terminal: New Terminal', execute: createTerminal },
            // Add clear terminal command if available in context
            // { id: 'terminal.clear', label: 'Terminal: Clear Active Terminal', execute: clearActiveTerminal },

            // --- File Commands ---
            {
                id: 'file.openFolder',
                label: 'File: Open Folder...',
                execute: async () => {
                    // We call the dialog directly, the Sidebar component will react to the event
                    // if its IPC listener is correctly set up. Or update context if needed.
                    await window.electronAPI.dialog_openDirectory();
                    // Future: Could update a potential 'projectRoot' state in context here
                }
            },
            // Add Save / Save As commands here if needed, using useEditor() context functions
            // { id: 'file.save', label: 'File: Save Active File', execute: () => { /* Need current content from EditorPanel or context */ } },

            // --- Theme Commands ---
             ...availableThemes.map(th => ({
                id: `theme.set.${th.value}`,
                label: `Theme: Set ${th.label}`,
                execute: () => setTheme(th.value),
            })),
        ];
        // Add more commands here...
        return commands.sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
    }, [setTheme, createTerminal]); // Add dependencies for context functions used

    // --- Filter Commands Based on Search Term ---
    const filteredCommands = useMemo(() => {
        if (!searchTerm.trim()) return allCommands;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return allCommands.filter(command =>
            command.label.toLowerCase().includes(lowerSearchTerm)
        );
    }, [searchTerm, allCommands]);

    // --- Effects ---

    // Reset state when opening/closing & focus input
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedIndex(0);
            // Focus input shortly after opening to allow CSS transition/render
            const timer = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const selectedElement = listRef.current.querySelector('.selected') as HTMLLIElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, isOpen, filteredCommands]); // Re-run if filteredCommands change too

    // --- Event Handlers ---

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].execute(); // Execute selected command
                onClose();
            }
        }
    }, [filteredCommands, selectedIndex, onClose]);

    const handleItemClick = useCallback((index: number) => {
        if (filteredCommands[index]) {
            filteredCommands[index].execute();
            onClose();
        }
    }, [filteredCommands, onClose]);

    // --- Render ---

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onMouseDown={onClose}> {/* Close on overlay click */}
            <div className="command-palette-container" onMouseDown={e => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter command..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setSelectedIndex(0); }} // Reset index on search change
                    onKeyDown={handleKeyDown}
                    className="command-palette-input"
                    aria-label="Command Palette Input"
                    autoComplete="off"
                />
                <ul ref={listRef} className="command-palette-list" role="listbox">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((command, index) => (
                            <li
                                key={command.id}
                                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleItemClick(index)}
                                onMouseEnter={() => setSelectedIndex(index)} // Select on hover
                                role="option"
                                aria-selected={index === selectedIndex}
                                id={`command-palette-item-${index}`} // For potential aria-activedescendant
                            >
                                {command.label}
                            </li>
                        ))
                    ) : (
                        <li className="command-palette-item no-results">No commands found</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CommandPalette;
// --- END FILE: src/renderer/components/CommandPalette.tsx ---