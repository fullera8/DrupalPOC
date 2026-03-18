/**
 * Tool: search
 *
 * Keyword-based search across stored memories. Complements the
 * semantic "recall" tool when exact string matches are needed
 * rather than meaning-based similarity.
 *
 * MCP tool name: "search"
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchByKeyword } from "../services/database.js";

const inputSchema = {
  keyword: z.string().describe("The keyword or phrase to search for"),
  brain: z
    .string()
    .default("brain_default"),
  topK: z.number().default(10),
};

export function register(server: McpServer): void {
  server.tool(
    "search",
    "Search the Open Brain using keyword matching. Use this as a complement to recall when you need exact string matches rather than semantic similarity.",
    inputSchema,
    async ({ keyword, brain, topK }) => {
      const results = await searchByKeyword(brain, keyword, topK);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No memories found containing "${keyword}" in "${brain}".`,
            },
          ],
        };
      }

      const header = `Found ${results.length} memor${results.length === 1 ? "y" : "ies"} matching "${keyword}" in "${brain}":\n`;

      const formatted = results
        .map((r, i) => {
          const tags =
            r.tags.length > 0
              ? r.tags.map((t) => `${t.tagType}:${t.tagValue}`).join(", ")
              : "none";

          return [
            `[${i + 1}] Memory #${r.memoryId}`,
            `  Content: ${r.content}`,
            `  Tags: ${tags}`,
            `  Created by: ${r.createdBy ?? "unknown"} | Source: ${r.sourceType ?? "unknown"} | Date: ${r.createdAt.toISOString()}`,
          ].join("\n");
        })
        .join("\n\n");

      return {
        content: [{ type: "text" as const, text: header + formatted }],
      };
    },
  );
}
