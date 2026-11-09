import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(here, "../data/db.json");

export function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

export function writeDb(data) {
  const tempPath = dbPath + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, dbPath);
}

export function updateDb(mutator) {
  const db = readDb();
  const result = mutator(db);
  writeDb(db);
  return result;
}
