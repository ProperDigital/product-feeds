import fs from "node:fs";
import path from "node:path";

export function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeUtf8File(filePath, content) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, Buffer.from(content, "utf8"));
}
