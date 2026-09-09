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
        // 전체 UI에서 쓰는 중립색을 옅은 베이지 톤으로 교체 (slate-* 클래스가 전부 이 값을 사용)
        slate: {
          50: "#F7F3EA",
          100: "#F0E9D9",
          200: "#E4DAC3",
          300: "#D2C4A4",
          400: "#B3A282",
          500: "#8C7C5E",
          600: "#6B5D45",
          700: "#4C4130",
          800: "#332B1F",
          900: "#211B12",
        },
      },
    },
  },
  plugins: [],
};

export default config;
