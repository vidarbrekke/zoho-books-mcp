#!/usr/bin/env node
/**
 * OAuth2 setup for Zoho Books: opens browser, receives callback, exchanges code
 * for tokens, and writes OPENCLAW_SECRETS_DIR/zoho-books-mcp.json (or env) with mode 0600.
 *
 * Prereqs: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET; optional ZOHO_REGION, ZOHO_ORG_ID, OPENCLAW_SECRETS_DIR.
 * Usage: node scripts/oauth-setup.js
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { createServer } from "node:net";
import { exec } from "node:child_process";
import https from "node:https";

const REGIONS = ["US", "EU", "IN", "AU", "JP", "CA"];
const ACCOUNTS_HOST = {
  US: "accounts.zoho.com",
  EU: "accounts.zoho.eu",
  IN: "accounts.zoho.in",
  AU: "accounts.zoho.com.au",
  JP: "accounts.zoho.jp",
  CA: "accounts.zoho.ca",
};

const SCOPES = "ZohoBooks.fullaccess.all";
const SECRETS_FILENAME = "zoho-books-mcp.json";
const OAUTH_CODE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSecretsDir() {
  if (process.env.OPENCLAW_SECRETS_DIR) {
    return path.resolve(process.env.OPENCLAW_SECRETS_DIR);
  }
  const home = process.env.USERPROFILE || process.env.HOME || ".";
  return path.join(home, ".openclaw", "secrets");
}

function findFreePort(start = 8380, max = 10) {
  return new Promise((resolve, reject) => {
    let port = start;
    function tryNext() {
      if (port >= start + max) {
        reject(new Error("Could not find a free port"));
        return;
      }
      const s = createServer();
      s.once("error", () => {
        port += 1;
        tryNext();
      });
      s.once("listening", () => {
        s.close(() => resolve(port));
      });
      s.listen(port, "127.0.0.1");
    }
    tryNext();
  });
}

function openBrowser(url) {
  const plat = process.platform;
  const cmd =
    plat === "darwin"
      ? "open"
      : plat === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`, (err) => {
    if (err) console.warn("Could not open browser:", err.message);
  });
}

function exchangeCode(clientId, clientSecret, code, redirectUri, accountsHost) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  }).toString();

  return new Promise((resolve, reject) => {
    const u = new URL(`https://${accountsHost}/oauth/v2/token`);
    https
      .request(
        u,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
        (res) => {
          let data = "";
          res.on("data", (ch) => (data += ch));
          res.on("end", () => {
            try {
              const j = JSON.parse(data);
              if (j.error) reject(new Error(j.error + (j.description ? ": " + j.description : "")));
              else resolve(j);
            } catch (e) {
              reject(new Error("Invalid token response: " + data.slice(0, 200)));
            }
          });
        }
      )
      .on("error", reject)
      .end(body);
  });
}

function main() {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const region = (process.env.ZOHO_REGION || "US").toUpperCase();
  if (!REGIONS.includes(region)) {
    console.error("Invalid ZOHO_REGION. Use one of:", REGIONS.join(", "));
    process.exit(1);
  }
  if (!clientId || !clientSecret) {
    console.error("Set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET (env or .env).");
    process.exit(1);
  }

  const accountsHost = ACCOUNTS_HOST[region];
  findFreePort()
    .then((port) => {
      const redirectUri = `http://127.0.0.1:${port}/callback`;

      const authParams = new URLSearchParams({
        scope: SCOPES,
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        access_type: "offline",
        prompt: "consent",
      });
      const authUrl = `https://${accountsHost}/oauth/v2/auth?${authParams.toString()}`;

      console.log("Zoho Books OAuth2 setup");
      console.log("Opening browser for authorization...");
      console.log("If it does not open, visit:\n  " + authUrl + "\n");

      let resolved = false;
      const codePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          server.close();
          reject(new Error("OAuth timed out (no callback received). Run the script again and complete authorization in the browser."));
        }, OAUTH_CODE_TIMEOUT_MS);
        const server = http.createServer((req, res) => {
          if (resolved) return;
          const u = new URL(req.url || "", `http://127.0.0.1:${port}`);
          if (u.pathname !== "/callback") {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          const code = u.searchParams.get("code");
          const error = u.searchParams.get("error");
          resolved = true;
          clearTimeout(timeout);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          if (error) {
            const safeError = escapeHtml(error);
            res.end(
              `<html><body><h1>Authorization failed</h1><p>Error: ${safeError}</p><p>Close this tab and try again.</p></body></html>`
            );
            reject(new Error("OAuth error: " + error));
            server.close();
            return;
          }
          if (!code) {
            res.end("<html><body><h1>Missing code</h1><p>Close this tab and try again.</p></body></html>");
            reject(new Error("No code in callback"));
            server.close();
            return;
          }
          res.end(
            `<html><body><h1>Success</h1><p>You can close this window and return to the terminal.</p><script>setTimeout(function(){window.close();},2000);</script></body></html>`
          );
          resolve(code);
          server.close();
        });
        server.listen(port, "127.0.0.1", () => {
          openBrowser(authUrl);
        });
      });

      return codePromise.then((code) =>
        exchangeCode(clientId, clientSecret, code, redirectUri, accountsHost)
      );
    })
    .then((tokenData) => {
      if (!tokenData.refresh_token) {
        throw new Error("No refresh_token in response. Re-run and ensure prompt=consent.");
      }
      const secretsDir = getSecretsDir();
      fs.mkdirSync(secretsDir, { recursive: true });
      const filePath = path.join(secretsDir, SECRETS_FILENAME);

      const payload = {
        ZOHO_CLIENT_ID: clientId,
        ZOHO_CLIENT_SECRET: clientSecret,
        ZOHO_REFRESH_TOKEN: tokenData.refresh_token,
        ZOHO_REGION: region,
      };
      if (process.env.ZOHO_ORG_ID) payload.ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;
      if (process.env.ZOHO_READ_ONLY !== undefined) payload.ZOHO_READ_ONLY = process.env.ZOHO_READ_ONLY;

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
      fs.chmodSync(filePath, 0o600);

      console.log("\nTokens saved to: " + filePath);
      console.log("File permissions: 0600 (owner read/write only)");
      if (!payload.ZOHO_ORG_ID) {
        console.log("\nAdd ZOHO_ORG_ID (from Zoho Books → Settings → Organization) to the file or set it in env.");
      }
      console.log("\nRun the MCP server with OPENCLAW_SECRETS_DIR=" + secretsDir + " (or leave default) and ZOHO_ORG_ID set.");
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}

main();
