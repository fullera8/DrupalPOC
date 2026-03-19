// Verify schema was created — lists tables in brain_default schema
const { Connection, Request } = require('tedious');

const conn = new Connection({
  server: process.env.AZURE_SQL_SERVER || 'openbrain-sql.database.windows.net',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.AZURE_SQL_USER,
      password: process.env.AZURE_SQL_PASSWORD
    }
  },
  options: {
    database: process.env.AZURE_SQL_DATABASE || 'openbrain-db',
    encrypt: true,
    trustServerCertificate: false
  }
});

conn.on('connect', (err) => {
  if (err) { console.error('Connection failed:', err.message); process.exit(1); }

  const rows = [];
  const sql = `
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'brain_default'
    ORDER BY TABLE_NAME
  `;

  const req = new Request(sql, (err) => {
    if (err) { console.error('Query failed:', err.message); process.exit(1); }
    console.log('TABLE_SCHEMA     TABLE_NAME');
    console.log('---------------  ---------------');
    rows.forEach(r => console.log(r));
    console.log(`\n${rows.length} table(s) found.`);
    conn.close();
  });

  req.on('row', (columns) => {
    rows.push(columns[0].value.padEnd(17) + columns[1].value);
  });

  conn.execSql(req);
});

conn.connect();
