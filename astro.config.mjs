// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

import highlightInlineCode from './src/shiki-config/inline-code';
import shikiConfig from './src/shiki-config';

// https://astro.build/config
export default defineConfig({
    site: 'https://example.com',
    integrations: [sitemap(), svelte()],
    markdown: {
        shikiConfig: shikiConfig,
        rehypePlugins: [
            highlightInlineCode
        ],
    }
});