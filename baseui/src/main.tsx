import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toast } from '@base-ui/react/toast';
import './style.css';
import { App, AppToasts } from './App';

/**
 * Base UI も見た目を持たないので、テーマという仕組み自体がない。
 * ダークモードは class を付け替えて CSS 変数を差し替える (自分で書く)。
 * トーストは Provider の中でしか出せないため、ここで全体を包む。
 */
function Root() {
  const [dark, setDark] = useState(false);
  return (
    <div className={dark ? 'dark' : ''}>
      <Toast.Provider>
        <App dark={dark} onToggleDark={() => setDark(!dark)} />
        <Toast.Portal>
          <Toast.Viewport className="toast-viewport">
            <AppToasts />
          </Toast.Viewport>
        </Toast.Portal>
      </Toast.Provider>
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
