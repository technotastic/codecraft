// --- START FILE: src/renderer/main.tsx ---
// src/renderer/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext'; // Import the ThemeProvider
import { EditorProvider } from './contexts/EditorContext'; // Import the EditorProvider
import { TerminalProvider } from './contexts/TerminalContext'; // Import the TerminalProvider
import './index.css'; // Ensure base styles are imported
import 'allotment/dist/style.css';
// Import UUID library where needed (e.g., in TerminalContext), no need to assign to globalThis here.
// import { v4 as uuidv4 } from 'uuid'; // No longer needed here


const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  // Wrap ALL providers around App
  // Order might matter if one context depends on another, but here it likely doesn't.
  <ThemeProvider defaultTheme="orange">
    <EditorProvider>
      <TerminalProvider> {/* Add TerminalProvider */}
        <App />
      </TerminalProvider>
    </EditorProvider>
  </ThemeProvider>
);
// --- END FILE: src/renderer/main.tsx ---