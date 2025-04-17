// src/renderer/App.tsx
import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState<string>('Click Ping to test IPC!');

  const testIPC = async () => {
    try {
      // Use the exposed function from preload script - TS knows its shape!
      const response = await window.electronAPI.ping();
      setMessage(`IPC Response: ${response}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessage(`IPC Error: ${errMsg}`);
      console.error('IPC Error:', error);
    }
  };

  return (
    <div>
      <h1>Hello from React & TypeScript in Electron!</h1>
      <p>Welcome to CodeCraft IDE V0.0.1 (TS Edition)</p>
      <button onClick={testIPC}>Ping Main Process</button>
      <p>{message}</p>
      {/* We'll add Layout, Editor, Terminal, FileTree here */}
    </div>
  );
}

export default App;