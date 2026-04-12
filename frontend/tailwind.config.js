/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#1A8A3C',
          800: '#166534',
          900: '#14532d',
        },
        brand: '#1A8A3C',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Sora', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'green-sm': '0 2px 8px rgba(26,138,60,0.08)',
        'green-md': '0 8px 32px rgba(26,138,60,0.14)',
        'green-lg': '0 24px 64px rgba(26,138,60,0.18)',
      },
    },
  },
  plugins: [],
}
