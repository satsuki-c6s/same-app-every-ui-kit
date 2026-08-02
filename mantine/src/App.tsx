import { useMemo, useState } from 'react';
import {
  Button,
  Container,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  UnstyledButton,
  VisuallyHidden,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
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

/** Mantine 版。ロジックは shared/logic.ts と共有し、ここでは UI だけを書く。 */
export function App() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const [tab, setTab] = useState<string | null>('list');
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
    // 閉じるボタンの aria-label は公式ドキュメントが設定を求めている (既定では付かない)。
    const closeButtonProps = { 'aria-label': copy.dialog.close };
    if (Object.keys(found).length > 0) {
      notifications.show({ color: 'red', message: copy.toast.error, closeButtonProps });
      return;
    }
    notifications.show({ color: 'green', message: copy.toast.success, closeButtonProps });
    setForm(EMPTY_FORM);
  };

  // Mantine の Table には並べ替え付きの見出しが無いので、見出しのボタンは自分で書く。
  const sortLabel = (key: SortKey, label: string) => (
    <UnstyledButton onClick={() => setSort((current) => nextSort(current, key))}>
      {label}
    </UnstyledButton>
  );

  return (
    <Container size="lg" py="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Title order={1} size="h3">
            {copy.app.title}
          </Title>
          <Text size="sm" c="dimmed">
            {copy.app.subtitle}
          </Text>
        </div>
        <Button
          variant="default"
          onClick={() => setColorScheme(scheme === 'light' ? 'dark' : 'light')}
        >
          {scheme === 'dark' ? copy.theme.toLight : copy.theme.toDark}
        </Button>
      </Group>

      <Tabs value={tab} onChange={setTab} mt="lg">
        <Tabs.List>
          <Tabs.Tab value="list">{copy.tabs.list}</Tabs.Tab>
          <Tabs.Tab value="register">{copy.tabs.register}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list" pt="lg">
          <Group align="flex-start" gap="md" maw={720} wrap="wrap">
            <TextInput
              type="search"
              label={copy.search.label}
              placeholder={copy.search.placeholder}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              flex={1}
              miw={280}
            />
            <Select
              searchable
              label={copy.filter.label}
              placeholder={copy.filter.placeholder}
              nothingFoundMessage={copy.filter.empty}
              data={languages}
              value={languageLabel}
              onChange={(value) =>
                setLanguage(value === null || value === copy.filter.all ? ALL_LANGUAGES : value)
              }
              miw={240}
            />
          </Group>

          <Text size="sm" c="dimmed" mt="md">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </Text>

          <Table mt="xs">
            <Table.Caption>
              <VisuallyHidden>{copy.table.sortHint}</VisuallyHidden>
            </Table.Caption>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{sortLabel('fullName', copy.table.columnName)}</Table.Th>
                <Table.Th>{sortLabel('language', copy.table.columnLanguage)}</Table.Th>
                <Table.Th ta="right">{sortLabel('stars', copy.table.columnStars)}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((item) => (
                <Table.Tr key={item.fullName}>
                  <Table.Td>
                    <UnstyledButton onClick={() => setSelected(item)}>
                      {item.fullName}
                    </UnstyledButton>
                    <Text size="xs" c="dimmed">
                      {item.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>{item.language}</Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {formatStars(item.stars)}
                  </Table.Td>
                </Table.Tr>
              ))}
              {shown.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3} ta="center" py="xl" c="dimmed">
                    {copy.table.empty}
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="register" pt="lg">
          <Title order={2} size="h4">
            {copy.form.title}
          </Title>
          <Stack component="form" onSubmit={submit} gap="md" mt="xs" maw={440}>
            <TextInput
              label={copy.form.nameLabel}
              placeholder={copy.form.namePlaceholder}
              value={form.fullName}
              error={errors.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.currentTarget.value })}
            />
            <TextInput
              label={copy.form.languageLabel}
              value={form.language}
              error={errors.language}
              onChange={(event) => setForm({ ...form, language: event.currentTarget.value })}
            />
            <TextInput
              label={copy.form.urlLabel}
              value={form.url}
              error={errors.url}
              onChange={(event) => setForm({ ...form, url: event.currentTarget.value })}
            />
            <DatePickerInput
              id="date"
              label={copy.form.dateLabel}
              placeholder={copy.form.datePlaceholder}
              value={form.date === '' ? null : form.date}
              error={errors.date}
              onChange={(value) => setForm({ ...form, date: value ?? '' })}
            />
            <Button type="submit" w="fit-content">
              {copy.form.submit}
            </Button>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title={copy.dialog.title}
        closeButtonProps={{ 'aria-label': copy.dialog.close }}
      >
        <Text fw={700}>{selected?.fullName}</Text>
        <Text>{selected?.description}</Text>
        <Text size="sm" c="dimmed">
          {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setSelected(null)}>
            {copy.dialog.close}
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
