import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import { App } from './App';

/** テーマは既定の ConfigProvider のみ。配色や角丸は手で調整しない (既定値のみルール)。 */
function Root() {
  const [dark, setDark] = useState(false);
  return (
    <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      {/* message API は App でラップしないと使えない (v5 以降の公式作法) */}
      <AntApp>
        <App dark={dark} onToggleDark={() => setDark(!dark)} />
      </AntApp>
    </ConfigProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
