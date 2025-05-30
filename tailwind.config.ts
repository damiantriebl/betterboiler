import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        nebulosa: "url('/nebulosa.webp')",
      },
      colors: {
        background: "hsl(220, 26%, 97%)",
        foreground: "hsl(225, 25%, 25%)",
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(220, 15%, 35%)",
        },
        popover: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(225, 25%, 25%)",
        },
        primary: {
          DEFAULT: "hsl(220, 70%, 55%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        secondary: {
          DEFAULT: "hsl(220, 15%, 95%)",
          foreground: "hsl(225, 20%, 30%)",
        },
        muted: {
          DEFAULT: "hsl(220, 15%, 92%)",
          foreground: "hsl(220, 10%, 50%)",
        },
        accent: {
          DEFAULT: "hsl(210, 80%, 88%)",
          foreground: "hsl(220, 70%, 45%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        border: "hsl(220, 25%, 88%)",
        input: "hsl(220, 25%, 88%)",
        ring: "hsl(220, 70%, 55%)",
        chart: {
          "1": "hsl(220, 70%, 55%)",
          "2": "hsl(210, 80%, 70%)",
          "3": "hsl(190, 70%, 55%)",
          "4": "hsl(240, 50%, 65%)",
          "5": "hsl(200, 60%, 60%)",
        },
        sidebar: {
          DEFAULT: "hsl(225, 30%, 15%)",
          foreground: "hsl(220, 15%, 85%)",
          primary: "hsl(220, 70%, 55%)",
          "primary-foreground": "hsl(0, 0%, 100%)",
          accent: "hsl(225, 25%, 20%)",
          "accent-foreground": "hsl(220, 15%, 90%)",
          border: "hsl(225, 25%, 25%)",
          ring: "hsl(220, 70%, 55%)",
        },
        success: {
          DEFAULT: "hsl(142, 76%, 36%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        warning: {
          DEFAULT: "hsl(45, 93%, 58%)",
          foreground: "hsl(0, 0%, 0%)",
        },
        info: {
          DEFAULT: "hsl(200, 100%, 50%)",
          foreground: "hsl(0, 0%, 100%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
