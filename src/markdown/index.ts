import type { AstroUserConfig } from 'astro';
import highlightCode from './syntax-highlight';
import type { ThemeTypes } from './types';

type MarkdownConfig = NonNullable<AstroUserConfig['markdown']>;

export const shikiThemes: Record<string, ThemeTypes> = {
    light: 'github-light-default',
    dark: 'github-dark-dimmed',
};

export const config: Partial<MarkdownConfig> = {
    syntaxHighlight: false,
    rehypePlugins: [highlightCode]
};