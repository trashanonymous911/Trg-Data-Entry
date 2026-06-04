/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ndrf: {
          blue:      '#002060',
          lightblue: '#0057b8',
          accent:    '#eef2ff',
          gold:      '#e6a817',
        }
      },
      screens: {
        sm: '640px',
      }
    },
  },
  plugins: [],
}
