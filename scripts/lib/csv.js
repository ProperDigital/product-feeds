import { eligibleVariants } from "./shopify.js";
import { stripHtml } from "./text.js";

export const awinHeaders = [
  "pid",
  "name",
  "desc",
  "purl",
  "imgurl",
  "actualp",
  "rrpp",
  "brand",
  "stockquant",
  "category",
  "currency",
  "delcost",
  "deltime",
  "condition"
];

export function buildAwinCsv(products, store) {
  const rows = products.flatMap((product) => {
    const variants = eligibleVariants(product);
    if (variants.length === 0) return [];

    const variant = variants[0];
    const productUrl = `https://${store.shopDomain}/products/${product.handle}`;
    const imageUrl = product.images[0] || variant.imageUrl || "";

    return [
      [
        variant.id,
        product.title,
        stripHtml(product.descriptionHtml),
        productUrl,
        imageUrl,
        variant.price,
        variant.compareAtPrice,
        product.vendor,
        "1",
        product.productType || "General",
        store.currency,
        store.deliveryCost,
        store.deliveryTime,
        store.condition
      ].map(csvCell).join(",")
    ];
  });

  return [awinHeaders.join(","), ...rows].join("\n");
}

export function csvCell(value) {
  return `"${String(value ?? "").trim().replace(/"/g, "\"\"")}"`;
}
