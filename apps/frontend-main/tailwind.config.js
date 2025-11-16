const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        purple: {
          50: '#f3e8ff',
          100: '#e9d4ff',
          500: '#8200db',
        },
        pink: {
          50: '#fccee8',
          500: '#c6005c',
        },
      },
    },
  },
  plugins: [],
};
