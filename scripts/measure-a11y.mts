/**
 * 軸5 アクセシビリティの計測 (PREREG v2)。
 *
 *   node scripts/measure-a11y.mts <kit> <port>
 *
 * 出力は標準出力の JSON。RESULTS.md と <kit>/result.json へ転記する。
 *
 * axe の自動検査だけでは差が出ないことが v1 で分かったので、
 * **動かさないと分からない操作**を機械的に確かめる項目を足してある:
 *   - コンボボックスが ↓ と Enter で選べるか
 *   - タブが ← → で切り替わるか
 *   - ダイアログの焦点閉じ込めと Esc
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium, type Page } from 'playwright';

const VIEWPORT = { width: 1920, height: 1080 } as const;
const SETTLE_MS = 400;
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const [kit, portArg] = process.argv.slice(2);
if (!kit || !portArg) {
  console.error('使い方: node scripts/measure-a11y.mts <kit> <port>');
  process.exit(1);
}
const port = Number(portArg);

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // まだ起動していない
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`サーバが起動しませんでした: ${url}`);
}

interface AxeResult {
  count: number;
  rules: string[];
}

async function countViolations(page: Page): Promise<AxeResult> {
  const result = await new AxeBuilder({ page }).analyze();
  return { count: result.violations.length, rules: result.violations.map((v) => v.id) };
}

/** 「20 件中 N 件を表示」の行を読む。絞り込みが効いたかの判定に使う。 */
async function summaryText(page: Page): Promise<string> {
  return (await page.locator('p', { hasText: /件中.*件を表示/ }).first().textContent()) ?? '';
}

const COMBO = '[role="combobox"], .combo input';

/** Tab を押し続けて、主要操作に到達できるかを見る。 */
async function keyboardReach(page: Page): Promise<string[]> {
  const targets = ['検索欄', 'コンボボックス', 'タブ', '並べ替え', '行のリンク'];
  const reached = new Set<string>();
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return {
        type: el.getAttribute('type'),
        role: el.getAttribute('role'),
        inCombo: Boolean(el.closest('.combo')),
        text: (el.textContent ?? '').trim().slice(0, 40),
      };
    });
    if (info) {
      if (info.type === 'search') reached.add('検索欄');
      if (info.role === 'combobox' || info.inCombo) reached.add('コンボボックス');
      if (info.role === 'tab' || info.text === '一覧' || info.text === '登録') reached.add('タブ');
      if (info.text.startsWith('リポジトリ') || info.text.startsWith('スター数')) {
        reached.add('並べ替え');
      }
      if (info.text.includes('/')) reached.add('行のリンク');
    }
    if (reached.size === targets.length) break;
  }
  return targets.filter((name) => !reached.has(name));
}

/** コンボボックスを開いて ↓ と Enter だけで選べるか。手組みだとまず効かない。 */
async function comboKeyboard(page: Page): Promise<boolean> {
  const before = await summaryText(page);
  await page.locator(COMBO).first().click();
  await page.waitForTimeout(SETTLE_MS);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(SETTLE_MS);
  const after = await summaryText(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SETTLE_MS);
  return before !== after;
}

/** タブが ← → で切り替わるか (仕様どおりなら切り替わる。手組みでは大抵効かない)。 */
async function tabArrowKeys(page: Page): Promise<boolean> {
  const first = page.locator('[role="tab"], .tab').first();
  if ((await first.count()) === 0) return false;
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(SETTLE_MS);
  return page.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.textContent ?? '').trim() === '登録' : false;
  });
}

async function main(): Promise<void> {
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: path.join(repoRoot, kit),
    shell: process.platform === 'win32',
    stdio: 'ignore',
  });
  const browser = await chromium.launch({ headless: true });
  try {
    await waitForServer(`http://localhost:${port}/`);
    // axe は browser.newContext() 由来の page を要求する (newPage 直呼びは弾かれる)
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    await page.waitForSelector('table');

    const initial = await countViolations(page);
    const unreachable = await keyboardReach(page);
    const combo = await comboKeyboard(page);
    const tabArrows = await tabArrowKeys(page);

    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('table');
    await page.locator('button, [role="link"]').filter({ hasText: /^vuejs\/vue$/ }).first().click();
    await page.waitForTimeout(SETTLE_MS);
    const dialog = await countViolations(page);

    // 焦点閉じ込め: Tab を複数回押しても一度も外へ出ないこと。
    // 1回だけ見ると、押せる要素が1つしかないダイアログで activeElement が body に見えて
    // 誤判定する (2026-08-02 に baseline で実際に誤判定した)。
    let focusInsideDialog = true;
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      const outside = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return false;
        return !el.closest('dialog, [role="dialog"]');
      });
      if (outside) {
        focusInsideDialog = false;
        break;
      }
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(SETTLE_MS);
    const escClose = (await page.locator('dialog[open], [role="dialog"]').count()) === 0;

    await page
      .locator('button, [role="tab"]')
      .filter({ hasText: /^登録$/ })
      .first()
      .click();
    await page.waitForTimeout(SETTLE_MS);
    await page.locator('button').filter({ hasText: /^登録する$/ }).first().click();
    await page.waitForTimeout(SETTLE_MS);
    const formError = await countViolations(page);

    console.log(
      JSON.stringify(
        {
          kit,
          prereg: 'v2',
          axeVersion: '4.12.1',
          violations: { initial, dialog, formError },
          keyboard: unreachable.length === 0 ? 'complete' : 'partial',
          keyboardUnreachable: unreachable,
          comboArrowEnter: combo,
          tabArrowKeys: tabArrows,
          focusTrap: focusInsideDialog,
          escClose,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
