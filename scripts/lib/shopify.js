import { compareNumericStrings } from "./text.js";

const PRODUCTS_QUERY = `
  query FeedProducts($first: Int!, $after: String, $imageFirst: Int!) {
    products(first: $first, after: $after, sortKey: ID) {
      nodes {
        legacyResourceId
        status
        title
        handle
        descriptionHtml
        vendor
        productType
        images(first: $imageFirst) {
          nodes {
            url
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const VARIANTS_QUERY = `
  query FeedVariants($first: Int!, $after: String) {
    productVariants(first: $first, after: $after, sortKey: ID) {
      nodes {
        legacyResourceId
        position
        availableForSale
        inventoryQuantity
        inventoryPolicy
        price
        compareAtPrice
        barcode
        image {
          url
        }
        product {
          legacyResourceId
          status
          title
          handle
          descriptionHtml
          vendor
          productType
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getShopifyCredentials(store) {
  const token = getShopifyAccessToken(store);
  const apiVersion =
    process.env[`${store.key.toUpperCase()}_SHOPIFY_API_VERSION`] ||
    process.env.SHOPIFY_API_VERSION ||
    store.apiVersion;

  return { token, apiVersion };
}

export async function fetchCatalog(store, options = {}) {
  const { token, apiVersion } = await getShopifyCredentials(store);
  const client = createGraphqlClient(store.shopDomain, token, apiVersion);
  const products = await fetchProducts(client, store, options);
  const variants = await fetchVariants(client, store);

  return mergeProductsAndVariants(products, variants);
}

function getShopifyAccessToken(store) {
  const token = process.env[store.offlineTokenEnv];

  if (!token) {
    throw new Error(`Missing Shopify offline access token for ${store.key}. Set ${store.offlineTokenEnv}.`);
  }

  return token;
}

export function mergeProductsAndVariants(products, variants) {
  const productMap = new Map();

  for (const product of products) {
    productMap.set(product.id, {
      ...product,
      variants: []
    });
  }

  for (const variant of variants) {
    const product = productMap.get(variant.productId) || {
      ...variant.product,
      images: [],
      variants: []
    };

    product.variants.push(variant);
    productMap.set(product.id, product);
  }

  return [...productMap.values()]
    .map((product) => ({
      ...product,
      variants: product.variants.sort(compareVariants)
    }))
    .sort((left, right) => compareNumericStrings(left.id, right.id));
}

export function eligibleVariants(product) {
  if (String(product.status).toUpperCase() !== "ACTIVE") return [];
  return product.variants.filter((variant) => variant.availableForSale === true);
}

async function fetchProducts(client, store, options) {
  const products = [];
  let after = null;
  const productPageSize = options.productPageSize || store.productPageSize;
  const imageLimit = options.imageLimit || store.awinImageLimit || 1;

  do {
    const data = await client(PRODUCTS_QUERY, {
      first: productPageSize,
      after,
      imageFirst: imageLimit
    });
    const connection = data.products;

    for (const node of connection.nodes) {
      products.push(normalizeProduct(node));
    }

    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    console.log(`Fetched ${products.length} products for ${store.key}`);
  } while (after);

  return products;
}

async function fetchVariants(client, store) {
  const variants = [];
  let after = null;

  do {
    const data = await client(VARIANTS_QUERY, {
      first: store.variantPageSize,
      after
    });
    const connection = data.productVariants;

    for (const node of connection.nodes) {
      variants.push(normalizeVariant(node));
    }

    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    console.log(`Fetched ${variants.length} variants for ${store.key}`);
  } while (after);

  return variants;
}

function createGraphqlClient(shopDomain, token, apiVersion) {
  const endpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

  return async function graphqlRequest(query, variables) {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token
        },
        body: JSON.stringify({ query, variables })
      });

      if (response.status === 429 || response.status >= 500) {
        await sleep(attempt * 1500);
        continue;
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(`Shopify GraphQL request failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
      }

      if (payload.errors?.length) {
        const message = payload.errors.map((error) => error.message).join("; ");
        if (/throttled/i.test(message) && attempt < 5) {
          await sleep(attempt * 1500);
          continue;
        }
        throw new Error(`Shopify GraphQL errors: ${message}`);
      }

      await waitForThrottle(payload.extensions?.cost?.throttleStatus);
      return payload.data;
    }

    throw new Error("Shopify GraphQL request failed after retries");
  };
}

function normalizeProduct(node) {
  return {
    id: String(node.legacyResourceId ?? ""),
    status: node.status,
    title: node.title ?? "",
    handle: node.handle ?? "",
    descriptionHtml: node.descriptionHtml ?? "",
    vendor: node.vendor ?? "",
    productType: node.productType ?? "",
    images: (node.images?.nodes || []).map((image) => image.url).filter(Boolean)
  };
}

function normalizeVariant(node) {
  const product = normalizeProduct({
    ...node.product,
    images: { nodes: [] }
  });

  return {
    id: String(node.legacyResourceId ?? ""),
    productId: product.id,
    product,
    position: Number(node.position ?? 0),
    availableForSale: node.availableForSale,
    inventoryQuantity: node.inventoryQuantity ?? 0,
    inventoryPolicy: node.inventoryPolicy ?? "",
    price: node.price ?? "",
    compareAtPrice: node.compareAtPrice ?? "",
    barcode: node.barcode ?? "",
    imageUrl: node.image?.url ?? ""
  };
}

function compareVariants(left, right) {
  if (left.position !== right.position) return left.position - right.position;
  return compareNumericStrings(left.id, right.id);
}

async function waitForThrottle(throttleStatus) {
  if (!throttleStatus) return;

  const available = Number(throttleStatus.currentlyAvailable ?? 1000);
  const restoreRate = Number(throttleStatus.restoreRate ?? 50);
  if (available >= 150) return;

  const waitMs = Math.ceil(((250 - available) / restoreRate) * 1000);
  await sleep(Math.max(waitMs, 1000));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
