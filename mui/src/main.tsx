import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { App } from './App';

/** テーマ切替は既定の createTheme のみ。配色や角丸は手で調整しない (既定値のみルール)。 */
function Root() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <App mode={mode} onToggleMode={() => setMode(mode === 'light' ? 'dark' : 'light')} />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
