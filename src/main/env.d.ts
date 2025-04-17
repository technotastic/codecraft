interface ImportMetaEnv {
    // Add environment variables used by your main process code here
    readonly VITE_DEV_SERVER_URL?: string; // Optional: Used by Electron window loading logic
    readonly PROD: boolean; // Based on your usage 'import.meta.env.PROD'
    readonly DEV: boolean; // Often useful to have DEV as well
    // Add any other custom VITE_ prefixed variables you might use in main.ts
    // readonly VITE_MY_API_KEY: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }