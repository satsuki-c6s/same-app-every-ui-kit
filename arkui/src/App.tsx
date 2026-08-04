import { useMemo, useState } from 'react';
import { Combobox, useListCollection } from '@ark-ui/react/combobox';
import { DatePicker } from '@ark-ui/react/date-picker';
import { Dialog } from '@ark-ui/react/dialog';
import { useFilter } from '@ark-ui/react/locale';
import { Portal } from '@ark-ui/react/portal';
import { Tabs } from '@ark-ui/react/tabs';
import { Toast, Toaster, createToaster } from '@ark-ui/react/toast';
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

const toaster = createToaster({ placement: 'bottom-end', gap: 8 });

interface AppProps {
  dark: boolean;
  onToggleDark: () => void;
}

/**
 * Ark UI 版。ロジックは shared/logic.ts と共有する。
 *
 * Ark UI も Radix と同じ**見た目を持たない部品**のライブラリ。キーボード操作・
 * 焦点管理・読み上げ対応は部品 (Zag.js) が担い、配色・余白・角丸は全部
 * style.css にこちらで書く。Radix との違いは部品の守備範囲:
 * 入力しながら絞り込む Combobox と、盤面つきの DatePicker を公式に持つ
 * (Radix ではどちらも無く、素の input で代用した)。
 */
export function App({ dark, onToggleDark }: AppProps) {
  const [tab, setTab] = useState('list');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formEpoch, setFormEpoch] = useState(0);

  const languages = useMemo(() => [copy.filter.all, ...languagesOf(data.items)], []);
  const { contains } = useFilter({ sensitivity: 'base' });
  const { collection, filter } = useListCollection({ initialItems: languages, filter: contains });

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
      toaster.create({ description: copy.toast.error, type: 'error', duration: TOAST_DURATION_MS });
      return;
    }
    toaster.create({ description: copy.toast.success, type: 'success', duration: TOAST_DURATION_MS });
    setForm(EMPTY_FORM);
    // DatePicker は非制御なので、成功時は key を変えて盤面ごと初期化する
    setFormEpoch((n) => n + 1);
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
    extra?: { placeholder?: string; id?: string },
  ) => {
    const id = extra?.id ?? `f-${label}`;
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
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

      <Tabs.Root value={tab} onValueChange={(d) => setTab(d.value)}>
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
              <Combobox.Root
                className="combo"
                collection={collection}
                value={[languageValue]}
                openOnClick
                onValueChange={(d) => {
                  const picked = d.value[0] ?? copy.filter.all;
                  setLanguage(picked === copy.filter.all ? ALL_LANGUAGES : picked);
                }}
                onInputValueChange={(d) => {
                  if (d.reason === 'input-change') filter(d.inputValue);
                }}
                onOpenChange={(d) => {
                  if (d.open) filter('');
                }}
              >
                <Combobox.Control className="combo-control">
                  <Combobox.Input id="lang" placeholder={copy.filter.placeholder} />
                  <Combobox.Trigger className="combo-trigger">▾</Combobox.Trigger>
                </Combobox.Control>
                <Portal>
                  <Combobox.Positioner>
                    <Combobox.Content className="select-content">
                      {collection.items.map((name) => (
                        <Combobox.Item className="select-item" key={name} item={name}>
                          <Combobox.ItemText>{name}</Combobox.ItemText>
                        </Combobox.Item>
                      ))}
                    </Combobox.Content>
                  </Combobox.Positioner>
                </Portal>
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
            <div>
              <DatePicker.Root
                key={formEpoch}
                className="datepicker"
                onValueChange={(d) => setForm((f) => ({ ...f, date: d.valueAsString[0] ?? '' }))}
              >
                <DatePicker.Label>{copy.form.dateLabel}</DatePicker.Label>
                <DatePicker.Control className="combo-control">
                  <DatePicker.Input id="date" aria-invalid={errors.date ? 'true' : undefined} />
                  <DatePicker.Trigger className="combo-trigger">▾</DatePicker.Trigger>
                </DatePicker.Control>
                <Portal>
                  <DatePicker.Positioner>
                    <DatePicker.Content className="select-content cal">
                      <DatePicker.View view="day">
                        <DatePicker.Context>
                          {(picker) => (
                            <>
                              <DatePicker.ViewControl className="cal-control">
                                <DatePicker.PrevTrigger>‹</DatePicker.PrevTrigger>
                                <DatePicker.ViewTrigger>
                                  <DatePicker.RangeText />
                                </DatePicker.ViewTrigger>
                                <DatePicker.NextTrigger>›</DatePicker.NextTrigger>
                              </DatePicker.ViewControl>
                              <DatePicker.Table className="cal-table">
                                <DatePicker.TableHead>
                                  <DatePicker.TableRow>
                                    {picker.weekDays.map((weekDay, i) => (
                                      <DatePicker.TableHeader key={i}>
                                        {weekDay.short}
                                      </DatePicker.TableHeader>
                                    ))}
                                  </DatePicker.TableRow>
                                </DatePicker.TableHead>
                                <DatePicker.TableBody>
                                  {picker.weeks.map((week, i) => (
                                    <DatePicker.TableRow key={i}>
                                      {week.map((day, j) => (
                                        <DatePicker.TableCell key={j} value={day}>
                                          <DatePicker.TableCellTrigger>
                                            {day.day}
                                          </DatePicker.TableCellTrigger>
                                        </DatePicker.TableCell>
                                      ))}
                                    </DatePicker.TableRow>
                                  ))}
                                </DatePicker.TableBody>
                              </DatePicker.Table>
                            </>
                          )}
                        </DatePicker.Context>
                      </DatePicker.View>
                      <DatePicker.View view="month">
                        <DatePicker.Context>
                          {(picker) => (
                            <>
                              <DatePicker.ViewControl className="cal-control">
                                <DatePicker.PrevTrigger>‹</DatePicker.PrevTrigger>
                                <DatePicker.ViewTrigger>
                                  <DatePicker.RangeText />
                                </DatePicker.ViewTrigger>
                                <DatePicker.NextTrigger>›</DatePicker.NextTrigger>
                              </DatePicker.ViewControl>
                              <DatePicker.Table className="cal-table">
                                <DatePicker.TableBody>
                                  {picker.getMonthsGrid({ columns: 4, format: 'short' }).map((months, i) => (
                                    <DatePicker.TableRow key={i}>
                                      {months.map((month, j) => (
                                        <DatePicker.TableCell key={j} value={month.value}>
                                          <DatePicker.TableCellTrigger>
                                            {month.label}
                                          </DatePicker.TableCellTrigger>
                                        </DatePicker.TableCell>
                                      ))}
                                    </DatePicker.TableRow>
                                  ))}
                                </DatePicker.TableBody>
                              </DatePicker.Table>
                            </>
                          )}
                        </DatePicker.Context>
                      </DatePicker.View>
                      <DatePicker.View view="year">
                        <DatePicker.Context>
                          {(picker) => (
                            <>
                              <DatePicker.ViewControl className="cal-control">
                                <DatePicker.PrevTrigger>‹</DatePicker.PrevTrigger>
                                <DatePicker.ViewTrigger>
                                  <DatePicker.RangeText />
                                </DatePicker.ViewTrigger>
                                <DatePicker.NextTrigger>›</DatePicker.NextTrigger>
                              </DatePicker.ViewControl>
                              <DatePicker.Table className="cal-table">
                                <DatePicker.TableBody>
                                  {picker.getYearsGrid({ columns: 4 }).map((years, i) => (
                                    <DatePicker.TableRow key={i}>
                                      {years.map((year, j) => (
                                        <DatePicker.TableCell key={j} value={year.value}>
                                          <DatePicker.TableCellTrigger>
                                            {year.label}
                                          </DatePicker.TableCellTrigger>
                                        </DatePicker.TableCell>
                                      ))}
                                    </DatePicker.TableRow>
                                  ))}
                                </DatePicker.TableBody>
                              </DatePicker.Table>
                            </>
                          )}
                        </DatePicker.Context>
                      </DatePicker.View>
                    </DatePicker.Content>
                  </DatePicker.Positioner>
                </Portal>
              </DatePicker.Root>
              <span className="error">{errors.date ?? ' '}</span>
            </div>
            <button type="submit" className="primary" style={{ alignSelf: 'flex-start' }}>
              {copy.form.submit}
            </button>
          </form>
        </Tabs.Content>
      </Tabs.Root>

      <Dialog.Root open={selected !== null} onOpenChange={(d) => !d.open && setSelected(null)}>
        <Portal>
          <Dialog.Backdrop className="overlay" />
          <Dialog.Positioner>
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
                <Dialog.CloseTrigger asChild>
                  <button type="button">{copy.dialog.close}</button>
                </Dialog.CloseTrigger>
              </div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Toaster toaster={toaster}>
        {(toast) => (
          <Toast.Root key={toast.id} className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
            <Toast.Description>{toast.description}</Toast.Description>
          </Toast.Root>
        )}
      </Toaster>
    </div>
  );
}
