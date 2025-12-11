/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        pretendard: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.25' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],      // 14px
        'base': ['1rem', { lineHeight: '1.5' }],        // 16px
        'lg': ['1.125rem', { lineHeight: '1.5' }],      // 18px
        'xl': ['1.25rem', { lineHeight: '1.5' }],       // 20px
        '2xl': ['1.5rem', { lineHeight: '1.25' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '1.25' }],    // 30px
        '4xl': ['2.25rem', { lineHeight: '1.25' }],     // 36px
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
  },
  plugins: [],
}