/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core dark navy ramp — the platform's ground.
        navy: {
          950: '#0a0e27',
          900: '#0f1229',
          850: '#11152f',
          800: '#141a3a',
          700: '#1b2350',
          600: '#242e63',
          500: '#2f3b7d',
        },
        // Gold / amber accent for highlights and CTAs.
        gold: {
          400: '#ffd54f',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ff9800',
        },
        ink: {
          100: '#f4f6ff',
          200: '#d8ddf5',
          300: '#a8b0d8',
          400: '#7d86b4',
          500: '#5c6491',
        },
        court: {
          low: '#1b2350',
          mid: '#ff9800',
          high: '#ffc107',
        },
        positive: '#3ddc97',
        caution: '#ffb300',
        negative: '#ff5d6c',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(255,193,7,0.35), 0 12px 32px -12px rgba(255,152,0,0.45)',
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
        'panel-grad': 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 60%)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.28s ease-out both',
        'toast-in': 'toast-in 0.22s ease-out both',
      },
    },
  },
  plugins: [],
};
