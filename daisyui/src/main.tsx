import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

/** テーマ切替は daisyUI 公式の data-theme 方式。既定の light / dark をそのまま使う。 */
function Root() {
  const [dark, setDark] = useState(false);
  return (
    <div data-theme={dark ? 'dark' : 'light'} className="min-h-screen bg-base-100">
      <App dark={dark} onToggleDark={() => setDark(!dark)} />
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
