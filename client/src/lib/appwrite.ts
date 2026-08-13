import { Account, Client, TablesDB } from "appwrite";

/**
 * The Appwrite connection.
 *
 * Both values are public by design — the project ID identifies the project, it
 * does not authorise anything, and a static build has nowhere to hide a secret
 * anyway. What actually guards a reader's record is the per-row permission
 * written when the row is created, which names that one user.
 */
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

// Missing configuration otherwise surfaces as an opaque network failure on the
// first login, long after the build that caused it.
if (!endpoint || !projectId) {
  throw new Error(
    "Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.",
  );
}

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID ?? "qazotrack";
export const RECORDS_TABLE_ID = import.meta.env.VITE_APPWRITE_RECORDS_TABLE_ID ?? "records";

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);

// TablesDB, not the older Databases service: tables and rows are what this
// version of Appwrite actually creates, and `Databases` is kept only for
// compatibility with projects built before the rename.
export const tables = new TablesDB(client);
