/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PARSE_APPLICATION_ID: string;
    readonly VITE_PARSE_HOST_URL: string;
    readonly VITE_PARSE_JAVASCRIPT_KEY: string;
    readonly VITE_BUILD_DATE?: number;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
