/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Doré principal — #D4AF37 (spec "Luxury Modern")
        gold: {
          50:  '#FBF6E7',
          100: '#F5E9C2',
          200: '#EEDA96',
          300: '#E6CB6A',
          400: '#DFC04C',
          500: '#D4AF37',
          600: '#B8952B',
          700: '#8C7020',
          800: '#5F4C16',
          900: '#332A0C',
        },
        // Noir profond -> gris clair — #0B0B0B (fond) à #D7D7D7 (texte secondaire)
        dark: {
          50:  '#FAFAFA',
          100: '#F2F2F2',
          200: '#D7D7D7',
          300: '#B3B3B3',
          400: '#8C8C8C',
          500: '#666666',
          600: '#4D4D4D',
          700: '#2E2E2E',
          800: '#1A1A1A',
          900: '#0B0B0B',
        },
      },
      fontFamily: {
        // Corps de texte
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Titres (H1/H2, chiffres clés, prix)
        display: ['Playfair Display', 'Georgia', 'serif'],
        // Menus, boutons, badges, sous-titres
        accent: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'count-up': 'countUp 2s ease forwards',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.35)' },
          '50%': { boxShadow: '0 0 0 12px rgba(212,175,55,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        countUp: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
