/**
 * 共通デモのキャプチャ。**全実装を同じ順・同じ条件で操作する。**
 *
 *   node scripts/capture.mts <kit> <port>
 *   例: node scripts/capture.mts baseline 4401
 *
 * 出力: <kit>/shots/01-initial.png … 07-dark.png
 * 手撮りはしない。条件が揺れると「同じ場面を比べた」と言えなくなるため。
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const VIEWPORT = { width: 1920, height: 1080 } as const;
const SETTLE_MS = 400;

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const [kit, portArg] = process.argv.slice(2);
if (!kit || !portArg) {
  console.error('使い方: node scripts/capture.mts <kit> <port>');
  process.exit(1);
}
const port = Number(portArg);

const kitDir = path.join(repoRoot, kit);
const shotsDir = path.join(kitDir, 'shots');

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // まだ起動していない
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`サーバが起動しませんでした: ${url}`);
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: path.join(shotsDir, name) });
  console.log(`撮影 ${kit}/shots/${name}`);
}

/**
 * ラベルで操作要素を押す。
 * 実装ごとに役割が違う (素の実装は button、Radix の ToggleGroup は role="radio") ため、
 * 役割を決め打ちにせずラベル一致で引く。CSS クラスにも依存しない。
 */
async function clickControl(page: Page, label: string): Promise<void> {
  await page
    .locator('button, [role="radio"], [role="checkbox"], [role="tab"], [role="option"]')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first()
    .click();
}

/** 実装ごとに DOM 構造が違うので、テキストと役割で引く (CSS クラスに依存しない)。 */
async function run(page: Page): Promise<void> {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForSelector('table');
  await shoot(page, '01-initial.png');

  const search = page.locator('input[type="search"]').first();
  await search.fill('vue');
  await shoot(page, '02-search.png');
  await search.fill('');

  // コンボボックス。役割で持つ実装 (Radix) と素の input で組む実装の両方に当てる
  const combo = page.locator('[role="combobox"], .combo input').first();
  await combo.click();
  await shoot(page, '03-combobox.png');

  await clickControl(page, 'TypeScript');
  await shoot(page, '04-filter.png');
  // 選ぶとコンボボックスは閉じるので、「すべて」に戻すには開き直す
  await combo.click();
  await page.waitForTimeout(SETTLE_MS);
  await clickControl(page, 'すべて');

  await page.getByRole('button', { name: /リポジトリ$/ }).first().click();
  await shoot(page, '05-sorted.png');

  await page.getByRole('button', { name: 'vuejs/vue', exact: true }).first().click();
  await page.waitForTimeout(SETTLE_MS);
  await shoot(page, '06-dialog.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SETTLE_MS);

  await clickControl(page, '登録');
  await shoot(page, '07-tab-form.png');

  // カレンダー。素の実装は <input type="date"> なので盤面はブラウザ標準
  const datePicker = page.locator('#date, input[type="date"]').first();
  await datePicker.click();
  await shoot(page, '08-calendar.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SETTLE_MS);

  await page.getByRole('button', { name: '登録する', exact: true }).first().click();
  await shoot(page, '09-form-error.png');

  const themeButton = page.getByRole('button', { name: /ダークモードに切り替え/ }).first();
  if ((await themeButton.count()) > 0) {
    await themeButton.click();
    await page.waitForTimeout(SETTLE_MS);
    await shoot(page, '10-dark.png');
  }
}

async function main(): Promise<void> {
  await mkdir(shotsDir, { recursive: true });
  for (const file of await readdir(shotsDir)) {
    if (file.endsWith('.png')) await unlink(path.join(shotsDir, file));
  }

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(port), '--strictPort'],
    { cwd: kitDir, shell: process.platform === 'win32', stdio: 'ignore' },
  );

  const browser = await chromium.launch({ headless: true });
  try {
    await waitForServer(`http://localhost:${port}/`);
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await run(page);
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
