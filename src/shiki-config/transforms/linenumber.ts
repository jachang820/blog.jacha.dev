import type { ShikiTransformer } from 'shiki';

import { parseMeta, alterRGB } from './utils';

const startLineCommand = 'startLine';

const parseTransformMeta = (meta: string | null): number | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    const value = parseInt(meta);
    return !Number.isNaN(value) ? value : null;
};

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:meta-line-numbers',
        code(node) {
            // Find relevant data from options meta
            const startLineMeta = parseMeta(this.options, startLineCommand);

            // Parse text data for starting line number
            const startLine = parseTransformMeta(startLineMeta) ?? 1;

            // Start CSS counter
            node.properties['style'] = `counter-set: line ${startLine - 1};`;

            // Adjust width according to max line number digits
            const lines = node.children.length;
            const lastLineNumber = startLine + lines - 1;
            const maxLineDigits = lastLineNumber.toString().length;
            node.properties['data-line-numbers'] = '';
            node.properties['data-line-number-max-digits'] = maxLineDigits.toString();

            return node;
        },
        pre(node) {
            // Get text color style
            const lineNumberStylesArray: string[] = [];
            const stylesString = node.properties['style'] as string;
            stylesString.split(';').forEach((style) => {
                const [key, value] = style.trim().split(':');
                const newKey = key.replace('shiki', 'shiki-lineno');
                if (key === '--shiki-light') {
                    const newValue = alterRGB(value, (decimal) => decimal * 5);
                    lineNumberStylesArray.push(`${newKey}:${newValue};`);
                }
                else if (key === '--shiki-dark') {
                    const newValue = alterRGB(value, (decimal) => Math.floor(decimal * 0.5));
                    lineNumberStylesArray.push(`${newKey}:${newValue};`);
                }
            });

            const lineNumberStyles = lineNumberStylesArray.join(' ');
            for (const child of node.children) {
                if (child.type === 'element' && child.tagName === 'code') {
                    child.properties['style'] = child.properties['style'] + lineNumberStyles;
                    break;
                }
            }

            return node;
        }
    };
};

export default transform;