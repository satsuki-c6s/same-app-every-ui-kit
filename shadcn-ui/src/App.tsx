import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const data = rawData as RepoData;

const EMPTY_FORM: FormValues = { fullName: '', language: '', url: '', date: '' };

/** Date を YYYY-MM-DD にする (地方時基準。toISOString は UTC でずれる)。 */
function toISODate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** shadcn/ui 版。ロジックは shared/logic.ts と共有し、ここでは UI だけを書く。 */
export function App() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [comboOpen, setComboOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'stars', dir: 'desc' });
  const [selected, setSelected] = useState<Repo | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

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
      toast.error(copy.toast.error);
      return;
    }
    toast.success(copy.toast.success);
    setForm(EMPTY_FORM);
  };

  const sortButton = (key: SortKey, label: string) => (
    <Button variant="ghost" size="sm" onClick={() => setSort((c) => nextSort(c, key))}>
      {label}
      {sort.key === key ? <span aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span> : null}
    </Button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{copy.app.title}</h1>
          <p className="text-muted-foreground text-sm">{copy.app.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? copy.theme.toLight : copy.theme.toDark}
        </Button>
      </header>

      <Tabs defaultValue="list" className="mt-6">
        <TabsList>
          <TabsTrigger value="list">{copy.tabs.list}</TabsTrigger>
          <TabsTrigger value="register">{copy.tabs.register}</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="search">{copy.search.label}</Label>
              <Input
                id="search"
                type="search"
                value={query}
                placeholder={copy.search.placeholder}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="language-combo">{copy.filter.label}</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="language-combo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="justify-between font-normal"
                  >
                    {languageLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder={copy.filter.placeholder} />
                    <CommandList>
                      <CommandEmpty>{copy.filter.empty}</CommandEmpty>
                      <CommandGroup>
                        {languages.map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={() => {
                              setLanguage(name === copy.filter.all ? ALL_LANGUAGES : name);
                              setComboOpen(false);
                            }}
                          >
                            {name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <p className="text-muted-foreground mt-4 text-sm">
            {formatSummary(copy.summary.template, data.items.length, shown.length)}
          </p>

          <Table className="mt-2">
            <TableCaption className="sr-only">{copy.table.sortHint}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{sortButton('fullName', copy.table.columnName)}</TableHead>
                <TableHead>{sortButton('language', copy.table.columnLanguage)}</TableHead>
                <TableHead className="text-right">
                  {sortButton('stars', copy.table.columnStars)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((item) => (
                <TableRow key={item.fullName}>
                  <TableCell>
                    <Button variant="link" className="h-auto p-0" onClick={() => setSelected(item)}>
                      {item.fullName}
                    </Button>
                    <p className="text-muted-foreground text-xs">{item.description}</p>
                  </TableCell>
                  <TableCell>{item.language}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatStars(item.stars)}
                  </TableCell>
                </TableRow>
              ))}
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                    {copy.table.empty}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="register">
          <h2 className="mt-4 text-lg font-semibold">{copy.form.title}</h2>
          <form onSubmit={submit} noValidate className="mt-2 grid max-w-md gap-4">
            <Field
              id="fullName"
              label={copy.form.nameLabel}
              error={errors.fullName}
              value={form.fullName}
              placeholder={copy.form.namePlaceholder}
              onChange={(value) => setForm({ ...form, fullName: value })}
            />
            <Field
              id="language"
              label={copy.form.languageLabel}
              error={errors.language}
              value={form.language}
              onChange={(value) => setForm({ ...form, language: value })}
            />
            <Field
              id="url"
              label={copy.form.urlLabel}
              error={errors.url}
              value={form.url}
              onChange={(value) => setForm({ ...form, url: value })}
            />

            <div className="grid gap-1.5">
              <Label htmlFor="date">{copy.form.dateLabel}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    type="button"
                    variant="outline"
                    aria-invalid={errors.date ? true : undefined}
                    className="justify-start font-normal"
                  >
                    {form.date === '' ? copy.form.datePlaceholder : form.date}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.date === '' ? undefined : new Date(`${form.date}T00:00:00`)}
                    onSelect={(value) => {
                      if (value) setForm({ ...form, date: toISODate(value) });
                      setCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              {errors.date ? (
                <p className="text-destructive text-sm font-medium">{errors.date}</p>
              ) : null}
            </div>

            <Button type="submit" className="justify-self-start">
              {copy.form.submit}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.dialog.title}</DialogTitle>
            <DialogDescription>{selected?.fullName}</DialogDescription>
          </DialogHeader>
          <p>{selected?.description}</p>
          <p className="text-muted-foreground text-sm">
            {selected?.language} ／ {selected ? formatStars(selected.stars) : ''}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function Field({ id, label, value, error, placeholder, onChange }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}
    </div>
  );
}
