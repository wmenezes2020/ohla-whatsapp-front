import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
    },
  },
  plugins: [],
};

export default config;
