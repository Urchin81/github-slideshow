import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        portiere: "#f4b942",
        difensore: "#4ea8de",
        centrocampista: "#5cb85c",
        attaccante: "#e05263",
      },
    },
  },
  plugins: [],
};

export default config;
