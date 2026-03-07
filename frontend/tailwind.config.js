/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: 'var(--bg)',
                primary: 'var(--primary)',
                textMain: 'var(--text-main)',
                textLight: 'var(--text-light)',
            },
            boxShadow: {
                'neu-flat': 'var(--shadow-flat)',
                'neu-pressed': 'var(--shadow-pressed)',
                'neu-sm': 'var(--shadow-sm)',
            }
        },
    },
    plugins: [],
}
