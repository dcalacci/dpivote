/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,svelte}'],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: ["lofi"],
    base: true,
    styled: true,
    utils: true,
  },
  plugins: [require("daisyui")],
}