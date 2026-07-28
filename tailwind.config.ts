import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#EEF2EE",       // pale sage-white — laundry-line air, not the AI-default cream
        ink: "#12202A",          // near-black teluk blue for text
        bay: {
          DEFAULT: "#1D6F8C",
          deep: "#0F3D4D",
          light: "#5FA3BC",
        },
        bridge: {
          DEFAULT: "#F5B324",    // Jembatan Kuning yellow — Palu's own landmark
          soft: "#FBD98A",
        },
        wa: "#25D366",           // used ONLY on functional WhatsApp actions
        line: "#D7DED7",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(18,32,42,0.06), 0 8px 24px -12px rgba(18,32,42,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
