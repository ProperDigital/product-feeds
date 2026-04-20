import assert from "node:assert/strict";
import test from "node:test";

import { buildAwinCsv, csvCell } from "../scripts/lib/csv.js";
import { eligibleVariants, mergeProductsAndVariants } from "../scripts/lib/shopify.js";
import { cdata, escapeXml, buildPriceSpyXml } from "../scripts/lib/xml.js";

const store = {
  key: "tsl",
  shopDomain: "thesportinglodge.myshopify.com",
  currency: "GBP",
  deliveryCost: "3.95",
  deliveryTime: "2-3 working days",
  condition: "new",
  shippingCountry: "GB",
  shippingService: "Standard",
  shippingPrice: "3.95 GBP",
  feeds: {
    pricespy: {
      title: "PriceSpy Feed - The Sporting Lodge",
      description: "Product feed for PriceSpy from The Sporting Lodge"
    }
  }
};

test("csvCell quotes and escapes values", () => {
  assert.equal(csvCell('A "quoted" value'), '"A ""quoted"" value"');
});

test("eligibleVariants includes only active products with available variants", () => {
  const activeProduct = productFixture({
    status: "ACTIVE",
    variants: [
      { id: "2", availableForSale: false, position: 1 },
      { id: "1", availableForSale: true, position: 2 }
    ]
  });
  const draftProduct = productFixture({
    status: "DRAFT",
    variants: [{ id: "3", availableForSale: true, position: 1 }]
  });

  assert.deepEqual(eligibleVariants(activeProduct).map((variant) => variant.id), ["1"]);
  assert.deepEqual(eligibleVariants(draftProduct), []);
});

test("mergeProductsAndVariants sorts products and variants deterministically", () => {
  const merged = mergeProductsAndVariants(
    [
      productFixture({ id: "20", title: "Second" }),
      productFixture({ id: "10", title: "First" })
    ],
    [
      variantFixture({ id: "200", productId: "20", position: 2 }),
      variantFixture({ id: "100", productId: "20", position: 1 }),
      variantFixture({ id: "50", productId: "10", position: 1 })
    ]
  );

  assert.deepEqual(merged.map((product) => product.id), ["10", "20"]);
  assert.deepEqual(merged[1].variants.map((variant) => variant.id), ["100", "200"]);
});

test("AWIN CSV uses binary stockquant", () => {
  const csv = buildAwinCsv(
    [
      productFixture({
        title: 'Wax "Jacket"',
        descriptionHtml: "<p>Warm &amp; dry</p>",
        variants: [
          variantFixture({
            id: "123",
            availableForSale: true,
            inventoryQuantity: 42,
            price: "99.00",
            compareAtPrice: "120.00"
          })
        ]
      })
    ],
    store
  );

  const row = csv.split("\n")[1].split(",");
  assert.equal(row[8], '"1"');
  assert.match(csv, /"Wax ""Jacket"""/);
});

test("XML escaping and CDATA are safe", () => {
  assert.equal(escapeXml(`A&B <tag> "quote" 'apos'`), "A&amp;B &lt;tag&gt; &quot;quote&quot; &apos;apos&apos;");
  assert.equal(cdata("one ]]> two"), "<![CDATA[one ]]]]><![CDATA[> two]]>");
});

test("PriceSpy XML emits eligible variants and GTIN", () => {
  const xml = buildPriceSpyXml(
    [
      productFixture({
        title: "Boots",
        images: ["https://cdn.example/main.jpg", "https://cdn.example/second.jpg"],
        variants: [
          variantFixture({
            id: "123",
            availableForSale: true,
            price: "55",
            barcode: "000111222333"
          }),
          variantFixture({
            id: "456",
            availableForSale: false,
            price: "60"
          })
        ]
      })
    ],
    store
  );

  assert.match(xml, /<g:id><!\[CDATA\[123\]\]><\/g:id>/);
  assert.match(xml, /<g:price>55.00 GBP<\/g:price>/);
  assert.match(xml, /<g:gtin>000111222333<\/g:gtin>/);
  assert.doesNotMatch(xml, /456/);
});

function productFixture(overrides = {}) {
  return {
    id: "10",
    status: "ACTIVE",
    title: "Product",
    handle: "product",
    descriptionHtml: "<p>Description</p>",
    vendor: "Vendor",
    productType: "Category",
    images: ["https://cdn.example/image.jpg"],
    variants: [],
    ...overrides
  };
}

function variantFixture(overrides = {}) {
  return {
    id: "100",
    productId: "10",
    product: productFixture({ id: "10", variants: [] }),
    position: 1,
    availableForSale: true,
    inventoryQuantity: 1,
    inventoryPolicy: "DENY",
    price: "10.00",
    compareAtPrice: "",
    barcode: "",
    imageUrl: "",
    ...overrides
  };
}
