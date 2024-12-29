import type { ShikiConfig } from 'astro';

import { 
    transformerNotationDiff,
    transformerNotationErrorLevel,
    transformerRenderWhitespace
} from '@shikijs/transformers';

import metaExpandedMetaTransform from './transforms/meta';
import metaHighlightTransform from './transforms/highlight';
import metaTabSizeTransform from './transforms/indents';
import metaLineNumberTransform from './transforms/linenumber';
import metaFigureTransform from './transforms/figure';

const config: Partial<ShikiConfig> = {
    themes: {
        light: 'github-light-default',
        dark: 'github-dark-dimmed',
    },
    defaultColor: false,
    transformers: [
        metaExpandedMetaTransform(),
        metaHighlightTransform(),
        metaTabSizeTransform(),
        metaLineNumberTransform(),
        metaFigureTransform(),
        transformerNotationDiff(),
        transformerNotationErrorLevel(),
        transformerRenderWhitespace()
    ]
};

export default config;