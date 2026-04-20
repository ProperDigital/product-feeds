# Product Feeds

Consolidated static product feed generators for:

- Parasol AWIN CSV
- Yards AWIN CSV
- The Sporting Lodge AWIN CSV
- The Sporting Lodge PriceSpy XML

The generators use the Shopify Admin GraphQL API and write deterministic feed files into `public/`.

## Feed Outputs

```text
public/parasol/awin-feed.csv
public/yards/awin-feed.csv
public/tsl/awin-feed.csv
public/tsl/pricespy.xml
```

## Setup

```sh
npm ci
cp .env.example .env
```

Set Shopify app credentials and offline tokens in `.env` for local runs:

```env
PARASOL_SHOPIFY_CLIENT_ID=
PARASOL_SHOPIFY_CLIENT_SECRET=
PARASOL_SHOPIFY_OFFLINE_ACCESS_TOKEN=
YARDS_SHOPIFY_CLIENT_ID=
YARDS_SHOPIFY_CLIENT_SECRET=
YARDS_SHOPIFY_OFFLINE_ACCESS_TOKEN=
TSL_SHOPIFY_CLIENT_ID=
TSL_SHOPIFY_CLIENT_SECRET=
TSL_SHOPIFY_OFFLINE_ACCESS_TOKEN=
SHOPIFY_API_VERSION=2026-04
```

Do not commit `.env`. The workflow uses offline access token repository secrets. Client IDs and secrets are only needed locally for the one-time OAuth install helper.

## One-Time Shopify OAuth Setup

For each Dev Dashboard app, add this redirect URL in Shopify before running the helper:

```text
http://localhost:8787/callback
```

Then put that store's client ID and secret in local `.env` and run:

```sh
npm run shopify:oauth -- --store parasol
npm run shopify:oauth -- --store yards
npm run shopify:oauth -- --store tsl
```

Each command prints an install URL. Open it, approve the app in the matching Shopify store, and the helper will save the fresh offline token directly to this GitHub repository's Actions secrets using `gh`.

## Commands

```sh
npm run generate:awin -- --store all
npm run generate:awin -- --store parasol
npm run generate:awin -- --store yards
npm run generate:awin -- --store tsl
npm run generate:pricespy -- --store tsl
npm run generate -- --feed all --store all
npm run shopify:oauth -- --store parasol
npm test
```

AWIN `stockquant` is intentionally binary: generated rows emit `1` for included in-stock products rather than exact Shopify inventory.

## GitHub Actions

`.github/workflows/generate-feeds.yml` regenerates feeds on schedule and commits only changed files under `public/` using `GITHUB_TOKEN`.

Required repository secrets:

- `PARASOL_SHOPIFY_OFFLINE_ACCESS_TOKEN`
- `YARDS_SHOPIFY_OFFLINE_ACCESS_TOKEN`
- `TSL_SHOPIFY_OFFLINE_ACCESS_TOKEN`

Optional repository variable:

- `SHOPIFY_API_VERSION`, defaulting to `2026-04`
