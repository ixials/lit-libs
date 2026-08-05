/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ll-blue": "#0055FF",
        "ll-sky": "#00B2FF",
        "ll-pink": "#FCD7E9",
      },
      fontFamily: {
        display: ["Lazydog", "ui-rounded", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
