/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        'auto' : 'repeat(auto-fit, minmax(200px, 1fr))',

      },
      spacing: {
        "section-height" : "500px"
      },
      fontSize: {
        "default" : ['15px', '21px']
      },
      maxWidth: {
        'course-card' : "424px"
      },
      boxShadow: {
        'custom-card' : "0px 4px 15px 2px rgba(0, 0, 0, 0.1)",
      }
    },
  },
  plugins: [],
}