/**
 * Service: database
 *
 * Manages Azure SQL connections via tedious.
 * Provides query helpers for inserting memories, executing
 * vector similarity searches, and soft-deleting entries.
 *
 * Connection string sourced from environment variables:
 *   AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD
 *
 * NOTE: Uses connection-per-request pattern. At POC scale (<10K memories,
 * scale-to-zero Container App), this is sufficient. For production, add a
 * connection pool via tarn or switch to the mssql package.
 */

import { Connection, Request, TYPES } from "tedious";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryTag {
  tagType: string;
  tagValue: string;
  confidence: number;
  source: string;
}

export interface MemoryResult {
  memoryId: number;
  content: string;
  similarity: number;
  tags: MemoryTag[];
  createdBy: string | null;
  createdAt: Date;
  sourceType: string | null;
}

// ---------------------------------------------------------------------------
// Configuration (read once at module load, validated on first use)
// ---------------------------------------------------------------------------

const server = process.env.AZURE_SQL_SERVER ?? "";
const database = process.env.AZURE_SQL_DATABASE ?? "";
const sqlUser = process.env.AZURE_SQL_USER ?? "";
const sqlPassword = process.env.AZURE_SQL_PASSWORD ?? "";

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------

function getConnectionConfig() {
  if (!server) throw new Error("AZURE_SQL_SERVER is not set.");
  if (!database) throw new Error("AZURE_SQL_DATABASE is not set.");
  if (!sqlUser) throw new Error("AZURE_SQL_USER is not set.");
  if (!sqlPassword) throw new Error("AZURE_SQL_PASSWORD is not set.");

  return {
    server,
    authentication: {
      type: "default" as const,
      options: { userName: sqlUser, password: sqlPassword },
    },
    options: {
      database,
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
  };
}

interface QueryParam {
  name: string;
  type: (typeof TYPES)[keyof typeof TYPES];
  value: unknown;
}

type RowObject = Record<string, unknown>;

function openConnection(): Promise<Connection> {
  return new Promise<Connection>((resolve, reject) => {
    const conn = new Connection(getConnectionConfig());
    conn.on("connect", (err) => {
      if (err)
        reject(new Error(`Azure SQL connection failed: ${err.message}`));
      else resolve(conn);
    });
    conn.connect();
  });
}

function executeQuery(
  conn: Connection,
  sql: string,
  params: QueryParam[] = [],
): Promise<RowObject[]> {
  return new Promise<RowObject[]>((resolve, reject) => {
    const rows: RowObject[] = [];
    const request = new Request(sql, (err) => {
      if (err) reject(err);
      else resolve(rows);
    });

    for (const p of params) {
      request.addParameter(p.name, p.type, p.value);
    }

    request.on("row", (columns) => {
      const row: RowObject = {};
      for (const col of columns) {
        row[col.metadata.colName] = col.value;
      }
      rows.push(row);
    });

    conn.execSql(request);
  });
}

async function withConnection<T>(
  fn: (conn: Connection) => Promise<T>,
): Promise<T> {
  const conn = await openConnection();
  try {
    return await fn(conn);
  } finally {
    conn.close();
  }
}

// ---------------------------------------------------------------------------
// Schema validation (prevents SQL injection on identifiers)
// ---------------------------------------------------------------------------

function quoteSchema(schema: string): string {
  if (!schema || !/^[a-zA-Z0-9_]+$/.test(schema)) {
    throw new Error(
      `Invalid schema name "${schema}". Only letters, digits, and underscores are allowed.`,
    );
  }
  return `[${schema}]`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function vectorToString(embedding: number[]): string {
  return "[" + embedding.join(",") + "]";
}

function groupTagsByMemory(rows: RowObject[]): Map<number, MemoryTag[]> {
  const map = new Map<number, MemoryTag[]>();
  for (const row of rows) {
    const memId = row.memory_id as number;
    const tag: MemoryTag = {
      tagType: row.tag_type as string,
      tagValue: row.tag_value as string,
      confidence: row.confidence as number,
      source: row.source as string,
    };
    if (!map.has(memId)) map.set(memId, []);
    map.get(memId)!.push(tag);
  }
  return map;
}

/**
 * Fetch all metadata rows for a set of memory IDs (within the same connection).
 * @param qs - Already bracket-quoted schema name, e.g. `[brain_default]`
 */
async function fetchMetadata(
  conn: Connection,
  qs: string,
  memoryIds: number[],
): Promise<Map<number, MemoryTag[]>> {
  if (memoryIds.length === 0) return new Map();

  const placeholders = memoryIds.map((_, i) => `@mid${i}`).join(", ");
  const sql = `
    SELECT memory_id, tag_type, tag_value, confidence, source
    FROM ${qs}.metadata
    WHERE memory_id IN (${placeholders})`;

  const params: QueryParam[] = memoryIds.map((id, i) => ({
    name: `mid${i}`,
    type: TYPES.Int,
    value: id,
  }));

  const rows = await executeQuery(conn, sql, params);
  return groupTagsByMemory(rows);
}

function toMemoryResult(
  row: RowObject,
  similarity: number,
  tagMap: Map<number, MemoryTag[]>,
): MemoryResult {
  const memoryId = row.memoryId as number;
  return {
    memoryId,
    content: row.content as string,
    similarity,
    tags: tagMap.get(memoryId) ?? [],
    createdBy: (row.created_by as string) ?? null,
    createdAt: row.created_at as Date,
    sourceType: (row.source_type as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Insert a new memory row with its vector embedding.
 * Returns the auto-generated memory ID.
 */
export async function storeMemory(
  schema: string,
  content: string,
  embedding: number[],
  sourceType: string,
  createdBy: string,
): Promise<number> {
  const qs = quoteSchema(schema);

  return withConnection(async (conn) => {
    const sql = `
      INSERT INTO ${qs}.memories (content, embedding, source_type, created_by)
      OUTPUT INSERTED.id
      VALUES (@content, CAST(@embedding AS VECTOR(1536)), @sourceType, @createdBy)`;

    const rows = await executeQuery(conn, sql, [
      { name: "content", type: TYPES.NVarChar, value: content },
      {
        name: "embedding",
        type: TYPES.NVarChar,
        value: vectorToString(embedding),
      },
      { name: "sourceType", type: TYPES.VarChar, value: sourceType },
      { name: "createdBy", type: TYPES.VarChar, value: createdBy },
    ]);

    if (rows.length === 0 || typeof rows[0].id !== "number") {
      throw new Error("storeMemory: failed to retrieve inserted ID.");
    }

    return rows[0].id as number;
  });
}

/**
 * Bulk-insert metadata tag rows for a given memory.
 */
export async function storeMetadata(
  schema: string,
  memoryId: number,
  tags: Array<{
    tagType: string;
    tagValue: string;
    confidence: number;
    source: string;
  }>,
): Promise<void> {
  if (tags.length === 0) return;

  const qs = quoteSchema(schema);

  await withConnection(async (conn) => {
    const valueClauses: string[] = [];
    const params: QueryParam[] = [];

    for (let i = 0; i < tags.length; i++) {
      valueClauses.push(
        `(@memId${i}, @tagType${i}, @tagValue${i}, @conf${i}, @src${i})`,
      );
      params.push(
        { name: `memId${i}`, type: TYPES.Int, value: memoryId },
        { name: `tagType${i}`, type: TYPES.VarChar, value: tags[i].tagType },
        {
          name: `tagValue${i}`,
          type: TYPES.VarChar,
          value: tags[i].tagValue,
        },
        { name: `conf${i}`, type: TYPES.Float, value: tags[i].confidence },
        { name: `src${i}`, type: TYPES.VarChar, value: tags[i].source },
      );
    }

    const sql = `
      INSERT INTO ${qs}.metadata (memory_id, tag_type, tag_value, confidence, source)
      VALUES ${valueClauses.join(", ")}`;

    await executeQuery(conn, sql, params);
  });
}

/**
 * k-NN vector similarity search using VECTOR_DISTANCE (cosine).
 * Returns top-k memories above the similarity threshold, with metadata tags.
 */
export async function searchByVector(
  schema: string,
  queryEmbedding: number[],
  topK: number,
  threshold: number,
  metadataFilters?: { tagType: string; tagValue: string }[],
): Promise<MemoryResult[]> {
  const qs = quoteSchema(schema);

  return withConnection(async (conn) => {
    // VECTOR_DISTANCE returns cosine distance (0 = identical, 2 = opposite).
    // similarity = 1 - distance, so filter: distance <= 1 - threshold
    const params: QueryParam[] = [
      {
        name: "queryEmb",
        type: TYPES.NVarChar,
        value: vectorToString(queryEmbedding),
      },
      { name: "distThreshold", type: TYPES.Float, value: 1 - threshold },
      { name: "topK", type: TYPES.Int, value: topK },
    ];

    let filterClauses = "";
    if (metadataFilters && metadataFilters.length > 0) {
      for (let i = 0; i < metadataFilters.length; i++) {
        filterClauses += `
          AND EXISTS (
            SELECT 1 FROM ${qs}.metadata mf
            WHERE mf.memory_id = m.id
              AND mf.tag_type = @fType${i}
              AND mf.tag_value = @fValue${i}
          )`;
        params.push(
          {
            name: `fType${i}`,
            type: TYPES.VarChar,
            value: metadataFilters[i].tagType,
          },
          {
            name: `fValue${i}`,
            type: TYPES.VarChar,
            value: metadataFilters[i].tagValue,
          },
        );
      }
    }

    const sql = `
      SELECT
        m.id AS memoryId,
        m.content,
        m.created_by,
        m.created_at,
        m.source_type,
        1 - VECTOR_DISTANCE('cosine', m.embedding, CAST(@queryEmb AS VECTOR(1536))) AS similarity
      FROM ${qs}.memories m
      WHERE m.is_active = 1
        AND VECTOR_DISTANCE('cosine', m.embedding, CAST(@queryEmb AS VECTOR(1536))) <= @distThreshold
        ${filterClauses}
      ORDER BY similarity DESC
      OFFSET 0 ROWS FETCH NEXT @topK ROWS ONLY`;

    const memoryRows = await executeQuery(conn, sql, params);
    if (memoryRows.length === 0) return [];

    const ids = memoryRows.map((r) => r.memoryId as number);
    const tagMap = await fetchMetadata(conn, qs, ids);

    return memoryRows.map((r) =>
      toMemoryResult(r, r.similarity as number, tagMap),
    );
  });
}

/**
 * Keyword search using LIKE on the content column.
 * Returns matching memories with metadata tags, ordered by recency.
 */
export async function searchByKeyword(
  schema: string,
  keyword: string,
  topK: number,
): Promise<MemoryResult[]> {
  const qs = quoteSchema(schema);

  return withConnection(async (conn) => {
    const sql = `
      SELECT TOP(@topK)
        m.id AS memoryId, m.content, m.created_by, m.created_at, m.source_type
      FROM ${qs}.memories m
      WHERE m.is_active = 1
        AND m.content LIKE '%' + @keyword + '%'
      ORDER BY m.created_at DESC`;

    const memoryRows = await executeQuery(conn, sql, [
      { name: "topK", type: TYPES.Int, value: topK },
      { name: "keyword", type: TYPES.NVarChar, value: keyword },
    ]);
    if (memoryRows.length === 0) return [];

    const ids = memoryRows.map((r) => r.memoryId as number);
    const tagMap = await fetchMetadata(conn, qs, ids);

    return memoryRows.map((r) => toMemoryResult(r, 0, tagMap));
  });
}

/**
 * Soft-delete a memory by setting is_active = 0.
 */
export async function softDeleteMemory(
  schema: string,
  memoryId: number,
): Promise<void> {
  const qs = quoteSchema(schema);

  await withConnection(async (conn) => {
    const sql = `
      UPDATE ${qs}.memories
      SET is_active = 0, updated_at = GETUTCDATE()
      WHERE id = @memoryId`;

    await executeQuery(conn, sql, [
      { name: "memoryId", type: TYPES.Int, value: memoryId },
    ]);
  });
}

/**
 * Return active memories tagged with METADATA_STATUS = 'untagged'.
 * Used by the metadata extraction engine to find memories needing tagging.
 */
export async function getUntaggedMemories(
  schema: string,
  limit: number = 100,
): Promise<MemoryResult[]> {
  const qs = quoteSchema(schema);

  return withConnection(async (conn) => {
    const sql = `
      SELECT TOP(@limit) m.id AS memoryId, m.content, m.created_by, m.created_at, m.source_type
      FROM ${qs}.memories m
      INNER JOIN ${qs}.metadata md
        ON md.memory_id = m.id
       AND md.tag_type = 'METADATA_STATUS'
       AND md.tag_value = 'untagged'
      WHERE m.is_active = 1
      ORDER BY m.created_at DESC`;

    const memoryRows = await executeQuery(conn, sql, [
      { name: "limit", type: TYPES.Int, value: limit },
    ]);
    if (memoryRows.length === 0) return [];

    const ids = memoryRows.map((r) => r.memoryId as number);
    const tagMap = await fetchMetadata(conn, qs, ids);

    return memoryRows.map((r) => toMemoryResult(r, 0, tagMap));
  });
}
