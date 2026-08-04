import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { App } from './App';

/**
 * Ark UI も Radix と同じく見た目を持たないので、テーマという仕組み自体がない。
 * ダークモードは class を付け替えて CSS 変数を差し替える (自分で書く)。
 */
function Root() {
  const [dark, setDark] = useState(false);
  return (
    <div className={dark ? 'dark' : ''}>
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
