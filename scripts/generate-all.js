import "dotenv/config";

import { parseArgs } from "./lib/cli.js";
import { generateAwin } from "./generate-awin.js";
import { generatePriceSpy } from "./generate-pricespy.js";

const args = parseArgs();
const feed = args.feed || "all";
const store = args.store || "all";

try {
  if (feed === "all" || feed === "awin") {
    await generateAwin({ store });
  }

  if (feed === "all" || feed === "pricespy") {
    await generatePriceSpy({ store: store === "all" ? "tsl" : store });
  }

  if (!["all", "awin", "pricespy"].includes(feed)) {
    throw new Error(`Unknown feed "${feed}". Expected all, awin, or pricespy.`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
