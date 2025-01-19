// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

import markdownConfig from './src/markdown';
import { SITE_URL } from './src/consts';

// https://astro.build/config
export default defineConfig({
    site: SITE_URL,
    integrations: [sitemap(), svelte()],
    markdown: markdownConfig,
    build: {
        format: 'preserve'
    }
});