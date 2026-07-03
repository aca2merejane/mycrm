/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bmh-orange': '#F59E0B', // Standard Orange
        'bmh-tosca': '#14B8A6',  // Standard Teal/Tosca
      }
    },
  },
  plugins: [],
}
