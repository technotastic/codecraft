// src/renderer/App.tsx
import React from 'react';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import './App.css'; // Import the layout styles

function App() {
  // We can bring back IPC testing later if needed, removed for layout focus
  // const [message, setMessage] = useState<string>('Click Ping to test IPC!');
  // const testIPC = async () => { ... };

  return (
    <div className="app-container">
      <Sidebar />
      <MainPanel />
      {/* Previous content removed for clarity
      <h1>Hello from React & TypeScript in Electron!</h1>
      <p>Welcome to CodeCraft IDE V0.0.1 (TS Edition)</p>
      <button onClick={testIPC}>Ping Main Process</button>
      <p>{message}</p>
      */}
    </div>
  );
}

export default App;