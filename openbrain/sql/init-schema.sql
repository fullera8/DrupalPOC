-- ============================================================
-- Open Brain — Azure SQL Schema Initialisation
-- ============================================================
-- Target: Azure SQL Database (DTU Basic, 5 DTU)
-- Server: openbrain-sql.database.windows.net
-- Database: openbrain-db
-- Run once to bootstrap the schema.
--
-- VECTOR(1536) DATA TYPE:
--   Azure SQL supports the VECTOR(1536) data type (GA) on
--   all tiers including DTU Basic. Embeddings from Azure
--   OpenAI text-embedding-3-small are stored as 1536-dim
--   float vectors natively in the column.
--
-- SIMILARITY SEARCH:
--   VECTOR_DISTANCE('cosine', ...) is used for k-NN search.
--   At POC scale (<10K memories), a full scan completes in
--   <10ms — no DiskANN index is needed.
--
-- PER-BRAIN ISOLATION:
--   Each brain is an isolated SQL schema containing the same
--   three tables (memories, metadata, conversations) and
--   indexes. The default brain is 'brain_default'. New brains
--   are created by calling brain_default.create_new_brain,
--   which duplicates the table structure under a new schema.
-- ============================================================

-- ============================================================
-- 1. Create the default brain schema
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'brain_default')
    EXEC('CREATE SCHEMA brain_default');
GO

-- ============================================================
-- 2. memories — stores raw text + vector embedding
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables t
               JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'brain_default' AND t.name = 'memories')
BEGIN
    CREATE TABLE brain_default.memories (
        id          INT            IDENTITY(1,1) PRIMARY KEY,
        content     NVARCHAR(MAX)  NOT NULL,
        embedding   VECTOR(1536)   NOT NULL,
        source_type VARCHAR(50)    NULL,       -- 'user_command', 'conversation', 'wiki_import'
        created_at  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        updated_at  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        created_by  VARCHAR(255)   NULL,
        is_active   BIT            NOT NULL DEFAULT 1
    );
END
GO

-- ============================================================
-- 3. metadata — tag-based metadata linked to memories
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables t
               JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'brain_default' AND t.name = 'metadata')
BEGIN
    CREATE TABLE brain_default.metadata (
        id         INT          IDENTITY(1,1) PRIMARY KEY,
        memory_id  INT          NOT NULL,
        tag_type   VARCHAR(50)  NOT NULL,   -- e.g. 'CONCEPT', 'RESPONDS_TO', 'DIFFICULTY', 'METADATA_STATUS'
        tag_value  VARCHAR(255) NOT NULL,
        confidence FLOAT        NOT NULL DEFAULT 1.0,   -- always 1.0 for rule-based
        source     VARCHAR(50)  NOT NULL DEFAULT 'rule_engine',

        CONSTRAINT FK_metadata_memory
            FOREIGN KEY (memory_id)
            REFERENCES brain_default.memories (id)
    );
END
GO

-- ============================================================
-- 4. conversations — links memories to chat sessions
-- ============================================================
-- TODO [Phase 2]: The conversations table schema is a placeholder.
-- Before implementing conversation capture, finalize the schema:
--   - Add 'message_text NVARCHAR(MAX)' column for storing message content
--   - Confirm direction values: use 'user'/'assistant' (current) or 'inbound'/'outbound'
--   - Add any additional columns needed for conversation threading
IF NOT EXISTS (SELECT 1 FROM sys.tables t
               JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'brain_default' AND t.name = 'conversations')
BEGIN
    CREATE TABLE brain_default.conversations (
        id          INT          IDENTITY(1,1) PRIMARY KEY,
        session_id  VARCHAR(255) NULL,
        memory_id   INT          NULL,
        direction   VARCHAR(10)  NULL,       -- 'user' or 'assistant'
        captured_at DATETIME2    NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_conversations_memory
            FOREIGN KEY (memory_id)
            REFERENCES brain_default.memories (id)
    );
END
GO

-- ============================================================
-- 5. Indexes
-- ============================================================

-- Fast joins from metadata → memories
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_metadata_memory_id'
               AND object_id = OBJECT_ID('brain_default.metadata'))
    CREATE NONCLUSTERED INDEX IX_metadata_memory_id
        ON brain_default.metadata (memory_id);
GO

-- Metadata filtering by tag type + value
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_metadata_tag_type_value'
               AND object_id = OBJECT_ID('brain_default.metadata'))
    CREATE NONCLUSTERED INDEX IX_metadata_tag_type_value
        ON brain_default.metadata (tag_type, tag_value);
GO

-- Exclude soft-deleted rows
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_memories_is_active'
               AND object_id = OBJECT_ID('brain_default.memories'))
    CREATE NONCLUSTERED INDEX IX_memories_is_active
        ON brain_default.memories (is_active);
GO

-- Filter by source type
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_memories_source_type'
               AND object_id = OBJECT_ID('brain_default.memories'))
    CREATE NONCLUSTERED INDEX IX_memories_source_type
        ON brain_default.memories (source_type);
GO

-- ============================================================
-- 6. Helper stored procedure: create_new_brain
--    Duplicates the brain_default structure under a new schema.
--    Called by the MCP server's create_brain tool.
-- ============================================================
IF OBJECT_ID('brain_default.create_new_brain', 'P') IS NOT NULL
    DROP PROCEDURE brain_default.create_new_brain;
GO

CREATE PROCEDURE brain_default.create_new_brain
    @brain_name NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate: schema name must be a safe identifier
    IF @brain_name IS NULL OR LEN(@brain_name) = 0
    BEGIN
        RAISERROR('Brain name cannot be null or empty.', 16, 1);
        RETURN;
    END

    -- Reject names that aren't valid SQL identifiers
    IF @brain_name LIKE '%[^a-zA-Z0-9_]%'
    BEGIN
        RAISERROR('Brain name must contain only letters, digits, and underscores.', 16, 1);
        RETURN;
    END

    -- Check if schema already exists
    IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = @brain_name)
    BEGIN
        RAISERROR('Schema [%s] already exists.', 16, 1, @brain_name);
        RETURN;
    END

    DECLARE @sql NVARCHAR(MAX);
    DECLARE @quoted NVARCHAR(256) = QUOTENAME(@brain_name);

    -- Create schema
    SET @sql = N'CREATE SCHEMA ' + @quoted;
    EXEC sp_executesql @sql;

    -- Create memories table
    SET @sql = N'
        CREATE TABLE ' + @quoted + N'.memories (
            id          INT            IDENTITY(1,1) PRIMARY KEY,
            content     NVARCHAR(MAX)  NOT NULL,
            embedding   VECTOR(1536)   NOT NULL,
            source_type VARCHAR(50)    NULL,
            created_at  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
            updated_at  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
            created_by  VARCHAR(255)   NULL,
            is_active   BIT            NOT NULL DEFAULT 1
        );';
    EXEC sp_executesql @sql;

    -- Create metadata table
    SET @sql = N'
        CREATE TABLE ' + @quoted + N'.metadata (
            id         INT          IDENTITY(1,1) PRIMARY KEY,
            memory_id  INT          NOT NULL,
            tag_type   VARCHAR(50)  NOT NULL,
            tag_value  VARCHAR(255) NOT NULL,
            confidence FLOAT        NOT NULL DEFAULT 1.0,
            source     VARCHAR(50)  NOT NULL DEFAULT ''rule_engine'',
            CONSTRAINT FK_' + @brain_name + N'_metadata_memory
                FOREIGN KEY (memory_id)
                REFERENCES ' + @quoted + N'.memories (id)
        );';
    EXEC sp_executesql @sql;

    -- Create conversations table
    SET @sql = N'
        CREATE TABLE ' + @quoted + N'.conversations (
            id          INT          IDENTITY(1,1) PRIMARY KEY,
            session_id  VARCHAR(255) NULL,
            memory_id   INT          NULL,
            direction   VARCHAR(10)  NULL,
            captured_at DATETIME2    NOT NULL DEFAULT GETUTCDATE(),
            CONSTRAINT FK_' + @brain_name + N'_conversations_memory
                FOREIGN KEY (memory_id)
                REFERENCES ' + @quoted + N'.memories (id)
        );';
    EXEC sp_executesql @sql;

    -- Create indexes
    SET @sql = N'CREATE NONCLUSTERED INDEX IX_' + @brain_name + N'_metadata_memory_id
        ON ' + @quoted + N'.metadata (memory_id);';
    EXEC sp_executesql @sql;

    SET @sql = N'CREATE NONCLUSTERED INDEX IX_' + @brain_name + N'_metadata_tag_type_value
        ON ' + @quoted + N'.metadata (tag_type, tag_value);';
    EXEC sp_executesql @sql;

    SET @sql = N'CREATE NONCLUSTERED INDEX IX_' + @brain_name + N'_memories_is_active
        ON ' + @quoted + N'.memories (is_active);';
    EXEC sp_executesql @sql;

    SET @sql = N'CREATE NONCLUSTERED INDEX IX_' + @brain_name + N'_memories_source_type
        ON ' + @quoted + N'.memories (source_type);';
    EXEC sp_executesql @sql;
END
GO
