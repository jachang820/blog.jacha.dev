import type { Element } from 'hast';
import { detectCommentTransformer } from '../utils';
import type { CommentTransformerMeta, DevTransformer } from '../types';
import { default as DiffTransformer } from './diff-transformer';
import { default as MessageTransformer } from './message-transformer';

export const transformerName: string = 'devblog:comments';

const transformer: DevTransformer = {
    name: transformerName,
    setup: (code, meta, _ = null) => {
        
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

        // Gather lines to skip numbering
        const diffKey = DiffTransformer.name;
        const messageKey = MessageTransformer.name;
        const messageLines = new Set<number>([...meta[messageKey].keys()])
        const diffMeta: Map<number, CommentTransformerMeta> = meta[diffKey];
        const diffRemoveLines = new Set<number>();
        diffMeta.entries().forEach(([index, meta]) => {
            if (meta.keyword === '--') {
                diffRemoveLines.add(index);
            }
        })
        const skipLines = messageLines.union(diffRemoveLines);

        // Map line index to line numbering
        const numberingMap = new Map<number, number | null>();
        let numbering = 1;
        for (let i = 1; i <= lines.length; i++) {
            if (skipLines.has(i)) {
                numberingMap.set(i, null);
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
        
        return line;
    },
    cleanup: (pre) => {
        DiffTransformer.cleanup!(pre);
        MessageTransformer.cleanup!(pre);
        delete pre.properties[transformerName];
    }
};

export default transformer;