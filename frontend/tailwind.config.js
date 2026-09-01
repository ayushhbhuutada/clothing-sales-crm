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
          50: '#fbf7f4',
          100: '#f5ede6',
          200: '#ebd9cb',
          300: '#ddbea7',
          400: '#cb9e80',
          500: '#b87d5c',
          600: '#a36447',
          700: '#874f38',
          800: '#6f4130',
          900: '#5c382b',
          950: '#321c15',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ring-shake': 'ring 0.6s ease-in-out infinite alternate',
      },
      keyframes: {
        ring: {
          '0%': { transform: 'rotate(-10deg) scale(1.05)' },
          '100%': { transform: 'rotate(10deg) scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}
