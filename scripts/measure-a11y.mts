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
import { readFile } from 'node:fs/promises';
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
  // 焦点が2枚目のタブへ移ったかで判定する。
  // 完全一致ではなく includes にするのは、読み上げ用の文字を混ぜる実装があるため
  // (Ant Design は "Tab 2 of 2登録" のように出す)。ここを厳しくすると
  // 「動いているのに動いていない」と誤判定する (2026-08-02)。
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return false;
    const isTab = el.getAttribute('role') === 'tab' || Boolean(el.closest('[role="tab"]'));
    return isTab && (el.textContent ?? '').includes('登録');
  });
}

/**
 * 配信されているのが本当にこの kit かを確かめる (capture.mts と同じ検査)。
 * 2026-08-02 に `npx vite` が別 kit の vite を別 kit のルートで起動し、
 * antd を測ったつもりで shadcn-ui と MUI を測る事故が起きたため入れている。
 */
async function assertServingKit(url: string): Promise<void> {
  const expected = /<title>([^<]*)<\/title>/.exec(
    await readFile(path.join(repoRoot, kit, 'index.html'), 'utf8'),
  )?.[1];
  const served = /<title>([^<]*)<\/title>/.exec(await (await fetch(url)).text())?.[1];
  if (!expected || served !== expected) {
    throw new Error(
      `${port} 番が配信しているのは ${kit} ではありません (期待 "${expected}" / 実際 "${served}")。` +
        '別の preview がポートを掴んでいます。プロセスを止めてから測り直してください。',
    );
  }
}

async function main(): Promise<void> {
  const kitDir = path.join(repoRoot, kit);
  // vite の実体をパスで名指しする (npx は解決先を親まで遡り、別 kit を起動しうる)
  const server = spawn(
    process.execPath,
    [
      path.join(kitDir, 'node_modules', 'vite', 'bin', 'vite.js'),
      'preview',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: kitDir, stdio: 'ignore' },
  );
  const browser = await chromium.launch({ headless: true });
  try {
    await waitForServer(`http://localhost:${port}/`);
    await assertServingKit(`http://localhost:${port}/`);
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
    // さらに、焦点ガードの span を経由して非同期に閉じ込め直す実装がある
    // (Base UI 1.7.0 で実際に誤判定した 2026-08-04)。押した直後ではなく
    // 少し待ってから見る。閉じ込めが本当に壊れている場合は待っても外に居続けるので、
    // この待ちで「壊れているのに通る」ことはない。
    let focusInsideDialog = true;
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(150);
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
    // 「閉じた」の判定は要素の有無ではなく**見えているか**で見る。
    // DOM から消す実装と、残したまま display:none にする実装 (Ant Design) があり、
    // 存在数だけで見ると後者を「閉じない」と誤判定する (2026-08-02)。
    const escClose = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"]')];
      return dialogs.every((d) => {
        const s = getComputedStyle(d);
        return s.display === 'none' || s.visibility === 'hidden' || !(d as HTMLElement).offsetParent;
      });
    });

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
