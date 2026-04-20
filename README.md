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

Set the Shopify Admin API tokens in `.env` for local runs:

```env
PARASOL_SHOPIFY_CLIENT_ID=
PARASOL_SHOPIFY_CLIENT_SECRET=
YARDS_SHOPIFY_CLIENT_ID=
YARDS_SHOPIFY_CLIENT_SECRET=
TSL_SHOPIFY_CLIENT_ID=
TSL_SHOPIFY_CLIENT_SECRET=
SHOPIFY_API_VERSION=2026-04
```

Do not commit `.env`. The GitHub workflow expects the same client ID and secret names as repository secrets.

## Commands

```sh
npm run generate:awin -- --store all
npm run generate:awin -- --store parasol
npm run generate:awin -- --store yards
npm run generate:awin -- --store tsl
npm run generate:pricespy -- --store tsl
npm run generate -- --feed all --store all
npm test
```

AWIN `stockquant` is intentionally binary: generated rows emit `1` for included in-stock products rather than exact Shopify inventory.

## GitHub Actions

`.github/workflows/generate-feeds.yml` regenerates feeds on schedule and commits only changed files under `public/` using `GITHUB_TOKEN`.

Required repository secrets:

- `PARASOL_SHOPIFY_CLIENT_ID`
- `PARASOL_SHOPIFY_CLIENT_SECRET`
- `YARDS_SHOPIFY_CLIENT_ID`
- `YARDS_SHOPIFY_CLIENT_SECRET`
- `TSL_SHOPIFY_CLIENT_ID`
- `TSL_SHOPIFY_CLIENT_SECRET`

Optional repository variable:

- `SHOPIFY_API_VERSION`, defaulting to `2026-04`
