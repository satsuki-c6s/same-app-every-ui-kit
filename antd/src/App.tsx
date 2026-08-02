import { useMemo, useState } from 'react';
import {
  App as AntApp,
  Button,
  DatePicker,
  Flex,
  Input,
  Modal,
  Select,
  Table,
  Tabs,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
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

/** Ant Design 版。ロジックは shared/logic.ts と共有し、ここでは UI だけを書く。 */
export function App({ dark, onToggleDark }: AppProps) {
  const { message } = AntApp.useApp();
  const [tab, setTab] = useState('list');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const languages = useMemo(
    () => [copy.filter.all, ...languagesOf(data.items)].map((v) => ({ value: v, label: v })),
    [],
  );
  const shown = useMemo(
    () => sortRepos(filterRepos(data.items, query, language), sort.key, sort.dir),
    [query, language, sort],
  );
  const languageLabel = language === ALL_LANGUAGES ? copy.filter.all : language;

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
      void message.error(copy.toast.error);
      return;
    }
    void message.success(copy.toast.success);
    setForm(EMPTY_FORM);
  };

  // 並べ替えは shared/logic.ts の nextSort に委ねるため、Table の sorter は使わず
  // 見出しをボタンにする (全実装で同じ並べ替え規則にするため)
  const sortLabel = (key: SortKey, label: string) => (
    <Button type="text" size="small" onClick={() => setSort((c) => nextSort(c, key))}>
      {label}
    </Button>
  );

  const columns: TableColumnsType<Repo> = [
    {
      title: sortLabel('fullName', copy.table.columnName),
      dataIndex: 'fullName',
      render: (_: unknown, item: Repo) => (
        <>
          <Button type="link" style={{ padding: 0 }} onClick={() => setSelected(item)}>
            {item.fullName}
          </Button>
          <p style={{ margin: 0 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {item.description}
            </Typography.Text>
          </p>
        </>
      ),
    },
    { title: sortLabel('language', copy.table.columnLanguage), dataIndex: 'language' },
    {
      title: sortLabel('stars', copy.table.columnStars),
      dataIndex: 'stars',
      align: 'right',
      render: (stars: number) => formatStars(stars),
    },
  ];

  const listPanel = (
    <>
      <Flex gap="middle" wrap style={{ maxWidth: 720 }}>
        <label style={{ flex: 1, minWidth: 280 }}>
          <Typography.Text>{copy.search.label}</Typography.Text>
          <Input
            type="search"
            placeholder={copy.search.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label style={{ minWidth: 240 }}>
          <Typography.Text>{copy.filter.label}</Typography.Text>
          <Select
            showSearch
            style={{ width: '100%', display: 'block' }}
            placeholder={copy.filter.placeholder}
            notFoundContent={copy.filter.empty}
            options={languages}
            value={languageLabel}
            onChange={(v: string) => setLanguage(v === copy.filter.all ? ALL_LANGUAGES : v)}
          />
        </label>
      </Flex>

      {/* 他実装と同じ <p> で出す (計測スクリプトが全実装を同じ手で読むため)。
          Ant Design 6 の Typography.Paragraph は div を描画し、<p> にはならない
          (component prop でも変わらない)。素の <p> に Text を載せて体裁を揃える */}
      <p style={{ marginTop: 16 }}>
        <Typography.Text type="secondary">
          {formatSummary(copy.summary.template, data.items.length, shown.length)}
        </Typography.Text>
      </p>

      <Table<Repo>
        columns={columns}
        dataSource={shown}
        rowKey="fullName"
        pagination={false}
        size="small"
        locale={{ emptyText: copy.table.empty }}
        caption={<span style={{ position: 'absolute', left: -9999 }}>{copy.table.sortHint}</span>}
      />
    </>
  );

  const formPanel = (
    <>
      <Typography.Title level={2} style={{ fontSize: 20 }}>
        {copy.form.title}
      </Typography.Title>
      <form onSubmit={submit} noValidate style={{ maxWidth: 440 }}>
        <Flex vertical gap="middle">
          <label>
            <Typography.Text>{copy.form.nameLabel}</Typography.Text>
            <Input
              placeholder={copy.form.namePlaceholder}
              status={errors.fullName ? 'error' : ''}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <Typography.Text type="danger">{errors.fullName ?? ' '}</Typography.Text>
          </label>
          <label>
            <Typography.Text>{copy.form.languageLabel}</Typography.Text>
            <Input
              status={errors.language ? 'error' : ''}
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            />
            <Typography.Text type="danger">{errors.language ?? ' '}</Typography.Text>
          </label>
          <label>
            <Typography.Text>{copy.form.urlLabel}</Typography.Text>
            <Input
              status={errors.url ? 'error' : ''}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <Typography.Text type="danger">{errors.url ?? ' '}</Typography.Text>
          </label>
          <label>
            <Typography.Text>{copy.form.dateLabel}</Typography.Text>
            <DatePicker
              id="date"
              style={{ width: '100%' }}
              placeholder={copy.form.datePlaceholder}
              status={errors.date ? 'error' : ''}
              value={form.date === '' ? null : dayjs(form.date)}
              onChange={(v) => setForm({ ...form, date: v ? v.format('YYYY-MM-DD') : '' })}
            />
            <Typography.Text type="danger">{errors.date ?? ' '}</Typography.Text>
          </label>
          <Button type="primary" htmlType="submit" style={{ alignSelf: 'flex-start' }}>
            {copy.form.submit}
          </Button>
        </Flex>
      </form>
    </>
  );

  return (
    <div style={{ maxWidth: 1152, margin: '0 auto', padding: 24 }}>
      <Flex justify="space-between" align="flex-start" gap="middle">
        <div>
          <Typography.Title level={1} style={{ fontSize: 24, marginBottom: 0 }}>
            {copy.app.title}
          </Typography.Title>
          <Typography.Text type="secondary">{copy.app.subtitle}</Typography.Text>
        </div>
        <Button onClick={onToggleDark}>{dark ? copy.theme.toLight : copy.theme.toDark}</Button>
      </Flex>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        style={{ marginTop: 24 }}
        items={[
          { key: 'list', label: copy.tabs.list, children: listPanel },
          { key: 'register', label: copy.tabs.register, children: formPanel },
        ]}
      />

      <Modal
        open={selected !== null}
        title={copy.dialog.title}
        onCancel={() => setSelected(null)}
        onOk={() => setSelected(null)}
        okText={copy.dialog.close}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p style={{ marginBottom: 0 }}>
          <Typography.Text strong>{selected?.fullName}</Typography.Text>
        </p>
        <p style={{ marginBottom: 0 }}>
          <Typography.Text>{selected?.description}</Typography.Text>
        </p>
        <Typography.Text type="secondary">
          {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
        </Typography.Text>
      </Modal>
    </div>
  );
}
