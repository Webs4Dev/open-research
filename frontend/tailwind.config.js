/** @type {import('tailwindcss').Config} */

// Design tokens from DESIGN.md. Components use these names only, never raw values.
const ink = { DEFAULT: "#15141F", muted: "#45435A", subtle: "#636178", faint: "#A4A2B6" };
const hairline = { DEFAULT: "rgba(21,20,31,0.08)", strong: "rgba(21,20,31,0.16)" };

// Category hues: solid for text/icons, soft (12% on white) for chip backgrounds.
const hue = (solid, soft) => ({ DEFAULT: solid, soft });

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F5FA",
        surface: {
          0: "#FFFFFF", // legacy alias of surface-1, still used by pages not yet rebuilt
          1: "#FFFFFF",
          2: "#EFEEF5",
          3: "#E5E3EE",
        },
        hairline,
        ink,
        accent: {
          DEFAULT: "#C8F55A",
          hover: "#BDEE45",
          press: "#ABDC30",
          ink: "#3D6B00",
          soft: "rgba(200,245,90,0.30)",
        },
        "on-accent": ink.DEFAULT,
        violet: hue("#6440E0", "#ECE8FB"),
        sky: hue("#08659C", "#E1ECF3"),
        mint: hue("#08704C", "#E1EEE9"),
        amber: hue("#965400", "#F2EAE0"),
        pink: hue("#B92C78", "#F7E6EF"),
        coral: hue("#B83D0E", "#F6E8E2"),
        red: hue("#C42828", "#F8E5E5"),

        // Legacy names, mapped onto the new tokens until each page is rebuilt.
        border: { DEFAULT: hairline.strong, strong: "rgba(21,20,31,0.24)", accent: "#3D6B00" },
        text: {
          primary: ink.DEFAULT,
          secondary: ink.muted,
          muted: ink.subtle,
          accent: "#3D6B00",
          success: "#08704C",
          warning: "#965400",
        },
        chip: {
          amber: "#F2EAE0",
          "amber-text": "#965400",
          teal: "#E1EEE9",
          "teal-text": "#08704C",
          success: "#E1EEE9",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-sm": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        h1: ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "h1-sm": ["1.75rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.6" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5" }],
        label: ["0.75rem", { lineHeight: "1.3", fontWeight: "500" }],
        mono: ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        overlay: "0 24px 48px -12px rgba(21,20,31,0.18)",
        page: "0 1px 2px rgba(21,20,31,0.06), 0 8px 24px -8px rgba(21,20,31,0.12)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "360ms",
      },
      backgroundImage: {
        aurora: "linear-gradient(120deg, #8B6CFF 0%, #FF6FC4 45%, #FFB938 100%)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        fill: { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        sweep: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(250%)" } },
        "drawer-in": { from: { transform: "translateX(-100%)" }, to: { transform: "none" } },
      },
      animation: {
        rise: "rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        fill: "fill 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        sweep: "sweep 1.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "drawer-in": "drawer-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
