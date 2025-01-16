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
        parser.forEach((parseFn, optName) => {
            const value: string | undefined = meta[metaKey].get(optName);
            (meta[metaKey] as Map<string, any>).set(optName, parseFn(value));
        });

        // Run all setup functions
        const startLine: number = meta[metaKey].get('start-line');
        code = CommentTransformer.setup!(code, meta, startLine);
        code = HighlightTransformer.setup!(code, meta, null);

        return code;
    },
    line(line, index) {
        const meta = this.options.meta!;

        /* Compile lines to skip numbering, then split each line into
           [lineNumber, whitespace, code].
           Separating out whitespace before code helps with indentation
           when code is wrapped on a long line. */
        const commentKey = CommentTransformer.name;
        const numberingMap: Map<number, number | null> = meta[commentKey];
        
        LineNumberTransformer.transform!(line, meta, 
            { index, numberingMap });
        
        // Add messages and diff classes for relevant lines
        CommentTransformer.transform!(line, meta, index);

        // Highlight relevant lines and phrases
        HighlightTransformer.transform!(line, meta, 
            { index, numberingMap });

        // Split whitespaces into their own spans
        const excludeProps = new Set([
            'data-line-message', 
            'data-line-diff',
            'data-line-page-break'
        ]);
        WhitespaceTransformer.transform!(line, meta,
            { index, excludeProps });

        return line;
    },
    pre(pre) {
        // Run all style functions
        const meta = this.options.meta!;
        const commentKey = CommentTransformer.name;
        const numberingMap: Map<number, number | null> = meta[commentKey];
        LineNumberTransformer.styleElements!(pre, meta, numberingMap);
        HighlightTransformer.styleElements!(pre, meta, null);
        WhitespaceTransformer.styleElements!(pre, meta, null);
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