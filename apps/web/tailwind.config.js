/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        cream: {
          DEFAULT: "#f8fafc",
          dark: "#f1f5f9",
        },
        accent: {
          teal: "#0d9488",
          cyan: "#0891b2",
          darkTeal: "#0f766e",
          purple: "#7c3aed",
          pink: "#db2777",
          orange: "#ea580c",
        },
        darkBg: "#0b0f1a",
        darkCard: "#111827",
        darkBorder: "#1e293b",
      },
      boxShadow: {
        'neo': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'neo-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'neo-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow-teal': '0 0 20px rgba(13, 148, 136, 0.4)',
        'glow-blue': '0 0 20px rgba(8, 145, 178, 0.4)',
      },
      borderRadius: {
        'neo': '0.75rem',
        'neo-sm': '0.5rem',
        'neo-md': '1rem',
        'neo-lg': '1.5rem',
        'neo-xl': '2rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '3rem',
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
};

