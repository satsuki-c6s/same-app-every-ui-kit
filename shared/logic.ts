/**
 * 共通デモのロジック。**全実装がこれを import する。**
 *
 * 絞り込み・並べ替え・入力検証をここに置く理由: 各実装が書くのを UI だけに限定するため。
 * ロジックまで各自に書かせると、実装行数の差に「書き方の癖」が混ざって
 * UI ライブラリの差が見えなくなる。
 *
 * React にも Vue にも依存しない純関数だけを置く。副作用を持ち込まない。
 */

export interface Repo {
  fullName: string;
  description: string;
  language: string;
  stars: number;
}

export interface RepoData {
  capturedAt: string;
  note: string;
  items: Repo[];
}

export type SortKey = 'fullName' | 'language' | 'stars';
export type SortDir = 'asc' | 'desc';

/** 言語フィルタの「すべて」を表す値。実データの言語名と衝突しない文字列にする。 */
export const ALL_LANGUAGES = '*';

export interface FormValues {
  fullName: string;
  language: string;
  url: string;
  /** 登録日。HTML の date 入力に合わせ YYYY-MM-DD。未選択は空文字。 */
  date: string;
}

export type FormErrors = Partial<Record<keyof FormValues, string>>;

export interface ValidationMessages {
  required: string;
  format: string;
  url: string;
  date: string;
}

/** owner/repo の形。GitHub が許す文字に合わせる。 */
const FULL_NAME_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/** 出現する言語を重複なしで返す (表示順を固定するため名前順)。 */
export function languagesOf(items: Repo[]): string[] {
  return [...new Set(items.map((item) => item.language))].sort((a, b) => a.localeCompare(b));
}

/** 検索語と言語で絞り込む。検索語は名前と説明の両方に大文字小文字を無視して当てる。 */
export function filterRepos(items: Repo[], query: string, language: string): Repo[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (language !== ALL_LANGUAGES && item.language !== language) return false;
    if (needle === '') return true;
    return (
      item.fullName.toLowerCase().includes(needle) ||
      item.description.toLowerCase().includes(needle)
    );
  });
}

/** 並べ替える。**元の配列は変更しない** (新しい配列を返す)。 */
export function sortRepos(items: Repo[], key: SortKey, dir: SortDir): Repo[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (key === 'stars') return (a.stars - b.stars) * sign;
    return a[key].localeCompare(b[key]) * sign;
  });
}

/** 同じ列を押したら向きを反転、違う列なら降順から始める。 */
export function nextSort(
  current: { key: SortKey; dir: SortDir },
  key: SortKey,
): { key: SortKey; dir: SortDir } {
  if (current.key !== key) return { key, dir: 'desc' };
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

/** 入力検証。文言は copy.json から渡す (実装ごとに文言を変えないため)。 */
export function validateForm(values: FormValues, messages: ValidationMessages): FormErrors {
  const errors: FormErrors = {};

  if (values.fullName.trim() === '') errors.fullName = messages.required;
  else if (!FULL_NAME_PATTERN.test(values.fullName.trim())) errors.fullName = messages.format;

  if (values.language.trim() === '') errors.language = messages.required;

  if (values.url.trim() === '') errors.url = messages.required;
  else if (!isHttpUrl(values.url.trim())) errors.url = messages.url;

  if (values.date.trim() === '') errors.date = messages.date;

  return errors;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** "{total} 件中 {shown} 件を表示" のような雛形を埋める。 */
export function formatSummary(template: string, total: number, shown: number): string {
  return template.replace('{total}', String(total)).replace('{shown}', String(shown));
}

/** スター数の表示。全実装で同じ見せ方にする (桁区切りの有無で印象が変わるため)。 */
export function formatStars(stars: number): string {
  return stars.toLocaleString('en-US');
}
