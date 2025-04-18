// src/renderer/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext'; // Import the ThemeProvider
import { EditorProvider } from './contexts/EditorContext'; // Import the EditorProvider
import './index.css'; // Ensure base styles are imported
import 'allotment/dist/style.css';


const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  // Wrap ThemeProvider AND EditorProvider around App
  <ThemeProvider defaultTheme="dark">
    <EditorProvider>
      <App />
    </EditorProvider>
  </ThemeProvider>
);