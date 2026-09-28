import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relativer Basispfad, damit die Seite auch unter GitHub Pages (/<repo>/) funktioniert.
export default defineConfig({
  base: './',
  plugins: [react()],
});
