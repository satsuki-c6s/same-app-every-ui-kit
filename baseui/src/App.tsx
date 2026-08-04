import { useMemo, useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { Tabs } from '@base-ui/react/tabs';
import { Toast } from '@base-ui/react/toast';
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
const TOAST_TIMEOUT_MS = 100000;

interface AppProps {
  dark: boolean;
  onToggleDark: () => void;
}

/**
 * Base UI 版。ロジックは shared/logic.ts と共有する。
 *
 * Base UI も**見た目を持たない部品**のライブラリ (MUI・Radix・Floating UI の
 * 作者チームによる)。キーボード操作・焦点管理・読み上げ対応は部品が担い、
 * 配色・余白・角丸は全部 style.css にこちらで書く。
 * 入力しながら絞り込む Combobox は公式に持つが、日付の部品は無いので
 * 素の <input type="date"> を使う (radix 回と同じ扱い)。
 */
export function App({ dark, onToggleDark }: AppProps) {
  const toastManager = Toast.useToastManager();
  const [tab, setTab] = useState<string | number | null>('list');
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
      toastManager.add({ description: copy.toast.error, type: 'error', timeout: TOAST_TIMEOUT_MS });
      return;
    }
    toastManager.add({ description: copy.toast.success, type: 'success', timeout: TOAST_TIMEOUT_MS });
    setForm(EMPTY_FORM);
  };

  const sortLabel = (key: SortKey, label: string) => (
    <button type="button" className="sort" onClick={() => setSort((c) => nextSort(c, key))}>
      {label}
    </button>
  );

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    error?: string,
    extra?: { placeholder?: string; id?: string; type?: string },
  ) => {
    const id = extra?.id ?? `f-${label}`;
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type={extra?.type}
          placeholder={extra?.placeholder}
          value={value}
          aria-invalid={error ? 'true' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="error">{error ?? ' '}</span>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>{copy.app.title}</h1>
          <p className="subtitle">{copy.app.subtitle}</p>
        </div>
        <button type="button" onClick={onToggleDark}>
          {dark ? copy.theme.toLight : copy.theme.toDark}
        </button>
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="tabs-list">
          <Tabs.Tab className="tab" value="list">
            {copy.tabs.list}
          </Tabs.Tab>
          <Tabs.Tab className="tab" value="register">
            {copy.tabs.register}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel className="tabs-content" value="list">
          <div className="fields">
            <div className="field">
              <label htmlFor="search">{copy.search.label}</label>
              <input
                id="search"
                type="search"
                placeholder={copy.search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="lang">{copy.filter.label}</label>
              <Combobox.Root
                items={languages}
                value={languageValue}
                onValueChange={(v) => {
                  const picked = typeof v === 'string' ? v : copy.filter.all;
                  setLanguage(picked === copy.filter.all ? ALL_LANGUAGES : picked);
                }}
              >
                <div className="combo-control">
                  <Combobox.Input id="lang" placeholder={copy.filter.placeholder} />
                  <Combobox.Trigger className="combo-trigger">▾</Combobox.Trigger>
                </div>
                <Combobox.Portal>
                  <Combobox.Positioner sideOffset={4}>
                    <Combobox.Popup className="select-content">
                      <Combobox.List>
                        {(item: string) => (
                          <Combobox.Item className="select-item" key={item} value={item}>
                            {item}
                          </Combobox.Item>
                        )}
                      </Combobox.List>
                    </Combobox.Popup>
                  </Combobox.Positioner>
                </Combobox.Portal>
              </Combobox.Root>
            </div>
          </div>

          <p className="summary">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </p>

          <table>
            <caption className="sr-only">{copy.table.sortHint}</caption>
            <thead>
              <tr>
                <th>{sortLabel('fullName', copy.table.columnName)}</th>
                <th>{sortLabel('language', copy.table.columnLanguage)}</th>
                <th>{sortLabel('stars', copy.table.columnStars)}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.fullName}>
                  <td>
                    <button type="button" className="link" onClick={() => setSelected(item)}>
                      {item.fullName}
                    </button>
                    <p className="muted">{item.description}</p>
                  </td>
                  <td>{item.language}</td>
                  <td>{formatStars(item.stars)}</td>
                </tr>
              ))}
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={3}>{copy.table.empty}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Tabs.Panel>

        <Tabs.Panel className="tabs-content" value="register">
          <h2>{copy.form.title}</h2>
          <form className="form" onSubmit={submit} noValidate>
            {field(copy.form.nameLabel, form.fullName, (v) => setForm({ ...form, fullName: v }), errors.fullName, {
              placeholder: copy.form.namePlaceholder,
              id: 'name',
            })}
            {field(copy.form.languageLabel, form.language, (v) => setForm({ ...form, language: v }), errors.language, {
              id: 'lang-input',
            })}
            {field(copy.form.urlLabel, form.url, (v) => setForm({ ...form, url: v }), errors.url, { id: 'url' })}
            {/* 日付の部品は Base UI に無いので素の date 入力を使う (radix 回と同じ) */}
            {field(copy.form.dateLabel, form.date, (v) => setForm({ ...form, date: v }), errors.date, {
              id: 'date',
              type: 'date',
            })}
            <button type="submit" className="primary" style={{ alignSelf: 'flex-start' }}>
              {copy.form.submit}
            </button>
          </form>
        </Tabs.Panel>
      </Tabs.Root>

      <Dialog.Root open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="overlay" />
          <Dialog.Viewport>
            <Dialog.Popup className="dialog">
              <Dialog.Title>{copy.dialog.title}</Dialog.Title>
              <Dialog.Description render={<p style={{ fontWeight: 700, margin: 0 }} />}>
                {selected?.fullName}
              </Dialog.Description>
              <p>{selected?.description}</p>
              <p className="muted">
                {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
              </p>
              <div className="dialog-actions">
                <Dialog.Close>{copy.dialog.close}</Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/** トーストの描画。Toast.Provider の中 (main.tsx の Viewport) から呼ばれる。 */
export function AppToasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={`toast ${toast.type === 'error' ? 'error' : ''}`}
    >
      <Toast.Content>
        <Toast.Description />
      </Toast.Content>
    </Toast.Root>
  ));
}
