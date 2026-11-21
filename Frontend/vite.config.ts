import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { brandIconUrl, brandLogoUrl } from './src/data/brand.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'brand-image-preload',
    transformIndexHtml: html => html
      .replaceAll('__BRAND_LOGO_URL__', brandLogoUrl.replaceAll('&', '&amp;'))
      .replaceAll('__BRAND_ICON_URL__', brandIconUrl.replaceAll('&', '&amp;')),
  }],
})
