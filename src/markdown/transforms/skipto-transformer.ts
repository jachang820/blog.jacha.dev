import type { Element } from 'hast';
import type { CommentMap, DevTransformer } from '../types';
import { createElement } from '../utils';

export const transformerName: string = 'devblog:skipto';

const transformer: DevTransformer = {
    name: transformerName,
    setup: (code, meta, commentMap: CommentMap) => {
        const keyword = 'skipto';

        const lines = code.split('\n');

        meta[transformerName] = new Map<number, number>();

        commentMap.forEach((commentMeta, index) => {
            const [commentKeyword, skipTo] = commentMeta.keyword.split(' ');
            const skipToNum = parseInt(skipTo);
            if (keyword === commentKeyword && !isNaN(skipToNum)) {
                meta[transformerName].set(index + 1, skipToNum);
            }
        });
        
        return lines.join('\n');
    },
    transform: (line, meta, index: number) => { 
        /* 
            Hook: line
            Params:
                index: number - Index of the line.
        */
    
        line = line as Element;

        const skipLineNumber = meta[transformerName].get(index);
        if (!skipLineNumber) {
            return line;
        }

        const topPage = createElement('div',
            {'data-line-page-break-top': ''});
        const bottomPage = createElement('div', 
            {'data-line-page-break-bottom': ''});
        const textContainer = createElement('span',
            {'data-line-page-break-text': ''});
        textContainer.children = [{ type: 'text', 
            value: `skip to line ${skipLineNumber}`}];
        const pageBreak = createElement('div',
            {'data-line-page-break-gap': ''});
        pageBreak.children = [topPage, textContainer, bottomPage];
        line.properties['data-line-page-break'] = '';
        line.children = [pageBreak];

        return line;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
    }
};

export default transformer;