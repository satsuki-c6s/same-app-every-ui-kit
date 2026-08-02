import { useMemo, useState } from 'react';
import { Dialog, Select, Tabs, Toast } from 'radix-ui';
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

interface AppProps {
  dark: boolean;
  onToggleDark: () => void;
}

/**
 * Radix UI 版。ロジックは shared/logic.ts と共有する。
 *
 * Radix は**見た目を持たない部品**を配るライブラリ。キーボード操作・焦点管理・
 * 読み上げ対応は部品が担い、配色・余白・角丸は全部 style.css にこちらで書く。
 * 日付の部品は Radix に無いので素の <input type="date"> を使う
 * (PREREG の「公式ドキュメントどおり」に従い、無いものは素の HTML で組む)。
 */
export function App({ dark, onToggleDark }: AppProps) {
  const [tab, setTab] = useState('list');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

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
      setToast({ tone: 'error', text: copy.toast.error });
      return;
    }
    setToast({ tone: 'success', text: copy.toast.success });
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
    <Toast.Provider swipeDirection="right">
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
            <Tabs.Trigger className="tab" value="list">
              {copy.tabs.list}
            </Tabs.Trigger>
            <Tabs.Trigger className="tab" value="register">
              {copy.tabs.register}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content className="tabs-content" value="list">
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
                <Select.Root
                  value={languageValue}
                  onValueChange={(v) => setLanguage(v === copy.filter.all ? ALL_LANGUAGES : v)}
                >
                  <Select.Trigger className="select-trigger" id="lang">
                    <Select.Value placeholder={copy.filter.placeholder} />
                    <Select.Icon>▾</Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="select-content" position="popper" sideOffset={4}>
                      <Select.Viewport>
                        {languages.map((name) => (
                          <Select.Item className="select-item" key={name} value={name}>
                            <Select.ItemText>{name}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
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
          </Tabs.Content>

          <Tabs.Content className="tabs-content" value="register">
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
              {/* 日付の部品は Radix に無いので素の date 入力を使う */}
              {field(copy.form.dateLabel, form.date, (v) => setForm({ ...form, date: v }), errors.date, {
                id: 'date',
                type: 'date',
              })}
              <button type="submit" className="primary" style={{ alignSelf: 'flex-start' }}>
                {copy.form.submit}
              </button>
            </form>
          </Tabs.Content>
        </Tabs.Root>

        <Dialog.Root open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="overlay" />
            <Dialog.Content className="dialog">
              <Dialog.Title>{copy.dialog.title}</Dialog.Title>
              <Dialog.Description asChild>
                <p style={{ fontWeight: 700, margin: 0 }}>{selected?.fullName}</p>
              </Dialog.Description>
              <p>{selected?.description}</p>
              <p className="muted">
                {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
              </p>
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button type="button">{copy.dialog.close}</button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {toast ? (
          <Toast.Root
            className={`toast ${toast.tone === 'error' ? 'error' : ''}`}
            open
            onOpenChange={(o) => !o && setToast(null)}
            duration={100000}
          >
            <Toast.Description>{toast.text}</Toast.Description>
          </Toast.Root>
        ) : null}
        <Toast.Viewport className="toast-viewport" />
      </div>
    </Toast.Provider>
  );
}
