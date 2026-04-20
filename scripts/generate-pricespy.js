import "dotenv/config";

import { parseArgs, requireFeed } from "./lib/cli.js";
import { getStoreConfig, getStoreKeys, resolveOutputPath } from "./lib/config.js";
import { writeUtf8File } from "./lib/fs.js";
import { fetchCatalog } from "./lib/shopify.js";
import { buildPriceSpyXml } from "./lib/xml.js";

export async function generatePriceSpy({ store: requestedStore = "tsl" } = {}) {
  const storeKeys = getStoreKeys(requestedStore, "pricespy");

  for (const storeKey of storeKeys) {
    const store = getStoreConfig(storeKey);
    requireFeed(store, "pricespy");

    console.log(`Generating PriceSpy feed for ${store.key}`);
    const products = await fetchCatalog(store, {
      productPageSize: store.priceSpyProductPageSize,
      imageLimit: store.priceSpyImageLimit
    });
    const xml = buildPriceSpyXml(products, store);
    const outputPath = resolveOutputPath(store.feeds.pricespy.outputPath);
    writeUtf8File(outputPath, xml);
    console.log(`Wrote ${store.feeds.pricespy.outputPath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  generatePriceSpy({ store: args.store || "tsl" }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
