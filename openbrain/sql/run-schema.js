// Quick-and-dirty SQL schema runner for init-schema.sql
// Splits on GO batch separators and executes each batch sequentially via tedious.
// Usage: node sql/run-schema.js
const fs = require('fs');
const path = require('path');
const { Connection, Request } = require('tedious');

const server = process.env.AZURE_SQL_SERVER || 'openbrain-sql.database.windows.net';
const database = process.env.AZURE_SQL_DATABASE || 'openbrain-db';
const user = process.env.AZURE_SQL_USER;
const password = process.env.AZURE_SQL_PASSWORD;

if (!user || !password) {
  console.error('AZURE_SQL_USER and AZURE_SQL_PASSWORD must be set');
  process.exit(1);
}

const config = {
  server,
  authentication: {
    type: 'default',
    options: { userName: user, password }
  },
  options: {
    database,
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

const sqlFile = path.join(__dirname, 'init-schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split on GO lines (case-insensitive, standalone on a line)
const batches = sql
  .split(/^\s*GO\s*$/gim)
  .map(b => b.trim())
  .filter(b => {
    // Keep any batch that has at least one non-comment, non-empty line
    const lines = b.split('\n').map(l => l.trim());
    return lines.some(l => l.length > 0 && !l.startsWith('--'));
  });

console.log(`Loaded ${batches.length} SQL batches from init-schema.sql`);

const connection = new Connection(config);

function runBatch(batchSql, index) {
  return new Promise((resolve, reject) => {
    const request = new Request(batchSql, (err) => {
      if (err) {
        console.error(`  Batch ${index + 1} FAILED: ${err.message}`);
        reject(err);
      } else {
        console.log(`  Batch ${index + 1} OK`);
        resolve();
      }
    });
    connection.execSqlBatch(request);
  });
}

connection.on('connect', async (err) => {
  if (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
  console.log(`Connected to ${server}/${database}`);
  console.log('Running schema batches...\n');

  try {
    for (let i = 0; i < batches.length; i++) {
      await runBatch(batches[i], i);
    }
    console.log('\nAll batches completed successfully.');
  } catch (e) {
    console.error('\nSchema initialization failed.');
    process.exit(1);
  } finally {
    connection.close();
  }
});

connection.connect();
