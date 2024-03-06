import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/lib/index.ts'],
	format: ['esm'],
	external: ['firebase', 'firebase-admin'],
	splitting: true,
	sourcemap: false,
	minify: true,
	clean: true,
	dts: true,
})
