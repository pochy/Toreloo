import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_FILE = path.resolve(__dirname, "../data/boards.json");

export async function readData(filePath = DATA_FILE) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function writeData(data, filePath = DATA_FILE) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, payload, "utf8");
  await fs.rename(tmpPath, filePath);
  return data;
}

export async function updateData(mutator, filePath = DATA_FILE) {
  const data = await readData(filePath);
  const result = await mutator(data);
  await writeData(data, filePath);
  return result ?? data;
}
