'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Reveal from '../components/Reveal';

const Globe = dynamic(() => import('@/components/Globe'), { ssr: false });

const FEATURES = [
  {
    title: 'Collect globally',
    desc: 'Accept payments in 40+ currencies with local virtual accounts — no need for a local entity.',
  },
  {
    title: 'Send in minutes',
    desc: 'Payouts settle in under 60 seconds across 30+ countries, direct bank-to-bank.',
  },
  {
    title: 'One simple API',
    desc: 'Plug in once and move money globally — no juggling multiple banking partners.',
  },
  {
    title: 'Transparent pricing',
    desc: 'Flat, predictable fees per transaction. No hidden FX markups.',
  },
];

/** 10 scroll-synced lines that pass through the center behind the globe */
const SCROLL_TEXTS = [
  'One network. Direct bank connections.',
  'Collect in 40+ currencies.',
  'Pay out in under 60 seconds.',
];

const TEXT_COUNT = SCROLL_TEXTS.length;
/** One viewport per text + 1 to bring earth to center + short hold before next section */
const TEXT_VH = TEXT_COUNT;
const REVEAL_VH = 1;
const HOLD_VH = 1.2;
const SCROLL_VH = TEXT_VH + REVEAL_VH + HOLD_VH;

export default function Home() {
  const trackRef = useRef<HTMLElement>(null);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [progress, setProgress] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [heroActive, setHeroActive] = useState(true);

  useEffect(() => {
    const viewportH = () => Math.round(window.visualViewport?.height ?? window.innerHeight);

    const syncTrackHeight = () => {
      const el = trackRef.current;
      if (!el) return;
      // px runway — same phase math on every device (avoids mobile 100vh bugs)
      el.style.height = `${SCROLL_VH * viewportH()}px`;
    };

    const markScrolling = () => {
      setIsScrolling(true);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => setIsScrolling(false), 160);
    };

    const onScroll = () => {
      const el = trackRef.current;
      if (!el) return;

      const vh = viewportH();
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);

      // Keep hero fixed while inside track; slide it up as the track ends
      const leave = Math.max(0, vh - rect.bottom);
      setExitY(leave);
      setHeroActive(rect.bottom > 0);

      markScrolling();
    };

    const onResize = () => {
      syncTrackHeight();
      onScroll();
    };

    syncTrackHeight();
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('touchmove', markScrolling, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('touchmove', markScrolling);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('scroll', onScroll);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  // Phase A: texts (0 → textPhaseEnd)
  // Phase B: earth rises to center (textPhaseEnd → revealPhaseEnd)
  // Phase C: hold centered + arcs (revealPhaseEnd → 1), then features unlock
  const textPhaseEnd = TEXT_VH / SCROLL_VH;
  const revealPhaseEnd = (TEXT_VH + REVEAL_VH) / SCROLL_VH;

  const textProgress = Math.min(1, progress / textPhaseEnd);
  const revealProgress =
    progress <= textPhaseEnd
      ? 0
      : Math.min(1, (progress - textPhaseEnd) / (revealPhaseEnd - textPhaseEnd));

  const textCursor = textProgress * TEXT_COUNT;
  const scrollRotY = progress * Math.PI * 3.2;
  const arcsEnabled = revealProgress > 0.92;
  const globeScale = 0.9 + revealProgress * 0.1;

  // r=0 → bottom peek (top past viewport + 10rem); r=1 → dead center — identical on all breakpoints
  const globeTop = `calc(${(1 - revealProgress) * 100 + revealProgress * 50}% + ${(1 - revealProgress) * 10}rem)`;

  return (
    <main className="relative">
      {/* ---------- NAV ---------- */}
      <nav className="flex fixed top-0 right-0 left-0 z-30 justify-between items-center px-6 py-6 md:px-10">
        <div className="flex gap-2 items-center text-sm font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_12px_2px_rgba(198,176,125,0.7)]" />
          AZZU NETWORK
        </div>
        <div className="hidden gap-8 text-sm md:flex text-muted">
          <a href="#product" className="transition hover:text-white">
            Product
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
          <a href="#docs" className="transition hover:text-white">
            Docs
          </a>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-black rounded-full transition bg-gold hover:bg-goldBright">
          Get started
        </button>
      </nav>

      {/* Tall scroll runway — height set in px via JS for mobile = desktop */}
      <section ref={trackRef} aria-label="Hero scroll track" />

      {/* Fixed hero pin — overflow OK if earth is large */}
      <div
        className="fixed inset-0 z-20 bg-[#06070a]"
        style={{
          transform: `translate3d(0, ${-exitY}px, 0)`,
          visibility: heroActive ? 'visible' : 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden={!heroActive}
      >
        {/* Texts behind the globe */}
        <div className="flex absolute inset-0 z-0 justify-center items-center px-5 sm:px-8">
          {SCROLL_TEXTS.map((line, i) => {
            const offset = i - textCursor;
            const abs = Math.abs(offset);
            const opacity =
              revealProgress > 0.15
                ? Math.max(0, 1 - abs) * Math.max(0, 1 - revealProgress * 1.4)
                : Math.max(0, 1 - abs * 0.85);
            const y = offset * 55;
            return (
              <p
                key={line}
                className="absolute  max-w-3xl text-center text-[clamp(1.25rem,5.5vw,1rem)] font-semibold leading-tight tracking-tight"
                style={{
                  opacity,
                  transform: `translateY(${y}vh)`,
                }}
              >
                {line}
              </p>
            );
          })}
        </div>

        {/* Globe — same motion on all sizes; may overflow viewport */}
        <div
          className="absolute left-1/2 z-10 aspect-square will-change-transform"
          style={{
            width: 'min(100vmax, 920px)',
            top: globeTop,
            transform: `translate(-50%, -50%) scale(${globeScale})`,
          }}
        >
          <Globe scrollRotY={scrollRotY} isScrolling={isScrolling} arcsEnabled={arcsEnabled} />
        </div>

        <div
          className="absolute inset-0 z-[5]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 25%, rgba(6,7,10,0.45) 70%, rgba(6,7,10,0.75) 100%)',
            opacity: 1 - revealProgress * 0.4,
          }}
        />
      </div>

      {/* ---------- FEATURES ---------- */}
      <section id="product" className="relative px-6 py-28 md:px-16 md:py-36">
        <Reveal>
          <h2 className="mb-16 max-w-xl text-3xl font-semibold md:text-5xl">
            Built for companies moving money at global scale.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="p-8 h-full rounded-2xl border border-line bg-panel/40">
                <h3 className="mb-3 text-xl font-semibold text-goldBright">{f.title}</h3>
                <p className="leading-relaxed text-muted">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- PRICING STRIP ---------- */}
      <section id="pricing" className="relative px-6 py-24 border-t md:px-16 border-line">
        <Reveal>
          <div className="flex flex-col gap-8 justify-between items-start md:flex-row md:items-center">
            <h2 className="max-w-md text-2xl font-semibold md:text-4xl">
              Transparent, volume-based pricing. No surprises.
            </h2>
            <div className="flex gap-10">
              <Stat label="STARTING AT" value="0.01%" big />
              <Stat label="PER TRANSACTION" value="0.30%" big />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative px-6 py-28 text-center border-t md:px-16 md:py-36 border-line">
        <Reveal>
          <h2 className="mb-6 text-3xl font-semibold md:text-5xl">Ready to move money globally?</h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mb-10 max-w-lg text-muted">
            Talk to our team and see how the network can plug into your product.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <button className="px-8 py-3 font-medium text-black rounded-full transition bg-gold hover:bg-goldBright">
            Book a demo
          </button>
        </Reveal>
      </section>

      <footer className="flex justify-between px-6 py-10 text-xs border-t md:px-16 border-line text-muted">
        <span>© {new Date().getFullYear()} Azzu Network</span>
        <span>Built with Next.js</span>
      </footer>
    </main>
  );
}

function Stat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div
        className={
          big ? 'text-3xl font-semibold text-goldBright' : 'text-xl font-semibold text-goldBright'
        }
      >
        {value}
      </div>
      <div className="mt-1 tracking-wide text-muted">{label}</div>
    </div>
  );
}
