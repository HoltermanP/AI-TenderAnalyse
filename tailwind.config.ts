import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-black': '#0A0A0B',
        'surface': '#111116',
        'navy': '#0D1428',
        'ai-blue': '#2D6FE8',
        'blue-light': '#4B8EFF',
        'velocity-red': '#FF4D1C',
        'off-white': '#F4F6FA',
        'slate-ai': '#6B82A8',
        'border-subtle': '#1E1E28',
      },
      fontFamily: {
        grotesk: ['var(--font-space-grotesk)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'card-lg': '14px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-navy': 'linear-gradient(135deg, #0D1428 0%, #0A0A0B 100%)',
        'gradient-blue': 'linear-gradient(135deg, #2D6FE8 0%, #4B8EFF 100%)',
      },
    },
  },
  plugins: [],
}

export default config
