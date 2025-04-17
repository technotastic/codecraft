// src/renderer/App.tsx
import React from 'react';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import './App.css'; // Import the layout styles

function App() {
  return (
    <div className="app-container"> {/* Root container with flex display */}
      <Sidebar />   {/* Child 1: Fixed width */}
      <MainPanel /> {/* Child 2: Flexible width */}
    </div>
  );
}

export default App;