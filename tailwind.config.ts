import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3763e0",
          600: "#2c50c2",
          700: "#233f9b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
