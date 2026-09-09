import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type BrightnessLevel = 'dim' | 'balanced' | 'bright';
export type ContrastLevel = 'soft' | 'standard' | 'high';

export interface DisplaySettings {
  brightness: BrightnessLevel;
  contrast: ContrastLevel;
  /** Suppresses non-essential motion on top of the OS-level preference. */
  reduceMotion: boolean;
}

const DEFAULTS: DisplaySettings = {
  brightness: 'balanced',
  contrast: 'standard',
  reduceMotion: false,
};

const BRIGHTNESS_VALUES: Record<BrightnessLevel, number> = {
  dim: 0.86,
  balanced: 1,
  bright: 1.12,
};

const CONTRAST_VALUES: Record<ContrastLevel, number> = {
  soft: 0.94,
  standard: 1,
  high: 1.08,
};

interface SettingsContextValue extends DisplaySettings {
  setBrightness: (level: BrightnessLevel) => void;
  setContrast: (level: ContrastLevel) => void;
  toggleReduceMotion: () => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * The app is dark-only by design; rather than a light theme, users get
 * luminance and contrast controls that adapt the dark palette to the room —
 * a broadcast truck is a very different lighting environment from an office.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<DisplaySettings>(
    'luma-vision:display:v1',
    DEFAULTS,
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-brightness', String(BRIGHTNESS_VALUES[settings.brightness] ?? 1));
    root.style.setProperty('--app-contrast', String(CONTRAST_VALUES[settings.contrast] ?? 1));
    root.dataset['reduceMotion'] = settings.reduceMotion ? 'true' : 'false';
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setBrightness: (brightness) => setSettings((s) => ({ ...s, brightness })),
      setContrast: (contrast) => setSettings((s) => ({ ...s, contrast })),
      toggleReduceMotion: () => setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion })),
      reset: () => setSettings(DEFAULTS),
    }),
    [settings, setSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>.');
  return ctx;
}
