import type { Element } from 'hast';
import type { CommentMap, DevTransformer } from '../types';

export const transformerName: string = 'devblog:skipline';

const transformer: DevTransformer = {
    name: transformerName,
    setup: (code, meta, commentMap: CommentMap) => {
        const keyword = 'skipline';

        const lines = code.split('\n');

        meta[transformerName] = new Set<number>();

        commentMap.forEach((commentMeta, index) => {
            if (keyword === commentMeta.keyword) {
                meta[transformerName].add(index + 1);
                // Remove comment from line
                lines[index] = lines[index].slice(0, commentMeta.index);
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

        const skipLine = meta[transformerName].has(index);
        if (!skipLine) {
            return line;
        }

        line.properties['data-line-skip-number'] = '';

        return line;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
    }
};

export default transformer;