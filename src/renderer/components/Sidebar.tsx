// --- START FILE: src/renderer/components/Sidebar.tsx ---
// src/renderer/components/Sidebar.tsx
import React from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import CustomSelect from './CustomSelect'; // Import the custom component

// Define the options for the custom select - ADD NEW THEMES HERE
const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark (VS Code)' },
  { value: 'win95', label: 'Windows 95' },
  { value: 'pipboy', label: 'Pip-Boy' },
  { value: 'mirc', label: 'mIRC' },
  { value: 'qbasic', label: 'QBasic' },
  { value: 'orange', label: 'Orange CRT' },
  { value: 'cga', label: 'CGA (Cyan)' },
  { value: 'atari', label: 'Atari 2600' },
  { value: 'snes', label: 'SNES' },
  { value: 'bw_tv', label: 'B&W TV' },
];

const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="sidebar">
      <h2>Files</h2>

      {/* File tree placeholder */}
      <div className="file-tree-placeholder">
        <p>Placeholder for file tree...</p>
        <p>Next step: Implement file browsing!</p>
      </div>

      {/* Theme Switcher Section - At the bottom */}
      <div className="theme-switcher">
        <label id="theme-select-label" htmlFor="theme-select">
          Theme:
        </label>
        {/* Use CustomSelect */}
        <CustomSelect<ThemeName>
          labelId="theme-select-label"
          options={themeOptions} // Use updated options
          value={theme}
          onChange={(newTheme) => setTheme(newTheme)}
        />
      </div>
    </div>
  );
};

export default Sidebar;
// --- END FILE: src/renderer/components/Sidebar.tsx ---