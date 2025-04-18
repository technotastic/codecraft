// src/renderer/contexts/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';

// Define the possible theme names
export type ThemeName = 'light' | 'dark' | 'win95-placeholder'; // Add more as needed

// Define the shape of the context value
interface ThemeContextProps {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

// Create the context with a default value (can be null or a sensible default)
// Using undefined initially and checking in the hook is safer to ensure Provider exists.
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// Define the props for the provider component
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
}

// Create the provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultTheme = 'light' }) => {
  const [theme, setTheme] = useState<ThemeName>(() => {
    // Optional: Load saved theme from localStorage or use default
    // const savedTheme = localStorage.getItem('app-theme') as ThemeName | null;
    // return savedTheme || defaultTheme;
    return defaultTheme;
  });

  // Effect to apply the theme class to the root element (#root)
  useEffect(() => {
    const rootElement = document.getElementById('root'); // Target the main div
    if (rootElement) {
        // Remove existing theme classes before adding the new one
        rootElement.classList.remove('theme-light', 'theme-dark', 'theme-win95-placeholder'); // Add all possible theme classes here
        rootElement.classList.add(`theme-${theme}`);
        // Optional: Save theme choice to localStorage
        // localStorage.setItem('app-theme', theme);
        console.log(`Theme applied: theme-${theme}`);
    }
  }, [theme]);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};