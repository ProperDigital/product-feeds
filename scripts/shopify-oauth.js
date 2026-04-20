import "dotenv/config";

import crypto from "node:crypto";
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { parseArgs } from "./lib/cli.js";
import { getStoreConfig } from "./lib/config.js";

const execFileAsync = promisify(execFile);
const OAUTH_SCOPE = "read_products";
const DEFAULT_PORT = 8787;
const GITHUB_REPO = "ProperDigital/product-feeds";

const args = parseArgs();
const storeKey = args.store;
const port = Number(args.port || DEFAULT_PORT);

if (!storeKey) {
  console.error("Usage: npm run shopify:oauth -- --store parasol");
  process.exit(1);
}

const store = getStoreConfig(storeKey);
const clientId = process.env[store.clientIdEnv];
const clientSecret = process.env[store.clientSecretEnv];

if (!clientId || !clientSecret) {
  console.error(`Missing ${store.clientIdEnv} and/or ${store.clientSecretEnv}. Add them to .env first.`);
  process.exit(1);
}

const state = crypto.randomUUID();
const redirectUri = `http://localhost:${port}/callback`;
const installUrl = buildInstallUrl({
  shopDomain: store.shopDomain,
  clientId,
  redirectUri,
  state
});

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, redirectUri);

    if (requestUrl.pathname !== "/callback") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    if (requestUrl.searchParams.get("state") !== state) {
      response.writeHead(400);
      response.end("Invalid OAuth state");
      return;
    }

    if (!verifyOAuthHmac(requestUrl.searchParams, clientSecret)) {
      response.writeHead(400);
      response.end("Invalid OAuth HMAC");
      return;
    }

    const code = requestUrl.searchParams.get("code");
    const shopDomain = requestUrl.searchParams.get("shop");

    if (!code || !shopDomain) {
      response.writeHead(400);
      response.end("Missing OAuth code or shop");
      return;
    }

    const token = await exchangeOfflineToken({
      shopDomain,
      clientId,
      clientSecret,
      code
    });

    await setGithubSecret(store.offlineTokenEnv, token.access_token);

    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Installed ${store.key}. Offline token saved to GitHub secret ${store.offlineTokenEnv}. You can close this tab.`);
    console.log(`Saved ${store.offlineTokenEnv} to GitHub repository secrets.`);
    console.log(`Granted scopes: ${token.scope}`);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Unknown OAuth error");
    console.error(error instanceof Error ? error.message : error);
  } finally {
    server.close();
  }
});

server.listen(port, () => {
  console.log(`Listening for Shopify OAuth callback on ${redirectUri}`);
  console.log("Open this URL, approve the app, then return here:");
  console.log(installUrl);
});

function buildInstallUrl({ shopDomain, clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: OAUTH_SCOPE,
    redirect_uri: redirectUri,
    state
  });

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

async function exchangeOfflineToken({ shopDomain, clientId, clientSecret, code }) {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });

  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`Shopify token exchange failed with HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(`Shopify token exchange failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function verifyOAuthHmac(searchParams, clientSecret) {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const message = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto.createHmac("sha256", clientSecret).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(hmac, "utf8"));
}

async function setGithubSecret(name, value) {
  try {
    await execFileAsync("gh", ["secret", "set", name, "--repo", GITHUB_REPO, "--body", value], {
      env: process.env
    });
  } catch (error) {
    throw new Error(`Could not save ${name} with gh. Confirm gh is authenticated, then rerun. ${error.stderr || error.message}`);
  }
}
