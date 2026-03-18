/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d9488',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          500: '#0d9488',
          600: '#0f766e',
        },
        dark: {
          DEFAULT: '#0f172a',
          2: '#64748b',
          3: '#94a3b8',
          4: '#475569',
        },
        body: '#334155',
        'gray-next': {
          DEFAULT: '#f8fafc',
          2: '#f1f5f9',
          3: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        box: '0px 8px 30px -8px rgba(15, 23, 42, 0.06), 0px 1px 5px 0px rgba(0, 0, 0, 0.04)',
        'next-2': '0px 4px 12px 0px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
