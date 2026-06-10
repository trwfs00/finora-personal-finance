import { expect, test } from "@playwright/test";
import { createReadStream, existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

let server: Server;

test.beforeAll(async () => {
  server = await startStaticServer();
});

test.afterAll(async () => {
  await new Promise<void>((resolveClose) => {
    server.close(() => resolveClose());
  });
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("first launch is empty and demo data is explicit", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Financial health" })).toBeVisible();
  await expect(page.getByText("Start with a clean local workspace")).toBeVisible();
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page.getByText("Demo data is loaded")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cash flow" })).toBeVisible();
});

test("can add a transaction and use mobile navigation", async ({ page }) => {
  await page.getByRole("button", { name: "Quick add transaction" }).click();
  await page.getByLabel("Amount").fill("450");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Food" }).click();
  await page.getByRole("combobox", { name: "Account" }).click();
  await page.getByRole("option", { name: "Cash" }).click();
  await page.getByLabel("Note").fill("Manual lunch");
  await page.getByRole("button", { name: "Add transaction" }).click();
  await expect(page.getByText("Manual lunch")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: /Accounts/ }).click();
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
});

async function startStaticServer() {
  const root = resolve("dist");
  const contentTypes: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };

  const staticServer = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const candidate = normalize(join(root, decodeURIComponent(url.pathname)));
    const filePath =
      candidate.startsWith(root) && existsSync(candidate) && !candidate.endsWith("\\")
        ? candidate
        : join(root, "index.html");

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });

  await new Promise<void>((resolveListen) => {
    staticServer.listen(4173, "127.0.0.1", () => resolveListen());
  });

  return staticServer;
}
