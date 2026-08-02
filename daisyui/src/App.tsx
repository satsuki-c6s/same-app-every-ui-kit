import { useMemo, useRef, useState } from 'react';
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
 * daisyUI 版。ロジックは shared/logic.ts と共有し、ここでは見た目のクラスだけを付ける。
 *
 * daisyUI は **CSS のクラス名だけを配るライブラリ**で、JavaScript を持ちません。
 * そのため公式に無い部品は素の HTML で組みます (PREREG の「公式ドキュメントどおり」に従う):
 *   - コンボボックス: 公式に無い → <input list> + <datalist> (ブラウザ標準)
 *   - カレンダー:     公式に無い → <input type="date"> (公式が代替として案内している)
 * 公式は Cally などの外部ライブラリに **スタイルを当てる**方法を案内していますが、
 * それは別ライブラリの導入なので「daisyUI が持っている」とは数えません。
 */
export function App({ dark, onToggleDark }: AppProps) {
  const [tab, setTab] = useState<'list' | 'register'>('list');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [comboText, setComboText] = useState(copy.filter.all);
  const [comboOpen, setComboOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const languages = useMemo(() => [copy.filter.all, ...languagesOf(data.items)], []);
  const shown = useMemo(
    () => sortRepos(filterRepos(data.items, query, language), sort.key, sort.dir),
    [query, language, sort],
  );
  const candidates = languages.filter((name) =>
    name.toLowerCase().includes(comboText.trim().toLowerCase()),
  );

  const pickLanguage = (name: string): void => {
    setLanguage(name === copy.filter.all ? ALL_LANGUAGES : name);
    setComboText(name);
    setComboOpen(false);
  };

  const openDialog = (item: Repo): void => {
    setSelected(item);
    dialogRef.current?.showModal();
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

  const sortLabel = (key: SortKey, label: string) => (
    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSort((c) => nextSort(c, key))}>
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{copy.app.title}</h1>
          <p className="text-sm opacity-60">{copy.app.subtitle}</p>
        </div>
        <button type="button" className="btn" onClick={onToggleDark}>
          {dark ? copy.theme.toLight : copy.theme.toDark}
        </button>
      </div>

      <div role="tablist" className="tabs tabs-border mt-6">
        <button
          type="button"
          role="tab"
          className={`tab ${tab === 'list' ? 'tab-active' : ''}`}
          aria-selected={tab === 'list'}
          onClick={() => setTab('list')}
        >
          {copy.tabs.list}
        </button>
        <button
          type="button"
          role="tab"
          className={`tab ${tab === 'register' ? 'tab-active' : ''}`}
          aria-selected={tab === 'register'}
          onClick={() => setTab('register')}
        >
          {copy.tabs.register}
        </button>
      </div>

      {tab === 'list' ? (
        <div className="mt-6">
          <div className="flex max-w-3xl flex-wrap gap-4">
            <label className="form-control min-w-70 flex-1">
              <span className="label-text">{copy.search.label}</span>
              <input
                type="search"
                className="input input-bordered w-full"
                placeholder={copy.search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {/* コンボボックスは daisyUI に無い。第1回の素の実装と同じ手で組む
                (候補リストを自分で描く。datalist はブラウザ任せで候補が DOM に出ないため、
                 全実装を同じ手順で操作・計測できない) */}
            <div className="form-control combo relative min-w-60">
              <span className="label-text">{copy.filter.label}</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder={copy.filter.placeholder}
                value={comboText}
                onFocus={() => {
                  setComboText('');
                  setComboOpen(true);
                }}
                onChange={(e) => {
                  setComboText(e.target.value);
                  setComboOpen(true);
                }}
              />
              {comboOpen ? (
                <ul className="menu absolute top-full z-10 mt-1 w-full rounded-box bg-base-100 shadow">
                  {candidates.map((name) => (
                    <li key={name}>
                      <button type="button" onClick={() => pickLanguage(name)}>
                        {name}
                      </button>
                    </li>
                  ))}
                  {candidates.length === 0 ? (
                    <li className="px-4 py-2 opacity-60">{copy.filter.empty}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>

          <p className="mt-4 text-sm opacity-60">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </p>

          <div className="overflow-x-auto">
            <table className="table table-sm mt-1">
              <caption className="sr-only">{copy.table.sortHint}</caption>
              <thead>
                <tr>
                  <th>{sortLabel('fullName', copy.table.columnName)}</th>
                  <th>{sortLabel('language', copy.table.columnLanguage)}</th>
                  <th className="text-right">{sortLabel('stars', copy.table.columnStars)}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr key={item.fullName} className="hover">
                    <td>
                      <button
                        type="button"
                        className="btn btn-link btn-xs px-0"
                        onClick={() => openDialog(item)}
                      >
                        {item.fullName}
                      </button>
                      <p className="text-xs opacity-60">{item.description}</p>
                    </td>
                    <td>{item.language}</td>
                    <td className="text-right tabular-nums">{formatStars(item.stars)}</td>
                  </tr>
                ))}
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center opacity-60">
                      {copy.table.empty}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="text-xl font-bold">{copy.form.title}</h2>
          <form onSubmit={submit} noValidate className="mt-2 flex max-w-md flex-col gap-4">
            <label className="form-control">
              <span className="label-text">{copy.form.nameLabel}</span>
              <input
                className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                placeholder={copy.form.namePlaceholder}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <span className="label-text-alt text-error">{errors.fullName ?? ' '}</span>
            </label>
            <label className="form-control">
              <span className="label-text">{copy.form.languageLabel}</span>
              <input
                className={`input input-bordered w-full ${errors.language ? 'input-error' : ''}`}
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
              <span className="label-text-alt text-error">{errors.language ?? ' '}</span>
            </label>
            <label className="form-control">
              <span className="label-text">{copy.form.urlLabel}</span>
              <input
                className={`input input-bordered w-full ${errors.url ? 'input-error' : ''}`}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <span className="label-text-alt text-error">{errors.url ?? ' '}</span>
            </label>
            {/* カレンダーも daisyUI に無いので素の date 入力 (公式が代替として案内している) */}
            <label className="form-control">
              <span className="label-text">{copy.form.dateLabel}</span>
              <input
                id="date"
                type="date"
                className={`input input-bordered w-full ${errors.date ? 'input-error' : ''}`}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <span className="label-text-alt text-error">{errors.date ?? ' '}</span>
            </label>
            <button type="submit" className="btn btn-primary self-start">
              {copy.form.submit}
            </button>
          </form>
        </div>
      )}

      <dialog ref={dialogRef} className="modal" onClose={() => setSelected(null)}>
        <div className="modal-box">
          <h3 className="text-lg font-bold">{copy.dialog.title}</h3>
          <p className="font-bold">{selected?.fullName}</p>
          <p>{selected?.description}</p>
          <p className="text-sm opacity-60">
            {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button type="submit" className="btn">
                {copy.dialog.close}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>

      {toast ? (
        <div className="toast toast-end">
          <div className={`alert ${toast.tone === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{toast.text}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
