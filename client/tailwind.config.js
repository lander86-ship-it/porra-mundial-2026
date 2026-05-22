/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fifa: {
          blue: '#1a4785',
          red: '#c8102e',
          gold: '#f5a623',
        }
      }
    },
  },
  plugins: [],
}
