import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
        },
        brand: {
          50: '#eefdf3',
          100: '#d6f9e1',
          200: '#aff1c6',
          300: '#79e3a4',
          400: '#3fcc7d',
          500: '#1bb463',
          600: '#0f9150',
          700: '#0d7342',
          800: '#0f5b37',
          900: '#0d4b2f',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 hsl(var(--shadow-color) / 0.04), 0 1px 6px -1px hsl(var(--shadow-color) / 0.06)',
        card: '0 1px 3px 0 hsl(var(--shadow-color) / 0.06), 0 8px 24px -12px hsl(var(--shadow-color) / 0.10)',
        glow: '0 0 0 1px hsl(var(--primary) / 0.12), 0 8px 30px -8px hsl(var(--primary) / 0.30)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
