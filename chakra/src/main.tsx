import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { App } from './App';

/**
 * テーマは既定の defaultSystem のみ。配色や角丸は手で調整しない (既定値のみルール)。
 *
 * ダークモードは公式が案内している「dark / light の class 名で切り替える」方式を使う。
 * 公式手順では next-themes を足す形も紹介されているが、class を付けるだけで足りるため
 * 依存は増やしていない (どちらも公式ドキュメントに載っている手段)。
 */
function Root() {
  const [dark, setDark] = useState(false);
  return (
    <ChakraProvider value={defaultSystem}>
      <div className={dark ? 'dark' : 'light'}>
        <App dark={dark} onToggleDark={() => setDark(!dark)} />
      </div>
    </ChakraProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
