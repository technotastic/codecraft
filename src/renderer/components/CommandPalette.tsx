// --- START FILE: src/renderer/components/CommandPalette.tsx ---
import React, { useState, useEffect, useRef, useCallback, useMemo, ComponentType } from 'react'; // Import ComponentType
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import { useTerminals } from '../contexts/TerminalContext';
// --- Icon Imports ---
import {
    FaPalette, FaTerminal, FaFolderOpen, FaSignOutAlt, FaTools, FaExpandAlt,
    FaMinusSquare, FaPlusSquare, FaRedo // Removed FaFont, Added specific icons
} from 'react-icons/fa';
// Import other icons as needed
import './CommandPalette.css';

interface Command {
    id: string;
    label: string;
    execute: () => void | Promise<void>;
    icon?: ComponentType<{ className?: string }>; // Optional icon component type
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
    // Add fontSize functions from context
    const { setTheme, increaseFontSize, decreaseFontSize, resetFontSize } = useTheme();
    const { createTerminal } = useTerminals();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // --- Define All Available Commands (WITH ICONS) ---
    const allCommands = useMemo<Command[]>(() => {
        const commands: Command[] = [
            // --- App & Window Commands ---
            { id: 'app.quit', label: 'Application: Quit', icon: FaSignOutAlt, execute: () => window.electronAPI.app_quit() },
            { id: 'window.toggleDevTools', label: 'Developer: Toggle Developer Tools', icon: FaTools, execute: () => window.electronAPI.window_toggleDevTools() },
            { id: 'window.toggleFullscreen', label: 'View: Toggle Fullscreen', icon: FaExpandAlt, execute: () => window.electronAPI.window_toggleFullscreen() },

            // --- Terminal Commands ---
            { id: 'terminal.new', label: 'Terminal: New Terminal', icon: FaTerminal, execute: createTerminal },
            // { id: 'terminal.clear', label: 'Terminal: Clear Active Terminal', icon: FaBroom, execute: clearActiveTerminal }, // If added

            // --- File Commands ---
            {
                id: 'file.openFolder',
                label: 'File: Open Folder...',
                icon: FaFolderOpen,
                execute: async () => {
                    await window.electronAPI.dialog_openDirectory();
                }
            },
            // { id: 'file.save', label: 'File: Save Active File', icon: FaSave, execute: () => { /* ... */ } },

            // --- View/Theme Commands ---
            { id: 'view.increaseFontSize', label: 'View: Increase Font Size', icon: FaPlusSquare, execute: increaseFontSize },
            { id: 'view.decreaseFontSize', label: 'View: Decrease Font Size', icon: FaMinusSquare, execute: decreaseFontSize },
            { id: 'view.resetFontSize', label: 'View: Reset Font Size', icon: FaRedo, execute: resetFontSize }, // FaUndo or FaRedo could work

             ...availableThemes.map(th => ({
                id: `theme.set.${th.value}`,
                label: `Theme: Set ${th.label}`,
                icon: FaPalette, // Generic theme icon
                execute: () => setTheme(th.value),
            })),
        ];
        return commands.sort((a, b) => a.label.localeCompare(b.label));
    }, [setTheme, createTerminal, increaseFontSize, decreaseFontSize, resetFontSize]); // Add new context functions to dependency array

    // --- Filter Commands Based on Search Term ---
    const filteredCommands = useMemo(() => {
        if (!searchTerm.trim()) return allCommands;
        const lowerSearchTerm = searchTerm.toLowerCase();
        // Simple filter, could be enhanced with fuzzy search later
        return allCommands.filter(command =>
            command.label.toLowerCase().includes(lowerSearchTerm)
        );
    }, [searchTerm, allCommands]);

    // --- Effects (No change needed here) ---
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedIndex(0);
            const timer = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && listRef.current) {
            const selectedElement = listRef.current.querySelector('.selected') as HTMLLIElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, isOpen, filteredCommands]);

    // --- Event Handlers (No change needed here) ---
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            // Ensure selection wraps correctly within the bounds
             setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
             setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].execute();
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
        <div className="command-palette-overlay" onMouseDown={onClose}>
            <div className="command-palette-container" onMouseDown={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter command..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setSelectedIndex(0); }}
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
                                onMouseEnter={() => setSelectedIndex(index)}
                                role="option"
                                aria-selected={index === selectedIndex}
                                id={`command-palette-item-${index}`}
                            >
                                {/* Render Icon if it exists */}
                                {command.icon && <command.icon className="command-palette-icon" />}
                                <span className="command-palette-label">{command.label}</span>
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