// src/renderer/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext'; // Import the ThemeProvider
import './index.css'; // Ensure base styles are imported
import 'allotment/dist/style.css'; // <-- Ensure this import exists


const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  // Removed StrictMode for now as it can cause double useEffects in dev, which might confuse debugging
  // <React.StrictMode>
    <ThemeProvider defaultTheme="dark"> {/* Wrap App with ThemeProvider, set default */}
      <App />
    </ThemeProvider>
  // </React.StrictMode>
);