import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <App />
      <Toaster />
    </ThemeProvider>
  </StrictMode>,
);
