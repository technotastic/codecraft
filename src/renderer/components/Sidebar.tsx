// src/renderer/components/Sidebar.tsx
import React from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext';
import CustomSelect from './CustomSelect'; // Import the custom component

// Define the options for the custom select
const themeOptions: { value: ThemeName; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark (VS Code)' },
  { value: 'win95', label: 'Windows 95' },
  { value: 'pipboy', label: 'Pip-Boy' },
  { value: 'mirc', label: 'mIRC (Basic)' },
  // Add more themes here as they are created
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