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
        // 전체 UI에서 쓰는 중립색: 아주 옅은 회색 (slate-* 클래스가 전부 이 값을 사용)
        slate: {
          50: "#FAFAF9",
          100: "#F4F4F3",
          200: "#E7E6E4",
          300: "#D3D1CD",
          400: "#A8A6A0",
          500: "#78766F",
          600: "#57554F",
          700: "#44423C",
          800: "#2C2A26",
          900: "#1C1B18",
        },
      },
    },
  },
  plugins: [],
};

export default config;
