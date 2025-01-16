import type { Element } from 'hast';
import type { CommentTransformerMeta, DevTransformer } from '../types';
import { default as DiffTransformer } from './diff-transformer';
import { default as MessageTransformer } from './message-transformer';
import { default as SkipToTransformer } from './skipto-transformer';

export const transformerName: string = 'devblog:comments';

const detectCommentTransformer = (
    line: string, 
): CommentTransformerMeta | null => {
    const regexp = /(?:\/\/|\/\*|<!--|#|--|%{1,2}|;{1,2}|"|')\s*\[!code\s*([^\]]+?)\s*\]\s*(.*?)\s*(?:\*\/|-->)?$/;
    const match = line.match(regexp);
    if (match) {
        const [_comment, keyword, message] = match;
        return { keyword: keyword.toLowerCase(), message, index: match.index! };
    }
    return null;
};

const transformer: DevTransformer = {
    name: transformerName,
    setup: (code, meta, startLine: number) => {
        
        // Map line index to comment transformers found by [!code ] tags
        const commentMap = new Map<number, CommentTransformerMeta>();

        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trimEnd();
            const commentMeta = detectCommentTransformer(line);
            if (commentMeta) {
                commentMap.set(i, commentMeta);
            }
        }

        // Categorize comment transformers
        code = DiffTransformer.setup!(code, meta, commentMap);
        code = MessageTransformer.setup!(code, meta, commentMap);
        code = SkipToTransformer.setup!(code, meta, commentMap);

        // Gather lines to skip numbering
        const diffKey = DiffTransformer.name;
        const messageKey = MessageTransformer.name;
        const skipToKey = SkipToTransformer.name;
        const messageLines = new Set<number>([...meta[messageKey].keys()]);
        const diffMeta: Map<number, CommentTransformerMeta> = meta[diffKey];
        const diffRemoveLines = new Set<number>();
        diffMeta.entries().forEach(([index, meta]) => {
            if (meta.keyword === '--') {
                diffRemoveLines.add(index);
            }
        });
        const skipLines = messageLines.union(diffRemoveLines);
        const skipToMap: Map<number, number> = meta[skipToKey];

        // Map line index to line numbering
        const numberingMap = new Map<number, number | null>();
        let numbering = startLine;
        for (let i = 1; i <= lines.length; i++) {
            if (skipLines.has(i)) {
                numberingMap.set(i, null);
            }
            else if (skipToMap.has(i)) {
                numberingMap.set(i, null);
                numbering = skipToMap.get(i)!;
            }
            else {
                numberingMap.set(i, numbering);
                numbering++;
            }
        }
        meta[transformerName] = numberingMap;
        
        return code;
    },
    transform: (line, meta, index: number) => { 
        /* 
            Hook: line
            Params:
                index: number - Index of the line.
        */
    
        line = line as Element;

        // Process lines according to transformer
        line = DiffTransformer.transform!(line, meta, index);
        line = MessageTransformer.transform!(line, meta, index);
        line = SkipToTransformer.transform!(line, meta, index);
        
        return line;
    },
    cleanup: (pre) => {
        DiffTransformer.cleanup!(pre);
        MessageTransformer.cleanup!(pre);
        SkipToTransformer.cleanup!(pre);
        delete pre.properties[transformerName];
    }
};

export default transformer;