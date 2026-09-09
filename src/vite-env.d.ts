/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_MOCK_LATENCY?: string;
  readonly VITE_MOCK_ANALYSIS_SECONDS?: string;
  readonly VITE_MAX_UPLOAD_MB?: string;
  readonly VITE_API_TIMEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
