/**
 * Tool: forget
 *
 * Performs a soft delete on a memory entry by setting its
 * is_active flag to 0. The embedding and content remain in the
 * database but are excluded from search results.
 *
 * MCP tool name: "forget"
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { softDeleteMemory } from "../services/database.js";

const inputSchema = {
  memoryId: z.number().describe("The ID of the memory to soft-delete"),
  brain: z.string().default("brain_default"),
};

export function register(server: McpServer): void {
  server.tool(
    "forget",
    "Soft-delete a memory from the Open Brain. The memory is not permanently deleted — it is marked as inactive and excluded from future searches. Use when the user says 'forget memory #42' or 'remove that memory'.",
    inputSchema,
    async ({ memoryId, brain }) => {
      await softDeleteMemory(brain, memoryId);

      return {
        content: [
          {
            type: "text" as const,
            text: `Memory #${memoryId} has been soft-deleted from "${brain}". It will no longer appear in search results.`,
          },
        ],
      };
    },
  );
}
