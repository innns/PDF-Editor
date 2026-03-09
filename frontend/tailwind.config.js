/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0f1720",
          900: "#16212c",
          800: "#213242",
          700: "#2f485b"
        },
        paper: {
          50: "#f8f4ea",
          100: "#f1e6d2",
          200: "#dcc7a6"
        },
        ember: {
          400: "#ff8a4c",
          500: "#ff6a3d",
          600: "#eb4d2d"
        },
        tide: {
          300: "#8ecbd1",
          400: "#57afb8",
          500: "#2f8d98"
        },
        moss: {
          400: "#7e9a65",
          500: "#5d7b48"
        }
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        display: ["Baskerville", "Iowan Old Style", "serif"]
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};
