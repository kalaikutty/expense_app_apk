/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APK_DOWNLOAD_URL?: string;
  readonly VITE_GITHUB_REPO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}