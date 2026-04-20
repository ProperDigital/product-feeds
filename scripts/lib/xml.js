import { eligibleVariants } from "./shopify.js";
import { stripHtml } from "./text.js";

export function buildPriceSpyXml(products, store) {
  const feedConfig = store.feeds.pricespy;
  const items = [];

  for (const product of products) {
    const productUrl = `https://${store.shopDomain}/products/${product.handle}`;
    const plainDescription = stripHtml(product.descriptionHtml);
    const mainImage = product.images[0] || "";
    const additionalImages = product.images.slice(1);

    for (const variant of eligibleVariants(product)) {
      const variantUrl = `${productUrl}?variant=${variant.id}`;
      let itemXml = `    <item>
      <g:id>${cdata(variant.id)}</g:id>
      <g:title>${cdata(product.title)}</g:title>
      <g:price>${formatPrice(variant.price, store.currency)}</g:price>
      <g:link>${escapeXml(variantUrl)}</g:link>
      <g:availability>in stock</g:availability>
      <g:condition>${escapeXml(store.condition)}</g:condition>`;

      if (plainDescription) {
        itemXml += `\n      <g:description>${cdata(plainDescription)}</g:description>`;
      }

      if (mainImage || variant.imageUrl) {
        itemXml += `\n      <g:image_link>${escapeXml(mainImage || variant.imageUrl)}</g:image_link>`;
      }

      for (const imageUrl of additionalImages) {
        itemXml += `\n      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>`;
      }

      if (product.vendor) {
        itemXml += `\n      <g:brand>${cdata(product.vendor)}</g:brand>`;
      }

      if (product.productType) {
        itemXml += `\n      <g:product_type>${cdata(product.productType)}</g:product_type>`;
      }

      if (variant.barcode) {
        itemXml += `\n      <g:gtin>${escapeXml(variant.barcode)}</g:gtin>`;
      }

      itemXml += `\n      <pj:affiliate_link>${escapeXml(variantUrl)}</pj:affiliate_link>`;
      itemXml += `\n      <g:shipping>
        <g:country>${escapeXml(store.shippingCountry)}</g:country>
        <g:service>${escapeXml(store.shippingService)}</g:service>
        <g:price>${escapeXml(store.shippingPrice)}</g:price>
      </g:shipping>`;
      itemXml += "\n    </item>";
      items.push(itemXml);
    }
  }

  return `<?xml version='1.0' encoding='UTF-8'?>
<rss xmlns:pj="https://schema.prisjakt.nu/ns/1.0" xmlns:g="http://base.google.com/ns/1.0" version="3.0">
  <channel>
    <title>${escapeXml(feedConfig.title)}</title>
    <description>${escapeXml(feedConfig.description)}</description>
    <link>https://${escapeXml(store.shopDomain)}</link>
${items.join("\n")}
  </channel>
</rss>`;
}

export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function cdata(value) {
  return `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export function formatPrice(value, currency) {
  const amount = Number.parseFloat(value);
  const normalized = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  return `${normalized} ${currency}`;
}
