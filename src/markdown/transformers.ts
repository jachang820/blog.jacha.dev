import type { ShikiTransformer } from 'shiki';

import { default as CommentTransformer } from './transforms/comment-transformer';
import { default as MetaTransformer } from './transforms/meta-transformer';
import { default as LineNumberTransformer } from './transforms/linenumber-transformer';
import { default as HighlightTransformer } from './transforms/highlight-transform';
import { default as WhitespaceTransformer } from './transforms/whitespace-transformer';
import { default as FigureTransformer } from './transforms/figure-transformer';
import type { ParseMetaFunction, DevTransformer } from './types';
import { metaKey } from './utils';

const transformers: DevTransformer[] = [
    CommentTransformer,
    LineNumberTransformer,
    HighlightTransformer,
    WhitespaceTransformer,
    FigureTransformer
];

const transformer: ShikiTransformer = {
    preprocess(code, options) {
        // Instantiate meta
        options.meta = options.meta || {};
        const meta = options.meta;
        meta[metaKey] = new Map<string, any>();

        // Convert raw meta
        const metaRegexp = /^\s*([a-z-]+)\s*=\s*([^;]+?)\s*$/;
        if (meta.__raw) {
            const metaTerms = meta.__raw.split(';')
                .filter((value) => value.trim().length > 0);
            for (let i = 0; i < metaTerms.length; i++) {
                const match = metaTerms[i].match(metaRegexp);
                if (match) {
                    const [_, keyword, rawValue] = match;
                    meta[metaKey].set(keyword, rawValue);
                }
            }
        }

        // Register meta
        const parser = new Map<string, ParseMetaFunction>();
  
        for (const t of [MetaTransformer, ...transformers]) {
            if (t.register) {
                t.register.forEach((parseFn, optName) => {
                    parser.set(optName, parseFn);
                });
            }
        }

        // Parse 'meta' fence
        const parseMeta = parser.get('meta')!;
        const fence = parseMeta(meta[metaKey].get('meta'));
        meta[metaKey].set('meta', fence);
        code = MetaTransformer.setup!(code, meta, undefined);

        // Parse rest of meta
        (meta[metaKey] as Map<string, any>).forEach((value, keyword) => {
            if (parser.has(keyword)) {
                const parseFn = parser.get(keyword)!;
                meta[metaKey].set(keyword, parseFn(value as string));
            }
        });
        
        // Run all setup functions
        for (const t of transformers) {
            if (t.setup) {
                code = t.setup(code, meta, undefined);
            }
        }

        return code;
    },
    line(line, index) {
        const meta = this.options.meta!;

        /* Compile lines to skip numbering, then split each line into
           [lineNumber, whitespace, code].
           Separating out whitespace before code helps with indentation
           when code is wrapped on a long line. */
        const commentKey = CommentTransformer.name;
        const numberingMap = meta[commentKey];

        LineNumberTransformer.transform!(line, meta, 
            { index, numberingMap });

        // Add messages and diff classes for relevant lines
        CommentTransformer.transform!(line, meta, index);

        // Highlight relevant lines and phrases
        const startLine = meta[metaKey].get('start-line');
        HighlightTransformer.transform!(line, meta, 
            { index, numberingMap, startLine });

        // Split whitespaces into their own spans
        const excludeProps = new Set(['data-line-message', 'data-line-diff']);
        WhitespaceTransformer.transform!(line, meta,
            { index, excludeProps });

        return line;
    },
    pre(pre) {
        // Run all style functions
        const meta = this.options.meta!;
        LineNumberTransformer.styleElements!(pre, meta, null);
        HighlightTransformer.styleElements!(pre, meta, null);
        FigureTransformer.styleElements!(pre, meta, null);

        // Run all cleanup functions
        for (const t of [MetaTransformer, ...transformers]) {
            if (t.cleanup) {
                t.cleanup(pre);
            }
        }

        return pre;
    },
    root(root) {
        const meta = this.options.meta!;
        FigureTransformer.transform!(root, meta, null);
        return root;
    }
};

export default transformer;