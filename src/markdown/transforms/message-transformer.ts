import type { Element } from 'hast';
import { createElement, createIcon } from '../utils';
import type { CommentTransformerMeta, CommentMap, DevTransformer } from '../types';

const annotationIcon = (): Element => {
    return createIcon([
        'M11 24h10v2H11zm2 4h6v2h-6zm3-26A10 10 0 0 0 6 12a9.19 9.19 0 0 0 3.46 7.62c1 .93 1.54 1.46 1.54 2.38h2c0-1.84-1.11-2.87-2.19-3.86A7.2 7.2 0 0 1 8 12a8 8 0 0 1 16 0a7.2 7.2 0 0 1-2.82 6.14c-1.07 1-2.18 2-2.18 3.86h2c0-.92.53-1.45 1.54-2.39A9.18 9.18 0 0 0 26 12A10 10 0 0 0 16 2'
    ]);
};

const logIcon = (): Element => {
    return createIcon([
        'M17 22v-8h-4v2h2v6h-3v2h8v-2zM16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8',
        'M26 28H6a2.002 2.002 0 0 1-2-2V6a2.002 2.002 0 0 1 2-2h20a2.002 2.002 0 0 1 2 2v20a2.002 2.002 0 0 1-2 2M6 6v20h20V6Z'
    ]);
};

const warningIcon = (): Element => {
    return createIcon([
        'M16 23a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 23m-1-11h2v9h-2z',
        'M29 30H3a1 1 0 0 1-.887-1.461l13-25a1 1 0 0 1 1.774 0l13 25A1 1 0 0 1 29 30M4.65 28h22.7l.001-.003L16.002 6.17h-.004L4.648 27.997Z'
    ]);
};

const errorIcon = (): Element => {
    return createIcon([
        'M15 8h2v11h-2zm1 14a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 22',
        'M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2m0 26a12 12 0 1 1 12-12a12 12 0 0 1-12 12'
    ]);
};

export const transformerName: string = 'devblog:message';

const transformer: DevTransformer = {
    name: transformerName,
    setup: (code, meta, commentMap: CommentMap) => {
        const keywords = [
            'annotation',
            'log',
            'warning',
            'error'
        ];

        meta[transformerName] = new Map<number, CommentTransformerMeta>;

        commentMap.forEach((commentMeta, index) => {
            if (keywords.includes(commentMeta.keyword)) {
                meta[transformerName].set(index + 1, commentMeta);
            }
        });
        
        return code;
    },
    transform: (line, meta, index: number) => { 
        /* 
            Hook: line
            Params:
                index: number - Index of the line.
        */
    
        line = line as Element;

        const messageMeta = meta[transformerName].get(index);
        if (!messageMeta) {
            return line;
        }

        // Create elements
        const lineSpan = createElement('span', {'data-line-message-type': ''});
        if (messageMeta.keyword === 'annotation') {
            lineSpan.properties['data-line-message-type'] = 'annotation';
            lineSpan.children.push(annotationIcon());
        }
        else if (messageMeta.keyword === 'log') {
            lineSpan.properties['data-line-message-type'] = 'log';
            lineSpan.children.push(logIcon());
        }
        else if (messageMeta.keyword === 'warning') {
            lineSpan.properties['data-line-message-type'] = 'warning';
            lineSpan.children.push(warningIcon());
        }
        else if (messageMeta.keyword === 'error') {
            lineSpan.properties['data-line-message-type'] = 'error';
            lineSpan.children.push(errorIcon());
        }
        lineSpan.children.push({ type: 'text', value: messageMeta.message });

        // Replace contents of line
        line.children = [lineSpan];
        line.properties['data-line-message'] = '';

        return line;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
    }
};

export default transformer;