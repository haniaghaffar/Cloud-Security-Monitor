/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Primary professional blue accent
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          canvas: '#f8fafc', // subtle slate-50 background
          card: '#ffffff',   // clean white cards
          sidebar: '#ffffff',
          topbar: '#ffffff',
          border: '#e2e8f0', // slate-200 border
          hover: '#f1f5f9',  // slate-100 hover
        },
        typography: {
          heading: '#0f172a', // slate-900 dark readable text
          body: '#334155',    // slate-700
          muted: '#64748b',   // slate-500
          subtle: '#94a3b8',  // slate-400
        },
        status: {
          critical: {
            bg: '#fef2f2',
            text: '#b91c1c',
            border: '#fecaca',
          },
          high: {
            bg: '#fff7ed',
            text: '#c2410c',
            border: '#fed7aa',
          },
          medium: {
            bg: '#fefce8',
            text: '#a16207',
            border: '#fef08a',
          },
          low: {
            bg: '#eff6ff',
            text: '#1d4ed8',
            border: '#bfdbfe',
          },
          success: {
            bg: '#f0fdf4',
            text: '#15803d',
            border: '#bbf7d0',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
