/**
 * Tool: remember
 *
 * Accepts a text input, generates an embedding via Azure OpenAI,
 * extracts metadata using deterministic rules, and stores the memory
 * in Azure SQL with its vector representation and tags.
 *
 * MCP tool name: "remember"
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generateEmbedding } from "../services/embedding.js";
import { storeMemory, storeMetadata } from "../services/database.js";
import {
  extractMetadata,
  loadRulesConfig,
  type RulesConfig,
} from "../metadata/extractor.js";
import { resolve } from "node:path";

// Load rules config once at module level.
// __dirname is available in CJS (NodeNext without "type": "module").
const configPath = resolve(__dirname, "../metadata/rules.config.json");
let rulesConfig: RulesConfig | null = null;

function getRulesConfig(): RulesConfig {
  if (!rulesConfig) {
    rulesConfig = loadRulesConfig(configPath);
  }
  return rulesConfig;
}

const inputSchema = {
  content: z
    .string()
    .describe(
      "The text to remember — strip the 'remember that' prefix before passing",
    ),
  brain: z
    .string()
    .default("brain_default")
    .describe("Which brain schema to store in"),
  sourceType: z
    .enum(["user_command", "conversation", "wiki_import"])
    .default("user_command"),
  createdBy: z.string().default("copilot_user"),
};

export function register(server: McpServer): void {
  server.tool(
    "remember",
    "Store a new memory in the Open Brain. Use this when the user says 'remember that...' or 'remember this...'. The memory will be stored with vector embeddings for semantic search and tagged with metadata using deterministic rules.",
    inputSchema,
    async ({ content, brain, sourceType, createdBy }) => {
      const embedding = await generateEmbedding(content);
      const memoryId = await storeMemory(
        brain,
        content,
        embedding,
        sourceType,
        createdBy,
      );

      const tags = extractMetadata(content, getRulesConfig());
      await storeMetadata(brain, memoryId, tags);

      const conceptTags = tags.filter((t) => t.tagType === "CONCEPT");
      const isUntagged = tags.some(
        (t) => t.tagType === "METADATA_STATUS" && t.tagValue === "untagged",
      );

      const tagSummary =
        conceptTags.length > 0
          ? conceptTags.map((t) => t.tagValue).join(", ")
          : "none";

      const lines = [
        `Memory stored successfully.`,
        `  ID: ${memoryId}`,
        `  Brain: ${brain}`,
        `  Concepts: ${tagSummary}`,
        `  Status: ${isUntagged ? "untagged (no concept patterns matched)" : "tagged"}`,
        `  Total tags: ${tags.length}`,
      ];

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );
}
