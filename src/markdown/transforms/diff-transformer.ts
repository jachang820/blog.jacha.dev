import type { Element } from 'hast';
import type { CommentTransformerMeta, CommentMap, DevTransformer } from '../types';

export const transformerName: string = 'devblog:diff';

const transformer: DevTransformer = {
    name: transformerName,
    setup: (code, meta, commentMap: CommentMap) => {
        const keywords = [
            '++',
            '--'
        ];

        const lines = code.split('\n');

        meta[transformerName] = new Map<number, CommentTransformerMeta>;

        commentMap.forEach((commentMeta, index) => {
            if (keywords.includes(commentMeta.keyword)) {
                meta[transformerName].set(index + 1, commentMeta);
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

        const diffMeta = meta[transformerName].get(index);
        if (!diffMeta) {
            return line;
        }

        // Add classes
        let classes = line.properties['class'];
        if (typeof classes === 'string') {
            classes = classes.split(' ');
        }

        classes = classes as string[];
        if (diffMeta.keyword === '++') {
            classes.push('diff');
            classes.push('add');
            line.properties['data-line-diff'] = '';
        }
        else if (diffMeta.keyword === '--') {
            classes.push('diff');
            classes.push('remove');
            line.properties['data-line-diff'] = '';
        }
        line.properties['class'] = classes;

        return line;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
    }
};

export default transformer;