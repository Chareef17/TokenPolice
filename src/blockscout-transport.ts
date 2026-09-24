import { chromium, type Browser, type Page } from "playwright-core";
import type { Ge6IndexerConfig } from "./config.js";

type BrowserJsonResult = { ok: boolean; status: number; statusText: string; body: string };

export class BlockscoutTransport {
  private browser?: Browser;
  private page?: Page;

  constructor(
    private readonly config: Ge6IndexerConfig,
    private readonly explorerUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getJson<T>(url: URL): Promise<T> {
    if (this.config.accessMode === "api") return this.getJsonWithNode<T>(url);
    const page = await this.ensureBrowserPage();
    const result = await page.evaluate(async rawUrl => {
      const response = await fetch(rawUrl, { credentials: "include", headers: { accept: "application/json" } });
      return { ok: response.ok, status: response.status, statusText: response.statusText, body: await response.text() };
    }, url.href) as BrowserJsonResult;
    if (!result.ok) throw new Error(`Blockscout browser ${result.status} ${result.statusText}: ${url.pathname}`);
    return JSON.parse(result.body) as T;
  }

  async close(): Promise<void> {
    this.page = undefined;
    const browser = this.browser;
    this.browser = undefined;
    if (browser) await browser.close();
  }

  private async getJsonWithNode<T>(url: URL): Promise<T> {
    const response = await this.fetchFn(url, {
      headers: { accept: "application/json", "user-agent": "TokenPolice/0.1" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Blockscout ${response.status} ${response.statusText}: ${url.pathname}`);
    return await response.json() as T;
  }

  private async ensureBrowserPage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) return this.page;
    try {
      this.browser = await chromium.launch({
        channel: this.config.browserExecutablePath ? undefined : this.config.browserChannel,
        executablePath: this.config.browserExecutablePath,
        headless: this.config.browserHeadless,
      });
    } catch (error) {
      throw new Error(
        `เปิด ${this.config.browserChannel} ไม่สำเร็จ กรุณาติดตั้ง Chrome/Edge หรือกำหนด GE6_BROWSER_EXECUTABLE_PATH: ${String(error)}`,
      );
    }
    const context = await this.browser.newContext({
      locale: "th-TH",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    });
    this.page = await context.newPage();
    const response = await this.page.goto(this.explorerUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response?.ok()) {
      await this.close();
      throw new Error(`เปิด TokenX Scan ไม่สำเร็จ: HTTP ${response?.status() ?? "unknown"}`);
    }
    return this.page;
  }
}
