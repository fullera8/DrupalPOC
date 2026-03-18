/**
 * Open Brain MCP Server — Entry Point
 *
 * Initialises the MCP server, registers tools (remember, recall, search, forget),
 * and starts the HTTP/SSE transport on MCP_SERVER_PORT.
 *
 * Technology:
 *   - @modelcontextprotocol/sdk for MCP protocol handling
 *   - Express for HTTP transport (Streamable HTTP pattern)
 *   - Azure SQL for vector storage
 *   - Azure OpenAI for embeddings
 */

import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { register as registerRemember } from "./tools/remember.js";
import { register as registerRecall } from "./tools/recall.js";
import { register as registerSearch } from "./tools/search.js";
import { register as registerForget } from "./tools/forget.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.MCP_SERVER_PORT ?? "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET ?? "";
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "*").split(",").map((s) => s.trim());

// ---------------------------------------------------------------------------
// MCP server factory — one instance per session
// ---------------------------------------------------------------------------

function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "openbrain-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  registerRemember(server);
  registerRecall(server);
  registerSearch(server);
  registerForget(server);

  return server;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

const sessions = new Map<string, Session>();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// --- CORS middleware ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id",
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

// --- Health check (no auth) ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", brain: "openbrain" });
});

// --- Auth middleware ---
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  // Dev mode: if JWT_SECRET is not configured, skip auth
  if (!JWT_SECRET) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== JWT_SECRET) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// MCP routes (Streamable HTTP transport)
// ---------------------------------------------------------------------------

app.post("/mcp", authMiddleware, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session — hand off to its transport
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // Stale session ID — tell client to reconnect
  if (sessionId && !sessions.has(sessionId)) {
    res.status(404).json({ error: "Session not found. Start a new session." });
    return;
  }

  // New session
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, server });
    },
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", authMiddleware, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  } else {
    res.status(400).json({ error: "Missing or unknown session ID for SSE stream" });
  }
});

app.delete("/mcp", authMiddleware, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const { transport, server } = sessions.get(sessionId)!;
    await transport.close();
    await server.close();
    sessions.delete(sessionId);
    res.status(200).end();
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const httpServer = app.listen(PORT, () => {
  console.log(`Open Brain MCP server running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(): Promise<void> {
  console.log("Shutting down Open Brain MCP server...");

  // Close all active sessions
  const closing: Promise<void>[] = [];
  for (const [id, { transport, server }] of sessions) {
    closing.push(
      transport.close().then(() => server.close()),
    );
    sessions.delete(id);
  }
  await Promise.allSettled(closing);

  // Stop accepting new connections
  httpServer.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
