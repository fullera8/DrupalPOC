/**
 * Service: embedding
 *
 * Wraps the Azure OpenAI embeddings API (text-embedding-3-small,
 * 1536 dimensions). Provides functions to convert text into
 * float32 vectors for storage and similarity search.
 *
 * Pure utility — no database or MCP protocol knowledge.
 */

import { AzureOpenAI } from "openai";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? "";
const apiKey = process.env.AZURE_OPENAI_API_KEY ?? "";
const deployment =
  process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-small";
const dimensions = parseInt(
  process.env.EMBEDDING_DIMENSIONS ?? "1536",
  10,
);

// ---------------------------------------------------------------------------
// Azure OpenAI client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (_client) return _client;

  if (!endpoint) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT is not set. " +
        "Provide the Azure OpenAI resource endpoint (e.g. https://<resource>.openai.azure.com).",
    );
  }
  if (!apiKey) {
    throw new Error(
      "AZURE_OPENAI_API_KEY is not set. " +
        "Provide the API key for the Azure OpenAI resource.",
    );
  }

  _client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: "2024-10-21",
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a vector embedding for a single text string.
 *
 * @param text - The raw text to embed.
 * @returns A 1536-dimension float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.replace(/\n/g, " ").trim();
  if (!cleaned) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  try {
    const response = await getClient().embeddings.create({
      model: deployment,
      input: cleaned,
      dimensions,
    });

    return response.data[0].embedding;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    throw new Error(
      `Azure OpenAI embedding failed for single text: ${message}`,
    );
  }
}

/**
 * Generate vector embeddings for multiple texts in a single API call.
 * Used during bulk operations like wiki seeding.
 *
 * @param texts - Array of raw text strings to embed.
 * @returns An array of 1536-dimension float arrays (same order as input).
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const cleaned = texts.map((t) => t.replace(/\n/g, " ").trim());
  const nonEmpty = cleaned.every((t) => t.length > 0);
  if (!nonEmpty) {
    throw new Error(
      "Cannot generate embeddings: one or more input texts are empty after trimming.",
    );
  }

  try {
    const response = await getClient().embeddings.create({
      model: deployment,
      input: cleaned,
      dimensions,
    });

    // The API returns embeddings sorted by index — ensure correct order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    throw new Error(
      `Azure OpenAI embedding failed for batch of ${texts.length} texts: ${message}`,
    );
  }
}
