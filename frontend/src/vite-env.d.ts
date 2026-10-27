/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Leave empty to call the API on the same origin (recommended). */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
