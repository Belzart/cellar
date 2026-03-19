import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette — moody, premium, journal-like
        bg: {
          DEFAULT: '#0A0A0A',
          surface: '#141414',
          card: '#1A1A1A',
          elevated: '#202020',
        },
        border: {
          DEFAULT: '#262626',
          subtle: '#1E1E1E',
          strong: '#333333',
        },
        text: {
          DEFAULT: '#F2EDE6',
          secondary: '#78716C',
          tertiary: '#57534E',
          inverse: '#0A0A0A',
        },
        wine: {
          DEFAULT: '#8B1A1A',
          light: '#A52020',
          dark: '#6B1414',
          muted: '#3D0E0E',
        },
        gold: {
          DEFAULT: '#C4A24A',
          light: '#D4B56A',
          muted: '#7A6530',
        },
        cream: '#F2EDE6',
        stone: '#78716C',
        // Bite — nutrition app accent palette (bright, fresh, clean)
        bite: {
          DEFAULT: '#10B981',  // emerald-500
          light: '#34D399',    // emerald-400
          dark: '#059669',     // emerald-600
          muted: '#D1FAE5',    // emerald-100
          subtle: '#ECFDF5',   // emerald-50
        },
        // Bite surface / light-mode backgrounds
        surface: {
          DEFAULT: '#F7F6F3',  // warm off-white
          card: '#FFFFFF',
          elevated: '#F0EEE9',
          border: '#E8E5DE',
        },
        ink: {
          DEFAULT: '#0F0F0F',
          secondary: '#4B5563',
          tertiary: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        serif: [
          '"Palatino Linotype"',
          'Palatino',
          'Georgia',
          'serif',
        ],
        display: [
          '"Palatino Linotype"',
          'Palatino',
          'Georgia',
          'serif',
        ],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'tab-bar': '72px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.8s infinite',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        'wine': '0 0 20px rgba(139,26,26,0.3)',
        'glow': '0 0 40px rgba(139,26,26,0.2)',
        'bite': '0 0 24px rgba(16,185,129,0.25)',
        'bite-card': '0 2px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}

export default config
