/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/components/**/*.{js,jsx,mdx}", "./src/app/**/*.{js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Glass-cockpit palette (night avionics conventions:
        // cyan = selectable, magenta = active, green = OK/live, amber = caution, red = warning).
        av: {
          bg: "#04070c",
          panel: "#0a1019",
          panel2: "#0e1621",
          bezel: "#1a2636",
          line: "#233247",
          text: "#e4ecf5",
          dim: "#8b9db3",
          mute: "#55677d",
          cyan: "#3ddcf5",
          magenta: "#e64cf6",
          green: "#3ee08a",
          amber: "#ffb224",
          red: "#ff4d5e",
        },
      },
      fontFamily: {
        avsans: ["var(--font-b612)", "system-ui", "sans-serif"],
        avmono: ["var(--font-b612-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
