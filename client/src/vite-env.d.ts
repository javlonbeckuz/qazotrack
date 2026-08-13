/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  /** Both default in `lib/appwrite.ts`; set them only to point at a second project. */
  readonly VITE_APPWRITE_DATABASE_ID?: string;
  readonly VITE_APPWRITE_RECORDS_TABLE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
