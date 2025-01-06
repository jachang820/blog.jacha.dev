import type { ShikiConfig, AstroUserConfig } from 'astro';

import { 
    transformerNotationDiff,
    transformerNotationErrorLevel
} from '@shikijs/transformers';

import metaExpandedMetaTransform from './transforms/meta';
import metaHighlightTransform from './transforms/highlight';
import metaLineNumberTransform from './transforms/linenumber';
import metaFigureTransform from './transforms/figure';
import renderWhitespaceTransform from './transforms/whitespace';
import errorMessagesTransform from './transforms/errormessages';

import highlightInlineCode from './inline-code';

type MarkdownConfig = NonNullable<AstroUserConfig['markdown']>;

const shikiConfig: Partial<ShikiConfig> = {
    themes: {
        light: 'github-light-default',
        dark: 'github-dark-dimmed',
    },
    defaultColor: false,
    transformers: [
        metaExpandedMetaTransform(), // preprocess, pre (clean-up)
        errorMessagesTransform(), // line
        transformerNotationDiff(), // code
        transformerNotationErrorLevel(), // code
        metaLineNumberTransform(), // pre
        metaHighlightTransform(), // pre (must be after line number)
        renderWhitespaceTransform(), // root
        metaFigureTransform(), // root (must be last)
    ]
};

const config: Partial<MarkdownConfig> = {
    shikiConfig: shikiConfig,
    rehypePlugins: [
        highlightInlineCode
    ]
};

export default config;