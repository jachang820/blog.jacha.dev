import type { ShikiConfig, AstroUserConfig } from 'astro';

import transformer from './transformers';

import highlightInlineCode from './inline-code';

type MarkdownConfig = NonNullable<AstroUserConfig['markdown']>;

const shikiConfig: Partial<ShikiConfig> = {
    themes: {
        light: 'github-light-default',
        dark: 'github-dark-dimmed',
    },
    defaultColor: false,
    transformers: [transformer]
};

const config: Partial<MarkdownConfig> = {
    shikiConfig: shikiConfig,
    rehypePlugins: [
        highlightInlineCode
    ]
};

export default config;