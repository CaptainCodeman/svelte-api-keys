import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/lib/index.ts'],
	format: ['esm'],
	external: ['firebase', 'firebase-admin', '@sveltejs/kit'],
	splitting: true,
	sourcemap: false,
	minify: true,
	clean: true,
	dts: true,
})
