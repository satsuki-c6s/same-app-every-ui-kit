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
import { mkdir, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Locator, type Page } from 'playwright';

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

/**
 * 配信されているのが本当にこの kit かを確かめる。
 * ポートを掴んだ別プロセスや、別 kit のルートで起動した vite を検出する。
 * 判定は各 kit の index.html の <title> を突き合わせるだけ (実装に手を入れない)。
 */
async function assertServingKit(url: string): Promise<void> {
  const expected = /<title>([^<]*)<\/title>/.exec(
    await readFile(path.join(kitDir, 'index.html'), 'utf8'),
  )?.[1];
  const served = /<title>([^<]*)<\/title>/.exec(await (await fetch(url)).text())?.[1];
  if (!expected || served !== expected) {
    throw new Error(
      `${port} 番が配信しているのは ${kit} ではありません (期待 "${expected}" / 実際 "${served}")。` +
        '別の preview がポートを掴んでいます。プロセスを止めてから測り直してください。',
    );
  }
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

/**
 * 開いているコンボボックスから候補を選ぶ。
 *
 * 候補が DOM に全部あるとは限らない。Ant Design は**仮想スクロール**で見えている
 * 数件しか描画しないため、`TypeScript` を直接押そうとすると見つからない (2026-08-02)。
 * そこで「見えていれば押す、無ければ絞り込んでから押す」の二段にする。
 * どの実装でも同じ操作になり、既存実装の結果も変わらない。
 */
async function pickOption(page: Page, combo: Locator, label: string): Promise<void> {
  const optionByText = () =>
    page.locator('[role="option"]').filter({ hasText: new RegExp(`^${label}$`) }).first();

  // 候補が DOM に無ければ打ち込んで絞り込む (Ant Design は仮想スクロールで数件しか描画しない)
  if ((await optionByText().count()) === 0 && (await combo.getAttribute('type')) !== null) {
    await combo.fill(label);
    await page.waitForTimeout(SETTLE_MS);
  }

  const option = optionByText();
  if ((await option.count()) > 0) {
    // Playwright の可視判定は実装によって false になる (Ant Design の option は
    // 高さを子要素が持つ)。座標を自分で出して押す — 見えている要素に確実に当たる
    const box = await option.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await option.click({ force: true });
    }
  } else {
    // role を持たない実装 (素の HTML で組んだ baseline など) はボタンとして押す
    await clickControl(page, label);
  }
  await page.waitForTimeout(SETTLE_MS);
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

  await pickOption(page, combo, 'TypeScript');
  await shoot(page, '04-filter.png');
  // 選ぶとコンボボックスは閉じるので、「すべて」に戻すには開き直す
  await combo.click();
  await page.waitForTimeout(SETTLE_MS);
  await pickOption(page, combo, 'すべて');

  await page.getByRole('button', { name: /リポジトリ$/ }).first().click();
  await shoot(page, '05-sorted.png');

  await page.getByRole('button', { name: 'vuejs/vue', exact: true }).first().click();
  await page.waitForTimeout(SETTLE_MS);
  await shoot(page, '06-dialog.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SETTLE_MS);

  await clickControl(page, '登録');
  await shoot(page, '07-tab-form.png');

  // カレンダー。開き方が実装で違う:
  //   素の実装 = <input type="date"> (盤面はブラウザ標準)
  //   shadcn/ui = id="date" のボタン
  //   MUI = 欄が分割入力なので、盤面は専用のアイコンボタンでしか開かない
  // 開くためのボタンを持つ実装 (MUI は "date"、Chakra は "Open calendar")
  const dateButton = page
    .locator('button[aria-label*="date" i], button[aria-label*="calendar" i], button[aria-label*="日付"]')
    .first();
  const datePicker =
    (await dateButton.count()) > 0 ? dateButton : page.locator('#date, input[type="date"]').first();
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

  // `npx vite` は解決先を親ディレクトリまで遡るため、別 kit の vite が別 kit の
  // ルートで起動することがある (2026-08-02 に実際に起きた: antd を測ったつもりで
  // shadcn-ui と MUI を測っていた)。vite の実体をパスで名指しして事故を止める。
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
