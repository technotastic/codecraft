// --- START FILE: src/renderer/contexts/ThemeContext.tsx ---
// src/renderer/contexts/ThemeContext.tsx
import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
    useMemo,
  } from "react";
  
  // Add the new theme names here
  export type ThemeName =
    | "light"
    | "dark"
    | "win95"
    | "pipboy"
    | "mirc"
    | "qbasic"
    | "orange"
    | "cga"
    | "atari"
    | "snes"
    | "bw_tv";
  
  // Define base font sizes (can be adjusted)
  const BASE_FONT_SIZES = {
    ui: 14,
    editor: 12,
    terminal: 12,
  };
  
  // Define the shape of the context value
  interface ThemeContextProps {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    fontSizeModifier: number; // e.g., -2, -1, 0, 1, 2 steps
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    resetFontSize: () => void;
  }
  
  const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);
  
  interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: ThemeName;
    defaultFontSizeModifier?: number;
  }
  
  const ALL_THEME_CLASSES = [ // Keep this potentially updated for cleanup, though dynamic removal works
    "theme-light",
    "theme-dark",
    "theme-win95",
    "theme-pipboy",
    "theme-mirc",
    "theme-qbasic",
    "theme-orange",
    "theme-cga",
    "theme-atari",
    "theme-snes",
    "theme-bw_tv",
  ];
  const FONT_SIZE_STEP = 1; // How many pixels each step changes
  const MAX_FONT_MODIFIER = 4; // Limit how large text can get
  const MIN_FONT_MODIFIER = -2; // Limit how small text can get
  
  export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = "dark",
    defaultFontSizeModifier = 0,
  }) => {
    const [theme, setTheme] = useState<ThemeName>(defaultTheme);
    const [fontSizeModifier, setFontSizeModifier] = useState<number>(
      defaultFontSizeModifier
    );
  
    // Apply Theme Class
    useEffect(() => {
      const rootElement = document.getElementById("root");
      if (rootElement) {
          // Remove all known theme classes before adding the new one
          const classesToRemove = ALL_THEME_CLASSES.filter(cls => rootElement.classList.contains(cls));
          if (classesToRemove.length > 0) {
              rootElement.classList.remove(...classesToRemove);
              document.body.classList.remove(...classesToRemove); // Also remove from body
          }
          // Add the current theme class
          rootElement.classList.add(`theme-${theme}`);
          document.body.classList.add(`theme-${theme}`); // Also apply to body
          console.log(`Theme applied: theme-${theme}`);
      }
  }, [theme]);
  
  
    // Apply Font Size CSS Variables
    useEffect(() => {
      const rootStyle = document.documentElement.style;
      const modifier = fontSizeModifier * FONT_SIZE_STEP;
  
      const uiSize = BASE_FONT_SIZES.ui + modifier;
      const editorSize = BASE_FONT_SIZES.editor + modifier;
      const terminalSize = BASE_FONT_SIZES.terminal + modifier;
  
      rootStyle.setProperty("--font-size-base", `${uiSize}px`);
      rootStyle.setProperty("--font-size-editor", `${editorSize}px`);
      rootStyle.setProperty("--font-size-terminal", `${terminalSize}px`);
  
      console.log(
        `Font sizes updated: Base=${uiSize}px, Editor=${editorSize}px, Terminal=${terminalSize}px`
      );
  
      // Trigger resize/reflow for editor/terminal if needed (optional)
      // This helps Monaco/Xterm recalculate layout with new font size
      window.dispatchEvent(new Event("resize"));
    }, [fontSizeModifier]);
  
    // Font size control functions
    const increaseFontSize = () => {
      setFontSizeModifier((prev) => Math.min(prev + 1, MAX_FONT_MODIFIER));
    };
    const decreaseFontSize = () => {
      setFontSizeModifier((prev) => Math.max(prev - 1, MIN_FONT_MODIFIER));
    };
    const resetFontSize = () => {
      setFontSizeModifier(0);
    };
  
    const contextValue = useMemo(
      () => ({
        theme,
        setTheme,
        fontSizeModifier,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
      }),
      [theme, fontSizeModifier]
    ); // Include modifier in dependencies
  
    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  };
  
  export const useTheme = (): ThemeContextProps => {
    // Rename to useSettings or similar later maybe
    const context = useContext(ThemeContext);
    if (context === undefined) {
      throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
  };
  // --- END FILE: src/renderer/contexts/ThemeContext.tsx ---