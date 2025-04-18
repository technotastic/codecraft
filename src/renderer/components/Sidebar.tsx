// src/renderer/components/Sidebar.tsx
import React from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import CustomSelect from './CustomSelect'; // Import the custom component

const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'win95-placeholder', label: 'Windows 95 (Basic)' },
];

const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="sidebar">
      <h2>Files</h2>

      {/* File tree placeholder */}
      <div className="file-tree-placeholder">
        <p>Placeholder for file tree...</p>
      </div>

      {/* Theme Switcher Section - At the bottom */}
      <div className="theme-switcher">
        <label id="theme-select-label" htmlFor="theme-select"> {/* Use label's ID for aria */}
          Theme:
        </label>
        {/* Replace native select with CustomSelect */}
        <CustomSelect<ThemeName>
          labelId="theme-select-label" // Link to the label
          options={themeOptions}
          value={theme}
          onChange={(newTheme) => setTheme(newTheme)}
        />
      </div>
    </div>
  );
};

export default Sidebar;