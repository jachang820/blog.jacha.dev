import type { ShikiTransformer } from 'shiki';
import type { Element, Text } from 'hast';

import { parseMeta, alterRGB, isLine, isLineMessage } from '../utils';

const startLineCommand = 'start-line';

const parseTransformMeta = (meta: string | null): number | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    const value = parseInt(meta);
    return !Number.isNaN(value) ? value : null;
};

const isDiffRemove = (line: Element): boolean => {
    const classes = line.properties['class'];
    if (classes instanceof Array || typeof classes === 'string') {
        return classes.includes('diff') && classes.includes('remove');
    }
    else {
        return false;
    }
};

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:meta-line-numbers',
        pre(node) {
            // Find relevant data from options meta
            const startLineMeta = parseMeta(this.options, startLineCommand);

            // Parse text data for starting line number
            const startLine = parseTransformMeta(startLineMeta) ?? 1;

            const code = node.children[0] as Element;

            // Add line numbers to each line
            let lineNumber = startLine - 1;
            for (let i = 0; i < code.children.length; i++) {
                if (!isLine(code.children[i]) || 
                    isLineMessage(code.children[i])) {
                        continue;
                }

                const line = code.children[i] as Element;

                // Create spans to hold line number and wrap code
                const lineNumberText: Text = {
                    type: 'text',
                    value: isDiffRemove(line) ? ' ' : (++lineNumber).toString()
                };

                const lineNumberSpan: Element = {
                    type: 'element',
                    tagName: 'span',
                    properties: {
                        'data-line-number': ''
                    },
                    children: [lineNumberText]
                };

                const lineCodeSpan: Element = {
                    type: 'element',
                    tagName: 'span',
                    properties: {
                        'data-line-code': ''
                    },
                    children: line.children
                };

                line.children = [lineNumberSpan, lineCodeSpan];
                line.properties['data-line'] = '';
            }

            // Adjust width according to max line number digits
            const maxLineDigits = lineNumber.toString().length;
            code.properties['data-line-number-max-digits'] = maxLineDigits.toString();

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

            const lineNumberStyles = lineNumberStylesArray.join('');
            code.properties['style'] = code.properties['style'] || '';
            code.properties['style'] += lineNumberStyles;

            return node;
        }
    };
};

export default transform;