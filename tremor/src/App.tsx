import { useMemo, useState } from 'react';
import { Button } from './components/Button/Button';
import { DatePicker } from './components/DatePicker/DatePicker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/Dialog/Dialog';
import { Input } from './components/Input/Input';
import { Label } from './components/Label/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/Select/Select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from './components/Table/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/Tabs/Tabs';
import { Toaster } from './components/Toast/Toaster';
import { useToast } from './hooks/useToast';
import copy from '../../shared/copy.json';
import rawData from '../../shared/data.json';
import {
  ALL_LANGUAGES,
  filterRepos,
  formatStars,
  formatSummary,
  languagesOf,
  nextSort,
  sortRepos,
  validateForm,
  type FormErrors,
  type FormValues,
  type Repo,
  type RepoData,
  type SortDir,
  type SortKey,
} from '../../shared/logic';

const data = rawData as RepoData;

const EMPTY_FORM: FormValues = { fullName: '', language: '', url: '', date: '' };

/** トーストは capture の撮影が終わるまで消えないよう長めに保持する (radix 回と同じ値)。 */
const TOAST_DURATION_MS = 100000;

/** DatePicker (Date) と共有ロジック (YYYY-MM-DD 文字列) の変換。タイムゾーンずれを避けて手組みする。 */
const toDateString = (d: Date | undefined): string =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const fromDateString = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, day] = s.split('-').map(Number);
  return y && m && day ? new Date(y, m - 1, day) : undefined;
};

/**
 * Tremor 版。ロジックは shared/logic.ts と共有する。
 *
 * Tremor はダッシュボード特化の**コピーして取り込む方式** (shadcn と同じ)。
 * 本体リポジトリ (Apache-2.0) から部品ソース 18 ファイル (12部品 + hooks/utils/globals.css) を取り込んだ。
 * 入力しながら絞り込む Combobox は無いので Select で代用 (radix 回と同じ扱い)。
 * ダークモードの公式切替機構は無い (dark: クラスは全部品に定義済み) ため、
 * PREREG に従い切替ボタンは付けない。
 */
export function App() {
  const { toast } = useToast();
  const [tab, setTab] = useState('list');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const languages = useMemo(() => [copy.filter.all, ...languagesOf(data.items)], []);
  const shown = useMemo(
    () => sortRepos(filterRepos(data.items, query, language), sort.key, sort.dir),
    [query, language, sort],
  );
  const languageValue = language === ALL_LANGUAGES ? copy.filter.all : language;

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const found = validateForm(form, {
      required: copy.form.errorRequired,
      format: copy.form.errorFormat,
      url: copy.form.errorUrl,
      date: copy.form.errorDate,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast({ description: copy.toast.error, variant: 'error', duration: TOAST_DURATION_MS });
      return;
    }
    toast({ description: copy.toast.success, variant: 'success', duration: TOAST_DURATION_MS });
    setForm(EMPTY_FORM);
  };

  const sortLabel = (key: SortKey, label: string) => (
    <button
      type="button"
      className="font-semibold"
      onClick={() => setSort((c) => nextSort(c, key))}
    >
      {label}
    </button>
  );

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    error?: string,
    extra?: { placeholder?: string; id?: string },
  ) => {
    const id = extra?.id ?? `f-${label}`;
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          placeholder={extra?.placeholder}
          value={value}
          hasError={Boolean(error)}
          aria-invalid={error ? 'true' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="min-h-[18px] text-xs text-red-600 dark:text-red-500">{error ?? ' '}</span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 text-gray-900 dark:text-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{copy.app.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{copy.app.subtitle}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="list">{copy.tabs.list}</TabsTrigger>
          <TabsTrigger value="register">{copy.tabs.register}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="pt-6">
          <div className="flex max-w-2xl flex-wrap items-end gap-4">
            <div className="min-w-72 flex-1">
              <Label htmlFor="search">{copy.search.label}</Label>
              <Input
                id="search"
                type="search"
                className="mt-1"
                placeholder={copy.search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="lang">{copy.filter.label}</Label>
              <Select
                value={languageValue}
                onValueChange={(v) => setLanguage(v === copy.filter.all ? ALL_LANGUAGES : v)}
              >
                <SelectTrigger id="lang" className="mt-1 w-60">
                  <SelectValue placeholder={copy.filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </p>

          <TableRoot className="mt-2">
            <Table>
              <TableCaption className="sr-only">{copy.table.sortHint}</TableCaption>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{sortLabel('fullName', copy.table.columnName)}</TableHeaderCell>
                  <TableHeaderCell>{sortLabel('language', copy.table.columnLanguage)}</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    {sortLabel('stars', copy.table.columnStars)}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((item) => (
                  <TableRow key={item.fullName}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-blue-600 underline dark:text-blue-400"
                        onClick={() => setSelected(item)}
                      >
                        {item.fullName}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </TableCell>
                    <TableCell>{item.language}</TableCell>
                    <TableCell className="text-right">{formatStars(item.stars)}</TableCell>
                  </TableRow>
                ))}
                {shown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>{copy.table.empty}</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableRoot>
        </TabsContent>

        <TabsContent value="register" className="pt-6">
          <h2 className="text-lg font-semibold">{copy.form.title}</h2>
          <form className="mt-3 flex max-w-md flex-col gap-3" onSubmit={submit} noValidate>
            {field(copy.form.nameLabel, form.fullName, (v) => setForm({ ...form, fullName: v }), errors.fullName, {
              placeholder: copy.form.namePlaceholder,
              id: 'name',
            })}
            {field(copy.form.languageLabel, form.language, (v) => setForm({ ...form, language: v }), errors.language, {
              id: 'lang-input',
            })}
            {field(copy.form.urlLabel, form.url, (v) => setForm({ ...form, url: v }), errors.url, { id: 'url' })}
            <div className="flex flex-col gap-1">
              <Label>{copy.form.dateLabel}</Label>
              {/* id は Trigger に転送されないため、公式サポートの aria-label で名前を付ける */}
              <DatePicker
                aria-label="日付を選択"
                value={fromDateString(form.date)}
                onChange={(d) => setForm((f) => ({ ...f, date: toDateString(d) }))}
              />
              <span className="min-h-[18px] text-xs text-red-600 dark:text-red-500">
                {errors.date ?? ' '}
              </span>
            </div>
            <Button type="submit" className="self-start">
              {copy.form.submit}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.dialog.title}</DialogTitle>
            <DialogDescription className="font-semibold text-gray-900 dark:text-gray-50">
              {selected?.fullName}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">{selected?.description}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{copy.dialog.close}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
