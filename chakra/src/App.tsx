import { useMemo, useState } from 'react';
import {
  Button,
  Container,
  DatePicker,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  Portal,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  createListCollection,
  parseDate,
} from '@chakra-ui/react';
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
 * Chakra UI 版。ロジックは shared/logic.ts と共有し、ここでは UI だけを書く。
 *
 * 日付は公式の DatePicker を使う。公式サイトの部品ページは「Not available」と出るが、
 * パッケージには実装されている (ドキュメントの整備が追いついていない)。
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

  const languages = useMemo(
    () =>
      createListCollection({
        items: [copy.filter.all, ...languagesOf(data.items)].map((v) => ({ label: v, value: v })),
      }),
    [],
  );
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
    <Button variant="ghost" size="xs" onClick={() => setSort((c) => nextSort(c, key))}>
      {label}
    </Button>
  );

  // 入力欄は公式の Field 部品で組む。ラベルの紐付けもエラー時の配色も
  // Chakra が既定で面倒を見る (自分で色を指定しない = 既定値のみルール)
  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    error?: string,
    extra?: { placeholder?: string; id?: string; type?: string },
  ) => (
    <Field.Root invalid={Boolean(error)}>
      {/* id を自分で指定する欄 (日付) だけは、Field が自動で振る id と食い違うので
          ラベルの for も明示して紐付けを保つ。id は撮影スクリプトが使う約束 */}
      <Field.Label htmlFor={extra?.id}>{label}</Field.Label>
      <Input
        id={extra?.id}
        type={extra?.type}
        placeholder={extra?.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  );

  return (
    <Container maxW="6xl" py="6">
      <Flex justify="space-between" align="flex-start" gap="4">
        <Stack gap="0">
          <Heading as="h1" size="xl">
            {copy.app.title}
          </Heading>
          <Text textStyle="sm" color="fg.muted">
            {copy.app.subtitle}
          </Text>
        </Stack>
        <Button variant="outline" onClick={onToggleDark}>
          {dark ? copy.theme.toLight : copy.theme.toDark}
        </Button>
      </Flex>

      <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)} mt="6">
        <Tabs.List>
          <Tabs.Trigger value="list">{copy.tabs.list}</Tabs.Trigger>
          <Tabs.Trigger value="register">{copy.tabs.register}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="list" pt="6">
          <Flex gap="4" wrap="wrap" maxW="3xl" align="flex-end">
            <Field.Root flex="1" minW="70">
              <Field.Label>{copy.search.label}</Field.Label>
              <Input
                type="search"
                placeholder={copy.search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field.Root>

            <Select.Root
              collection={languages}
              value={[languageValue]}
              onValueChange={(e) => {
                const picked = e.value[0] ?? copy.filter.all;
                setLanguage(picked === copy.filter.all ? ALL_LANGUAGES : picked);
              }}
              minW="60"
            >
              <Select.HiddenSelect />
              <Select.Label>{copy.filter.label}</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder={copy.filter.placeholder} />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {languages.items.map((item) => (
                      <Select.Item item={item} key={item.value}>
                        {item.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Flex>

          <Text as="p" textStyle="sm" color="fg.muted" mt="4">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </Text>

          <Table.Root size="sm" mt="1">
            <Table.Caption srOnly>{copy.table.sortHint}</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{sortLabel('fullName', copy.table.columnName)}</Table.ColumnHeader>
                <Table.ColumnHeader>
                  {sortLabel('language', copy.table.columnLanguage)}
                </Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">
                  {sortLabel('stars', copy.table.columnStars)}
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shown.map((item) => (
                <Table.Row key={item.fullName}>
                  <Table.Cell>
                    <Button variant="plain" size="xs" px="0" onClick={() => setSelected(item)}>
                      {item.fullName}
                    </Button>
                    <Text as="p" textStyle="xs" color="fg.muted">
                      {item.description}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{item.language}</Table.Cell>
                  <Table.Cell textAlign="end">{formatStars(item.stars)}</Table.Cell>
                </Table.Row>
              ))}
              {shown.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={3} textAlign="center" py="8" color="fg.muted">
                    {copy.table.empty}
                  </Table.Cell>
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table.Root>
        </Tabs.Content>

        <Tabs.Content value="register" pt="6">
          <Heading as="h2" size="lg">
            {copy.form.title}
          </Heading>
          <form onSubmit={submit} noValidate>
            <Stack gap="4" mt="2" maxW="md">
              {field(
                copy.form.nameLabel,
                form.fullName,
                (v) => setForm({ ...form, fullName: v }),
                errors.fullName,
                { placeholder: copy.form.namePlaceholder },
              )}
              {field(copy.form.languageLabel, form.language, (v) => setForm({ ...form, language: v }), errors.language)}
              {field(copy.form.urlLabel, form.url, (v) => setForm({ ...form, url: v }), errors.url)}
              {/* 公式の DatePicker を使う。Field との連携は公式が未対応と明記しているので、
                  ラベルとエラー文は DatePicker 側の部品で組む */}
              <Field.Root invalid={Boolean(errors.date)}>
                <DatePicker.Root
                  value={form.date === '' ? [] : [parseDate(form.date)]}
                  onValueChange={(e) =>
                    setForm({ ...form, date: e.value[0] ? e.value[0].toString() : '' })
                  }
                >
                  <DatePicker.Label>{copy.form.dateLabel}</DatePicker.Label>
                  <DatePicker.Control>
                    <DatePicker.Input id="date" placeholder={copy.form.datePlaceholder} />
                    <DatePicker.IndicatorGroup>
                      <DatePicker.Trigger />
                    </DatePicker.IndicatorGroup>
                  </DatePicker.Control>
                  <Portal>
                    <DatePicker.Positioner>
                      <DatePicker.Content>
                        <DatePicker.View view="day">
                          <DatePicker.Header />
                          <DatePicker.DayTable />
                        </DatePicker.View>
                      </DatePicker.Content>
                    </DatePicker.Positioner>
                  </Portal>
                </DatePicker.Root>
                <Field.ErrorText>{errors.date}</Field.ErrorText>
              </Field.Root>
              <Button type="submit" alignSelf="flex-start">
                {copy.form.submit}
              </Button>
            </Stack>
          </form>
        </Tabs.Content>
      </Tabs.Root>

      <Dialog.Root open={selected !== null} onOpenChange={() => setSelected(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{copy.dialog.title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text as="p" fontWeight="bold">
                  {selected?.fullName}
                </Text>
                <Text as="p">{selected?.description}</Text>
                <Text as="p" textStyle="sm" color="fg.muted">
                  {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setSelected(null)}>{copy.dialog.close}</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {toast ? (
        <Flex position="fixed" bottom="4" right="4" zIndex="toast">
          <Flex
            bg={toast.tone === 'error' ? 'red.500' : 'green.500'}
            color="white"
            px="4"
            py="3"
            borderRadius="md"
          >
            <Text>{toast.text}</Text>
          </Flex>
        </Flex>
      ) : null}
    </Container>
  );
}
