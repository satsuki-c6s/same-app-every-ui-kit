import { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * UI ライブラリを使わない素の実装。全 kit の基準。
 *
 * コンボボックス・タブは素の HTML に無いので手で組む。
 * **意図的に手を抜いてはいない**が、手で組むと矢印キー操作や読み上げ用の属性は
 * 普通は付かない。その「普通に書くとこうなる」状態こそが基準として意味を持つ。
 * カレンダーは <input type="date"> をそのまま使う (ブラウザ標準の盤面が出る)。
 */
export function App() {
  const [tab, setTab] = useState<'list' | 'register'>('list');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [comboText, setComboText] = useState(copy.filter.all);
  const [comboOpen, setComboOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const languages = useMemo(() => [copy.filter.all, ...languagesOf(data.items)], []);
  const shown = useMemo(
    () => sortRepos(filterRepos(data.items, query, language), sort.key, sort.dir),
    [query, language, sort],
  );
  const candidates = languages.filter((name) =>
    name.toLowerCase().includes(comboText.trim().toLowerCase()),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  const pickLanguage = (name: string): void => {
    setLanguage(name === copy.filter.all ? ALL_LANGUAGES : name);
    setComboText(name);
    setComboOpen(false);
  };

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

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      className="sort"
      onClick={() => setSort((current) => nextSort(current, key))}
    >
      {label}
      {sort.key === key ? <span aria-hidden="true">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span> : null}
    </button>
  );

  const ariaSort = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{copy.app.title}</h1>
          <p className="subtitle">{copy.app.subtitle}</p>
        </div>
        <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? copy.theme.toDark : copy.theme.toLight}
        </button>
      </header>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'list' ? 'tab current' : 'tab'}
          onClick={() => setTab('list')}
        >
          {copy.tabs.list}
        </button>
        <button
          type="button"
          className={tab === 'register' ? 'tab current' : 'tab'}
          onClick={() => setTab('register')}
        >
          {copy.tabs.register}
        </button>
      </div>

      {tab === 'list' ? (
        <section>
          <div className="controls">
            <label className="field">
              <span>{copy.search.label}</span>
              <input
                type="search"
                value={query}
                placeholder={copy.search.placeholder}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="field combo">
              <span>{copy.filter.label}</span>
              <input
                type="text"
                value={comboText}
                placeholder={copy.filter.placeholder}
                onFocus={() => {
                  // 選んだ値が入ったままだと、その語で絞り込まれて候補が1件しか出ない。
                  // 開いたら空にして全候補を見せる (手で組むと、この手当てを毎回自分で書く)。
                  setComboText('');
                  setComboOpen(true);
                }}
                onChange={(event) => {
                  setComboText(event.target.value);
                  setComboOpen(true);
                }}
              />
              {comboOpen ? (
                <ul className="combo-list">
                  {candidates.map((name) => (
                    <li key={name}>
                      <button type="button" onClick={() => pickLanguage(name)}>
                        {name}
                      </button>
                    </li>
                  ))}
                  {candidates.length === 0 ? <li className="empty">{copy.filter.empty}</li> : null}
                </ul>
              ) : null}
            </div>
          </div>

          <p className="summary">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </p>

          <table className="table">
            <caption className="visually-hidden">{copy.table.sortHint}</caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={ariaSort('fullName')}>
                  {sortButton('fullName', copy.table.columnName)}
                </th>
                <th scope="col" aria-sort={ariaSort('language')}>
                  {sortButton('language', copy.table.columnLanguage)}
                </th>
                <th scope="col" className="numeric" aria-sort={ariaSort('stars')}>
                  {sortButton('stars', copy.table.columnStars)}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.fullName}>
                  <td>
                    <button type="button" className="link" onClick={() => setSelected(item)}>
                      {item.fullName}
                    </button>
                    <p className="description">{item.description}</p>
                  </td>
                  <td>{item.language}</td>
                  <td className="numeric">{formatStars(item.stars)}</td>
                </tr>
              ))}
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty">
                    {copy.table.empty}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="register">
          <h2>{copy.form.title}</h2>
          <form onSubmit={submit} noValidate>
            <Field
              label={copy.form.nameLabel}
              error={errors.fullName}
              value={form.fullName}
              placeholder={copy.form.namePlaceholder}
              onChange={(value) => setForm({ ...form, fullName: value })}
            />
            <Field
              label={copy.form.languageLabel}
              error={errors.language}
              value={form.language}
              onChange={(value) => setForm({ ...form, language: value })}
            />
            <Field
              label={copy.form.urlLabel}
              error={errors.url}
              value={form.url}
              onChange={(value) => setForm({ ...form, url: value })}
            />
            <Field
              label={copy.form.dateLabel}
              error={errors.date}
              value={form.date}
              type="date"
              onChange={(value) => setForm({ ...form, date: value })}
            />
            <button type="submit">{copy.form.submit}</button>
          </form>
        </section>
      )}

      <dialog ref={dialogRef} onClose={() => setSelected(null)}>
        <h2>{copy.dialog.title}</h2>
        {selected ? (
          <>
            <p className="dialog-name">{selected.fullName}</p>
            <p>{selected.description}</p>
            <p>
              {selected.language} ／ {formatStars(selected.stars)}
            </p>
          </>
        ) : null}
        <button type="button" onClick={() => setSelected(null)}>
          {copy.dialog.close}
        </button>
      </dialog>

      <div className="toast-area" role="status" aria-live="polite">
        {toast ? <p className={`toast ${toast.tone}`}>{toast.text}</p> : null}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}

function Field({ label, value, error, placeholder, type = 'text', onChange }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <strong className="error">{error}</strong> : null}
    </label>
  );
}
