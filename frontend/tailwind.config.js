/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: {
          DEFAULT: '#070D1E',
          card: '#0E1B38',
          cardHover: '#132247',
          panel: '#0B152B',
          border: 'rgba(56, 189, 248, 0.18)',
        },
        ink: {
          DEFAULT: '#1B2540',
          navy: '#1B2540',
          muted: '#8A99B5',
        },
        paper: {
          DEFAULT: '#F2F4F7',
          cool: '#F2F4F7',
          light: '#F8F9FB',
        },
        gold: {
          DEFAULT: '#F5B800',
          hover: '#E5AB00',
          light: '#FFF0C2',
        },
        highlighter: {
          DEFAULT: '#FFD93D',
          hover: '#F5CE2B',
        },
        verified: {
          DEFAULT: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.35)',
        },
        confirm: {
          DEFAULT: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
        },
        notstated: {
          DEFAULT: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.35)',
        },
      },
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Noto Sans Devanagari"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        panel: '8px',
        card: '12px',
      },
      boxShadow: {
        'neon-blue': '0 0 50px -10px rgba(56, 189, 248, 0.35), 0 0 80px -20px rgba(99, 102, 241, 0.3)',
        'neon-card': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(56, 189, 248, 0.2)',
      },
    },
  },
  plugins: [],
}
