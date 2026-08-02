import { AnimatedList } from '@/components/magicui/animated-list';
import { AuroraText } from '@/components/magicui/aurora-text';
import { BorderBeam } from '@/components/magicui/border-beam';
import { DotPattern } from '@/components/magicui/dot-pattern';
import { Marquee } from '@/components/magicui/marquee';
import { Meteors } from '@/components/magicui/meteors';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { TypingAnimation } from '@/components/magicui/typing-animation';
import { cn } from '@/lib/utils';

/**
 * Magic UI の演出デモ (第8回・別枠)。
 *
 * このシリーズの共通デモ (9要件) は作らない。Magic UI の 77 部品はすべて演出系で、
 * 表・タブ・選択・入力欄を1つも持たないため、同じ画面を作ると中身がほぼ自作になり
 * 「同じ条件で比べた」と言えなくなる。代わりに**この層が何をするか**を見せる。
 *
 * 部品は公式 registry から取り込んだもの (shadcn と同じ方式)。無料の範囲のみ。
 */
const LOGOS = ['React', 'Next.js', 'Vite', 'Astro', 'Remix', 'Nuxt', 'Svelte', 'Solid'];

const NOTICES = [
  { icon: '🎉', title: '新しいリリース', body: 'v1.6.7 が公開されました' },
  { icon: '⭐', title: 'スターが増えました', body: '21,767 件に到達' },
  { icon: '📦', title: '部品を追加', body: '77 種類が無料で使えます' },
  { icon: '⚡', title: 'ビルド完了', body: '98 ミリ秒で終わりました' },
];

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function App() {
  return (
    <div className="relative min-h-screen overflow-hidden px-10 py-10">
      <DotPattern className="opacity-40 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]" />

      <header className="relative mb-10">
        <h1 className="text-5xl font-bold tracking-tight">
          <AuroraText>Magic UI</AuroraText> の演出
        </h1>
        <p className="mt-3 text-lg text-zinc-400">
          <TypingAnimation duration={60} className="text-lg font-normal text-zinc-400">
            77 の部品はすべて「動き」。表もタブも入力欄も持ちません。
          </TypingAnimation>
        </p>
      </header>

      <div className="relative grid grid-cols-3 gap-6">
        <Card className="col-span-1">
          <p className="mb-2 text-sm text-zinc-500">流れる帯 (Marquee)</p>
          <Marquee pauseOnHover className="[--duration:14s]">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="mx-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm"
              >
                {name}
              </span>
            ))}
          </Marquee>
          <BorderBeam size={140} duration={8} />
        </Card>

        <Card className="col-span-1">
          <p className="mb-2 text-sm text-zinc-500">数字が回る (NumberTicker)</p>
          <div className="text-6xl font-bold tabular-nums">
            <NumberTicker value={21767} />
          </div>
          <p className="mt-2 text-sm text-zinc-400">GitHub のスター数</p>
        </Card>

        <Card className="col-span-1 flex items-center justify-center">
          <ShimmerButton className="shadow-2xl">
            <span className="text-base font-medium">光るボタン</span>
          </ShimmerButton>
        </Card>

        <Card className="col-span-2 h-96">
          <p className="mb-2 text-sm text-zinc-500">積み上がる通知 (AnimatedList)</p>
          <AnimatedList delay={1200}>
            {NOTICES.map((n) => (
              <div
                key={n.title}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <span className="text-2xl">{n.icon}</span>
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-zinc-400">{n.body}</p>
                </div>
              </div>
            ))}
          </AnimatedList>
        </Card>

        <Card className="col-span-1 h-96">
          <p className="mb-2 text-sm text-zinc-500">流れ星 (Meteors)</p>
          <Meteors number={20} />
          <div className="relative flex h-full items-center justify-center">
            <span className="text-3xl font-bold text-zinc-300">背景の演出</span>
          </div>
        </Card>
      </div>

      <footer className="relative mt-10 text-sm text-zinc-500">
        取り込んだ部品 9 種類 / 928 行。すべて公式 registry から無料で取得したもの。
      </footer>
    </div>
  );
}
