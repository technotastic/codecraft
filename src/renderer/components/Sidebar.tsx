// src/renderer/components/Sidebar.tsx
import React from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext'; // Import useTheme and ThemeName

const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme(); // Use the theme context

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value as ThemeName);
  };

  return (
    <div className="sidebar">
      <h2>Files</h2>

      {/* Theme Switcher Section - MOVED HERE */}
      <div className="theme-switcher">
        <label htmlFor="theme-select">Theme:</label>
        <select id="theme-select" value={theme} onChange={handleThemeChange}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="win95-placeholder">Windows 95 (Basic)</option>
          {/* Add more themes here as they are created */}
        </select>
      </div>

      {/* File tree placeholder */}
      <div className="file-tree-placeholder">
        <p>Placeholder for file tree...</p>
        {/* Add more placeholder content or structure as needed */}
      </div>

    </div>
  );
};

export default Sidebar;