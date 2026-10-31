/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pure Apple Black & White Monochromatic Palette
        black: '#000000',
        white: '#FFFFFF',
        apple: {
          bg: '#FBFBFD',
          card: '#FFFFFF',
          subtle: '#F5F5F7',
          hover: '#E8E8ED',
          border: 'rgba(0, 0, 0, 0.08)',
          'border-strong': 'rgba(0, 0, 0, 0.16)',
          dark: '#1D1D1F',
          muted: '#86868B',
          secondary: '#6E6E73'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'apple-card': '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'apple-lift': '0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'apple-modal': '0 24px 60px rgba(0, 0, 0, 0.15)'
      }
    },
  },
  plugins: [],
}
