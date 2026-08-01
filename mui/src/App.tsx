import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
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
  mode: 'light' | 'dark';
  onToggleMode: () => void;
}

/** MUI (Community) 版。ロジックは shared/logic.ts と共有し、ここでは UI だけを書く。 */
export function App({ mode, onToggleMode }: AppProps) {
  const [tab, setTab] = useState(0);
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
      setToast({ tone: 'error', text: copy.toast.error });
      return;
    }
    setToast({ tone: 'success', text: copy.toast.success });
    setForm(EMPTY_FORM);
  };

  const sortLabel = (key: SortKey, label: string) => (
    <TableSortLabel
      active={sort.key === key}
      direction={sort.key === key ? sort.dir : 'desc'}
      onClick={() => setSort((current) => nextSort(current, key))}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {copy.app.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.app.subtitle}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={onToggleMode}>
          {mode === 'dark' ? copy.theme.toLight : copy.theme.toDark}
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ mt: 3 }}>
        <Tab label={copy.tabs.list} />
        <Tab label={copy.tabs.register} />
      </Tabs>

      {tab === 0 ? (
        <Box sx={{ mt: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 720 }}>
            <TextField
              type="search"
              label={copy.search.label}
              placeholder={copy.search.placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              fullWidth
            />
            <Autocomplete
              options={languages}
              value={languageLabel}
              onChange={(_, value) =>
                setLanguage(value === null || value === copy.filter.all ? ALL_LANGUAGES : value)
              }
              noOptionsText={copy.filter.empty}
              sx={{ minWidth: 240 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={copy.filter.label}
                  placeholder={copy.filter.placeholder}
                />
              )}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </Typography>

          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <caption style={{ position: 'absolute', left: -9999 }}>{copy.table.sortHint}</caption>
              <TableHead>
                <TableRow>
                  <TableCell>{sortLabel('fullName', copy.table.columnName)}</TableCell>
                  <TableCell>{sortLabel('language', copy.table.columnLanguage)}</TableCell>
                  <TableCell align="right">{sortLabel('stars', copy.table.columnStars)}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((item) => (
                  <TableRow key={item.fullName} hover>
                    <TableCell>
                      <Button
                        variant="text"
                        sx={{ p: 0, minWidth: 0, textTransform: 'none' }}
                        onClick={() => setSelected(item)}
                      >
                        {item.fullName}
                      </Button>
                      <Typography variant="caption" component="p" color="text.secondary">
                        {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.language}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatStars(item.stars)}
                    </TableCell>
                  </TableRow>
                ))}
                {shown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {copy.table.empty}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            {copy.form.title}
          </Typography>
          <Stack
            component="form"
            onSubmit={submit}
            noValidate
            spacing={2}
            sx={{ mt: 1, maxWidth: 440 }}
          >
            <TextField
              label={copy.form.nameLabel}
              placeholder={copy.form.namePlaceholder}
              value={form.fullName}
              error={Boolean(errors.fullName)}
              helperText={errors.fullName ?? ' '}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            />
            <TextField
              label={copy.form.languageLabel}
              value={form.language}
              error={Boolean(errors.language)}
              helperText={errors.language ?? ' '}
              onChange={(event) => setForm({ ...form, language: event.target.value })}
            />
            <TextField
              label={copy.form.urlLabel}
              value={form.url}
              error={Boolean(errors.url)}
              helperText={errors.url ?? ' '}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
            />
            <DatePicker
              label={copy.form.dateLabel}
              value={form.date === '' ? null : dayjs(form.date)}
              onChange={(value) =>
                setForm({ ...form, date: value === null ? '' : value.format('YYYY-MM-DD') })
              }
              slotProps={{
                textField: {
                  id: 'date',
                  error: Boolean(errors.date),
                  helperText: errors.date ?? ' ',
                },
              }}
            />
            <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>
              {copy.form.submit}
            </Button>
          </Stack>
        </Box>
      )}

      <Dialog open={selected !== null} onClose={() => setSelected(null)}>
        <DialogTitle>{copy.dialog.title}</DialogTitle>
        <DialogContent>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{selected?.fullName}</Typography>
            <Typography>{selected?.description}</Typography>
            <Typography variant="body2" color="text.secondary">
              {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>{copy.dialog.close}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setToast(null)}
      >
        <Alert severity={toast?.tone ?? 'success'} variant="filled">
          {toast?.text}
        </Alert>
      </Snackbar>
    </Container>
  );
}
