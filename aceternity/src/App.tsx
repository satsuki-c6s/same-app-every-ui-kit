import { AnimatedTooltip } from '@/components/ui/animated-tooltip';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { CardBody, CardContainer, CardItem } from '@/components/ui/3d-card';
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards';
import { Meteors } from '@/components/ui/meteors';
import { Button as MovingBorderButton } from '@/components/ui/moving-border';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { TypewriterEffect } from '@/components/ui/typewriter-effect';

/**
 * Aceternity UI の演出デモ (第11回・別枠)。
 *
 * このシリーズの共通デモ (9要件) は作らない。第8回 Magic UI と同じ判断で、
 * 部品が演出系に寄っており、表・タブ・選択・入力欄の比較にならないため。
 *
 * さらにこの回はもう1つ事情がある: Aceternity UI は OSS ではない
 * (公式リポジトリ・OSS ライセンスが無く、独自ライセンスでソースの再配布を禁じている)。
 * そのため取り込んだ部品ソース (src/components/ui/) は .gitignore で除外し、
 * リポジトリには**入れていない**。取得方法は README.md 参照。
 */
const QUOTES = [
  { quote: '流れるカードの部品です', name: 'Infinite Moving Cards', title: '帯のように循環する' },
  { quote: '演出は静止画では止まって見えます', name: '検証メモ', title: '録画で確認' },
  { quote: '部品ページは147件ありました', name: '実測 2026-08-04', title: 'sitemap から数えた' },
  { quote: 'ソースはコピーして取り込む方式です', name: 'registry', title: 'shadcn と同じ配布' },
];

/** AnimatedTooltip は画像必須なので、外部を参照しない自前のSVGアバターを渡す。 */
const avatar = (bg: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="${bg}"/><text x="40" y="52" font-size="32" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text></svg>`,
  )}`;

const PEOPLE = [
  { id: 1, name: 'Meteors', designation: '流れ星', image: avatar('#6366f1', 'M') },
  { id: 2, name: 'Aurora', designation: '背景', image: avatar('#0ea5e9', 'A') },
  { id: 3, name: 'Beams', designation: '光線', image: avatar('#10b981', 'B') },
  { id: 4, name: 'Typewriter', designation: '文字', image: avatar('#f59e0b', 'T') },
];

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function App() {
  return (
    <AuroraBackground className="min-h-screen items-start justify-start bg-zinc-950 text-zinc-100">
      <div className="relative z-10 w-full px-10 py-10">
        <header className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight">Aceternity UI の演出</h1>
          <TextGenerateEffect
            className="mt-3 font-normal"
            words="部品ページは147件。ただしこのソースは、リポジトリに置けません。"
          />
        </header>

        <div className="grid grid-cols-3 gap-6">
          <Panel className="col-span-2">
            <p className="mb-2 text-sm text-zinc-500">流れるカード (Infinite Moving Cards)</p>
            <InfiniteMovingCards items={QUOTES} direction="left" speed="fast" />
          </Panel>

          <Panel className="flex items-center justify-center">
            <MovingBorderButton
              borderRadius="1rem"
              className="border-zinc-800 bg-zinc-950 text-base font-medium text-zinc-100"
            >
              枠が走るボタン
            </MovingBorderButton>
          </Panel>

          <Panel className="h-80">
            <p className="mb-2 text-sm text-zinc-500">流れ星 (Meteors)</p>
            <Meteors number={20} />
            <div className="relative flex h-full items-center justify-center">
              <span className="text-3xl font-bold text-zinc-300">背景の演出</span>
            </div>
          </Panel>

          <Panel className="h-80 p-0">
            <CardContainer className="h-full" containerClassName="h-full py-0">
              <CardBody className="flex h-full w-full flex-col items-center justify-center gap-3">
                <CardItem translateZ={60} className="text-2xl font-bold">
                  3D カード
                </CardItem>
                <CardItem translateZ={90} className="rounded-lg border border-zinc-700 px-6 py-3">
                  マウスに合わせて傾く
                </CardItem>
                <CardItem translateZ={40} className="text-sm text-zinc-400">
                  取り込み 9 部品 / 1,005 行
                </CardItem>
              </CardBody>
            </CardContainer>
          </Panel>

          <Panel className="relative h-80">
            <p className="mb-2 text-sm text-zinc-500">光線 (Background Beams)</p>
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <TypewriterEffect
                words={[
                  { text: '無料でも、' },
                  { text: 'OSS', className: 'text-sky-400' },
                  { text: 'では、ない。' },
                ]}
              />
              <div className="mt-4 flex items-center justify-center">
                <AnimatedTooltip items={PEOPLE} />
              </div>
            </div>
            <BackgroundBeams />
          </Panel>
        </div>

        <footer className="relative mt-8 text-sm text-zinc-500">
          取り込んだ部品 9 種類 / 1,005 行。ライセンス上、この部品ソースはリポジトリに含めていません。
        </footer>
      </div>
    </AuroraBackground>
  );
}
