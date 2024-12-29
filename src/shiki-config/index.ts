import type { ShikiConfig } from 'astro';

import { 
    transformerNotationDiff,
    transformerNotationErrorLevel
} from '@shikijs/transformers';

import metaExpandedMetaTransform from './transforms/meta';
import metaHighlightTransform from './transforms/highlight';
import metaLineNumberTransform from './transforms/linenumber';
import metaFigureTransform from './transforms/figure';
import renderWhitespaceTransform from './transforms/whitespace';

const config: Partial<ShikiConfig> = {
    themes: {
        light: 'github-light-default',
        dark: 'github-dark-dimmed',
    },
    defaultColor: false,
    transformers: [
        transformerNotationDiff(),
        transformerNotationErrorLevel(),
        renderWhitespaceTransform(),
        metaExpandedMetaTransform(),
        metaHighlightTransform(),
        metaLineNumberTransform(),
        metaFigureTransform()
    ]
};

export default config;