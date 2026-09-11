/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fpm: {
          navy: '#0A192F',
          royal: '#1E3A8A',
          blue: '#2563EB',
          gold: '#D97706',
          amber: '#F59E0B',
          slate: '#F8FAFC',
          card: '#FFFFFF',
          text: '#0F172A',
          muted: '#64748B'
        }
      }
    },
  },
  plugins: [],
}
