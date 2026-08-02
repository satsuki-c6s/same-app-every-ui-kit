import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
// 読み込み順は公式指定。core のあとに dates・notifications を置く。
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { App } from './App';

/** テーマは既定の MantineProvider のみ。配色や角丸は手で調整しない (既定値のみルール)。 */
function Root() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="bottom-right" />
      <App />
    </MantineProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="light" />
    <Root />
  </StrictMode>,
);
