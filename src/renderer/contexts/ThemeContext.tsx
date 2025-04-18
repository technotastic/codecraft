// src/renderer/contexts/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';

// Define the possible theme names
export type ThemeName = 'light' | 'dark' | 'win95' | 'pipboy' | 'mirc'; // Added new themes

// Define the shape of the context value
interface ThemeContextProps {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
}

// List of all possible theme classes to manage cleanup
const ALL_THEME_CLASSES = ['theme-light', 'theme-dark', 'theme-win95', 'theme-pipboy', 'theme-mirc'];

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultTheme = 'dark' }) => {
  const [theme, setTheme] = useState<ThemeName>(() => {
    // Optional: Load saved theme from localStorage or use default
    // const savedTheme = localStorage.getItem('app-theme') as ThemeName | null;
    // return savedTheme || defaultTheme;
    return defaultTheme;
  });

  // Effect to apply the theme class to the root element (#root)
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        // Remove all known theme classes first
        rootElement.classList.remove(...ALL_THEME_CLASSES);
        // Add the current theme class
        rootElement.classList.add(`theme-${theme}`);

        // Also apply to body if needed for global effects like overlays
        document.body.classList.remove(...ALL_THEME_CLASSES);
        document.body.classList.add(`theme-${theme}`);


        console.log(`Theme applied: theme-${theme}`);
    }
  }, [theme]);

  const contextValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};