import "dotenv/config";

import { parseArgs, requireFeed } from "./lib/cli.js";
import { getStoreConfig, getStoreKeys, resolveOutputPath } from "./lib/config.js";
import { buildAwinCsv } from "./lib/csv.js";
import { writeUtf8File } from "./lib/fs.js";
import { fetchCatalog } from "./lib/shopify.js";

export async function generateAwin({ store: requestedStore = "all" } = {}) {
  const storeKeys = getStoreKeys(requestedStore, "awin");

  for (const storeKey of storeKeys) {
    const store = getStoreConfig(storeKey);
    requireFeed(store, "awin");

    console.log(`Generating AWIN feed for ${store.key}`);
    const products = await fetchCatalog(store, {
      productPageSize: store.productPageSize,
      imageLimit: store.awinImageLimit
    });
    const csv = buildAwinCsv(products, store);
    const outputPath = resolveOutputPath(store.feeds.awin.outputPath);
    writeUtf8File(outputPath, csv);
    console.log(`Wrote ${store.feeds.awin.outputPath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  generateAwin({ store: args.store || "all" }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
