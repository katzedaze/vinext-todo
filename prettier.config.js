/** @type {import("prettier").Config} */
export default {
  printWidth: 110,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./app/globals.css",
  tailwindFunctions: ["cn", "cva"],
};
