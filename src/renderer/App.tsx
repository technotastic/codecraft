// src/renderer/App.tsx
import React from 'react';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import './App.css'; // Import the layout styles

// No theme logic needed directly here anymore, as ThemeProvider handles class application.
function App() {
  return (
    <div className="app-container"> {/* Root container for app layout */}
      <Sidebar />   {/* Sidebar component */}
      <MainPanel /> {/* Main content area (Editor + Terminal) */}
    </div>
  );
}

export default App;