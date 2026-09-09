import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings, type BrightnessLevel, type ContrastLevel } from '@/context/SettingsContext';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true, glyph: <GlyphGrid /> },
  { to: '/history', label: 'History', end: false, glyph: <GlyphList /> },
  { to: '/compare', label: 'Compare', end: false, glyph: <GlyphCompare /> },
  { to: '/player', label: 'Player', end: false, glyph: <GlyphUser /> },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-backdrop min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg
                   focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-950"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-navy-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 lg:px-8">
          <Wordmark />

          <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60',
                    isActive
                      ? 'bg-white/[0.07] text-gold-500'
                      : 'text-ink-300 hover:bg-white/[0.04] hover:text-ink-100',
                  )
                }
              >
                <span aria-hidden>{item.glyph}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DisplayMenu />
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
              className="btn-ghost !px-2.5 md:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {navOpen && (
          <nav aria-label="Primary mobile" className="animate-fade-up border-t border-white/[0.07] px-4 py-2 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold',
                    isActive ? 'text-gold-500' : 'text-ink-300',
                  )
                }
              >
                <span aria-hidden>{item.glyph}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
        {children}
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 lg:px-8">
        <p className="border-t border-white/[0.06] pt-5 text-xs text-ink-500">
          Luma Vision · AI-assisted analysis of BWF match footage. Figures are model estimates —
          review against video before making coaching decisions.
        </p>
      </footer>
    </div>
  );
}

function Wordmark() {
  return (
    <NavLink to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Luma Vision home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-grad text-navy-950 shadow-glow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 9.4L5 2.5M9 9.4l4-6.9M9 9.4V2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="hidden sm:block">
        <span className="block text-sm font-bold leading-tight tracking-tight text-ink-100">
          Luma Vision
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
          Match Analyzer
        </span>
      </span>
    </NavLink>
  );
}

/** Brightness / contrast controls — the "dark mode with levels" requirement. */
function DisplayMenu() {
  const [open, setOpen] = useState(false);
  const { brightness, contrast, reduceMotion, setBrightness, setContrast, toggleReduceMotion, reset } =
    useSettings();

  const brightnessOptions: BrightnessLevel[] = ['dim', 'balanced', 'bright'];
  const contrastOptions: ContrastLevel[] = ['soft', 'standard', 'high'];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ghost !px-2.5"
        title="Display settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="sr-only">Display settings</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Display settings"
            className="absolute right-0 top-full z-50 mt-2 w-64 animate-fade-up rounded-xl border border-white/10
                       bg-navy-900/97 p-4 shadow-panel backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Brightness</p>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {brightnessOptions.map((level) => (
                <OptionButton
                  key={level}
                  label={level}
                  active={brightness === level}
                  onClick={() => setBrightness(level)}
                />
              ))}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">Contrast</p>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {contrastOptions.map((level) => (
                <OptionButton
                  key={level}
                  label={level}
                  active={contrast === level}
                  onClick={() => setContrast(level)}
                />
              ))}
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-xs text-ink-300">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={toggleReduceMotion}
                className="h-4 w-4 rounded border-white/20 bg-navy-950 accent-gold-500"
              />
              Reduce motion
            </label>

            <button type="button" onClick={reset} className="btn-ghost mt-4 w-full !py-1.5 text-xs">
              Reset to defaults
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function OptionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg px-2 py-1.5 text-[11px] font-semibold capitalize transition-colors',
        active ? 'bg-gold-grad text-navy-950' : 'bg-white/[0.05] text-ink-300 hover:text-ink-100',
      )}
    >
      {label}
    </button>
  );
}

function GlyphGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function GlyphList() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3.5h7.5M5 7h7.5M5 10.5h7.5M1.8 3.5h.01M1.8 7h.01M1.8 10.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GlyphCompare() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="4.5" width="4" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function GlyphUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.4 12c.7-2.2 2.5-3.4 4.6-3.4S10.9 9.8 11.6 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
