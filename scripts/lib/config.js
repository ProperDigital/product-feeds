import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const configPath = path.join(repoRoot, "config", "stores.json");

export const rootDir = repoRoot;

export function loadConfig() {
  const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const defaults = rawConfig.defaults || {};
  const stores = {};

  for (const [key, store] of Object.entries(rawConfig.stores || {})) {
    stores[key] = {
      key,
      ...defaults,
      ...store,
      feeds: store.feeds || {}
    };
  }

  return { defaults, stores };
}

export function getStoreConfig(storeKey) {
  const { stores } = loadConfig();
  const store = stores[storeKey];

  if (!store) {
    throw new Error(`Unknown store "${storeKey}". Available stores: ${Object.keys(stores).join(", ")}`);
  }

  return store;
}

export function getStoreKeys(requestedStore, feedName) {
  const { stores } = loadConfig();
  const keys = requestedStore === "all" ? Object.keys(stores) : [requestedStore];

  return keys.filter((key) => {
    if (!stores[key]) {
      throw new Error(`Unknown store "${key}". Available stores: ${Object.keys(stores).join(", ")}`);
    }

    return Boolean(stores[key].feeds?.[feedName]);
  });
}

export function resolveOutputPath(outputPath) {
  return path.resolve(rootDir, outputPath);
}
