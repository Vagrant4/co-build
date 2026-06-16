import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        steel: "#3f454b",
        smoke: "#f4f4f1",
        safety: "#f5b400",
        hazard: "#ff6a00"
      },
      boxShadow: {
        hard: "0 10px 30px rgba(17, 17, 17, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
