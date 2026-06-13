import { expect, test } from "@playwright/test"
import { createReadStream, existsSync } from "node:fs"
import { createServer, type Server } from "node:http"
import { extname, join, normalize, resolve } from "node:path"

// Reproduces the reported bug: scanning a MyMo→Make transfer slip fills the To
// account but leaves From empty with a "Choose the source account" error.
// Runs against the built app in dist/ (build before: npm run build).

let server: Server

test.beforeAll(async () => {
  server = await startStaticServer()
})

test.afterAll(async () => {
  await new Promise<void>(done => server.close(() => done()))
})

const SLIP = resolve("temp/slip/mymo gsb/3.png") // From 0203xxxx1174 → To 14xxxx5262

async function addAccount(page: import("@playwright/test").Page, name: string, number: string) {
  await page.getByRole("link", { name: /Accounts/ }).click()
  await page.getByRole("button", { name: "Add account" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Name").fill(name)
  await dialog.getByLabel("Account last 6 digits").fill(number)
  await dialog.getByRole("button", { name: "Add account" }).click()
  await expect(dialog).toBeHidden()
}

test("scanning a transfer slip fills BOTH from and to accounts", async ({ page }) => {
  test.setTimeout(120_000) // in-browser Tesseract OCR is slow

  await page.goto("/")
  await page.getByRole("button", { name: "Skip for now" }).click()

  // Two accounts whose last digits match the slip's sender/receiver.
  await addAccount(page, "GSB OCR Test", "1174")
  await addAccount(page, "KBank OCR Test", "5262")

  // Open Quick add → scan the slip.
  await page.getByRole("link", { name: /Overview/ }).click()
  await page.getByRole("button", { name: "Quick add transaction" }).click()
  await page.getByRole("button", { name: "Scan from slip" }).click()
  await page.locator('input[type="file"]').setInputFiles(SLIP)

  // Wait for OCR to finish, then apply.
  await page.getByRole("button", { name: "Fill form" }).click({ timeout: 90_000 })

  // The bug: From stays empty with this error while To is filled.
  await expect(page.getByText("Choose the source account")).toBeHidden()
  await expect(page.getByRole("combobox", { name: "From account" })).toContainText(
    "GSB OCR Test",
  )
  await expect(page.getByRole("combobox", { name: "To account" })).toContainText(
    "KBank OCR Test",
  )
})

async function startStaticServer() {
  const root = resolve("dist")
  const contentTypes: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
  }
  const staticServer = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`)
    const candidate = normalize(join(root, decodeURIComponent(url.pathname)))
    const filePath =
      candidate.startsWith(root) && existsSync(candidate) && !candidate.endsWith("\\")
        ? candidate
        : join(root, "index.html")
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    })
    createReadStream(filePath).pipe(response)
  })
  await new Promise<void>(done => staticServer.listen(4173, "127.0.0.1", () => done()))
  return staticServer
}
