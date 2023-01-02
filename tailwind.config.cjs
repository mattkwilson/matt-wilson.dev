/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		fontFamily: {
			'code': ['Menlo', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono',
				'Bitstream Vera Sans Mono', 'Courier New', 'monospace'],
		},
		extend: {
			keyframes: {
				pulse: {
					'0%, 100%': { opacity: '1'},
					'50%': { opacity: '0' },
				}
			},
		},
	}
}
