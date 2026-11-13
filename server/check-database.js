
import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "borewell-mitra.db"));

const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

for (const table of tables) {
  console.log("\n================================");
  console.log("TABLE:", table.name);

  const columns = db.prepare(
    `PRAGMA table_info("${table.name}")`
  ).all();

  console.log("COLUMNS:");
  for (const col of columns) {
    console.log(`${col.name} | ${col.type}`);
  }
}

db.close();
