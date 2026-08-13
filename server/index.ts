import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createApi } from "./api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // The login throttle keys on req.ip, which behind a reverse proxy is the
  // proxy's own address until the forwarded header is explicitly trusted.
  if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY);

  // Mounted ahead of the static handler and the SPA fallback, so an unknown
  // /api path answers as JSON instead of returning index.html to a fetch().
  app.use(createApi());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
