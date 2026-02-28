/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#e0e5ec', // Classic Neumorphic soft grey
                primary: '#4763ff',
                textMain: '#2d3436',
                textLight: '#636e72',
            },
            boxShadow: {
                // Essential Neumorphic outward and inward shadows
                'neu-flat': '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5)',
                'neu-pressed': 'inset 6px 6px 10px 0 rgba(163,177,198, 0.7), inset -6px -6px 10px 0 rgba(255,255,255, 0.5)',
                'neu-sm': '4px 4px 8px rgb(163,177,198,0.6), -4px -4px 8px rgba(255,255,255, 0.5)',
            }
        },
    },
    plugins: [],
}
