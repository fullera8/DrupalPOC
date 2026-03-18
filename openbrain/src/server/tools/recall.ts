/**
 * Tool: recall
 *
 * Accepts a natural-language query, generates an embedding,
 * and performs a cosine-similarity vector search against stored
 * memories in Azure SQL. Returns the top-K most relevant results.
 *
 * MCP tool name: "recall"
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generateEmbedding } from "../services/embedding.js";
import { searchByVector } from "../services/database.js";

const SIMILARITY_THRESHOLD = 0.3;

const inputSchema = {
  query: z.string().describe("The question or topic to search for"),
  brain: z
    .string()
    .default("brain_default")
    .describe("Which brain to search"),
  topK: z
    .number()
    .default(5)
    .describe("Maximum number of results to return"),
  metadataFilter: z
    .object({
      tagType: z.string(),
      tagValue: z.string(),
    })
    .optional()
    .describe("Optional metadata filter to narrow results"),
};

function formatResult(
  r: { memoryId: number; content: string; similarity: number; tags: Array<{ tagType: string; tagValue: string }>; createdBy: string | null; createdAt: Date; sourceType: string | null },
  index: number,
): string {
  const tags =
    r.tags.length > 0
      ? r.tags.map((t) => `${t.tagType}:${t.tagValue}`).join(", ")
      : "none";

  return [
    `[${index + 1}] Memory #${r.memoryId} (similarity: ${r.similarity.toFixed(3)})`,
    `  Content: ${r.content}`,
    `  Tags: ${tags}`,
    `  Created by: ${r.createdBy ?? "unknown"} | Source: ${r.sourceType ?? "unknown"} | Date: ${r.createdAt.toISOString()}`,
  ].join("\n");
}

export function register(server: McpServer): void {
  server.tool(
    "recall",
    "Search the Open Brain for memories semantically related to a query. Returns the most relevant stored memories ranked by meaning similarity. If no relevant memories are found above the similarity threshold, honestly reports that no information was found rather than guessing.",
    inputSchema,
    async ({ query, brain, topK, metadataFilter }) => {
      const queryVector = await generateEmbedding(query);

      const filters = metadataFilter ? [metadataFilter] : undefined;
      const results = await searchByVector(
        brain,
        queryVector,
        topK,
        SIMILARITY_THRESHOLD,
        filters,
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant memories found in the brain for this query. The brain does not have information about this topic.",
            },
          ],
        };
      }

      const header = `Found ${results.length} relevant memor${results.length === 1 ? "y" : "ies"} in "${brain}":\n`;
      const formatted = results.map((r, i) => formatResult(r, i)).join("\n\n");

      return {
        content: [{ type: "text" as const, text: header + formatted }],
      };
    },
  );
}
