import type { ShikiConfig } from 'astro';

import metaHighlightTransform from './transforms/highlight';

const config: Partial<ShikiConfig> = {
    themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
    },
    transformers: [
        metaHighlightTransform()
    ]
};

export default config;