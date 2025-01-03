// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

import markdownConfig from './src/markdown';

// https://astro.build/config
export default defineConfig({
    site: 'https://example.com',
    integrations: [sitemap(), svelte()],
    markdown: markdownConfig
});