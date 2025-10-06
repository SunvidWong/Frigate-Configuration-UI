/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS风格颜色
        'ios-blue': '#007AFF',
        'ios-green': '#34C759',
        'ios-orange': '#FF9500',
        'ios-red': '#FF3B30',
        'ios-purple': '#AF52DE',
        'ios-pink': '#FF2D92',
        'ios-teal': '#5AC8FA',
        'ios-yellow': '#FFCC00',
        'ios-gray': '#8E8E93',
        'ios-gray2': '#AEAEB2',
        'ios-gray3': '#C7C7CC',
        'ios-gray4': '#D1D1D6',
        'ios-gray5': '#E5E5EA',
        'ios-gray6': '#F2F2F7',
        'ios-label': '#000000',
        'ios-secondary-label': '#3C3C43',
        'ios-tertiary-label': '#3C3C4399',
        'ios-quaternary-label': '#3C3C4366',
        // 深色模式
        'ios-dark-label': '#FFFFFF',
        'ios-dark-secondary-label': '#EBEBF5',
        'ios-dark-tertiary-label': '#EBEBF599',
        'ios-dark-quaternary-label': '#EBEBF566',
        'ios-dark-gray': '#8E8E93',
        'ios-dark-gray2': '#636366',
        'ios-dark-gray3': '#48484A',
        'ios-dark-gray4': '#3A3A3C',
        'ios-dark-gray5': '#2C2C2E',
        'ios-dark-gray6': '#1C1C1E',
      },
      fontFamily: {
        'ios': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'ios-sm': '8px',
        'ios-md': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
      },
      boxShadow: {
        'ios-sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'ios-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'ios-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'ios-xl': '0 20px 25px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        'ios': '20px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}