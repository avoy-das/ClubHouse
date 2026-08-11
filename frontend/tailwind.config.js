/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        sans: ['Work Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        stitch: {
          background: '#fbf9f4',
          surface: '#fbf9f4',
          'surface-container-lowest': '#ffffff',
          'surface-container-low': '#f5f3ee',
          'surface-container': '#f0eee9',
          'surface-container-high': '#eae8e3',
          'surface-container-highest': '#e4e2dd',
          primary: '#1c1b1b',
          'on-primary': '#ffffff',
          secondary: '#615e57',
          'secondary-container': '#e8e2d9',
          'on-secondary-container': '#1d1b16',
          tertiary: '#ba3d15',
          'tertiary-container': '#3a0a00',
          'on-tertiary-container': '#ba3d15',
          'on-surface': '#1b1c19',
          'on-surface-variant': '#444748',
          outline: '#747878',
          'outline-variant': '#c4c7c7',
          error: '#ba1a1a',
          'error-container': '#ffdad6',
        },
      },
    },
  },
  plugins: [],
}

