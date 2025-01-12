import type { Element, Text } from 'hast';
import { 
    metaKey, 
    parseIntMeta, 
    alterRGB, 
    createElement,
    inOrderTraversal,
    splitElement,
    KeepSide,
    getNodeText
} from '../utils';
import type { DevTransformer } from '../types';

const transformerName: string = 'devblog:line-numbers';

interface Params {
    index: number;
    numberingMap: Map<number, number | null>;
}

const transformer: DevTransformer = {
    name: transformerName,
    register: new Map([
        ['start-line', (keyword) => parseIntMeta(keyword) || 1]
    ]),
    transform: (line, meta, { index, numberingMap }: Params) => {
        /* 
            Hook: line
            Params:
                index: number -- Line number.
                numberingMap: Map<number, number | null> -- 
                    Map from line index to line numbering.
        */
        line = line as Element;

        const startLine = meta[metaKey].get('start-line') || 1;
        const baseNumber = numberingMap.get(index);
        const lineNumber = baseNumber ? baseNumber + startLine - 1 : null;

        // Create spans to hold line number and wrap code
        const lineNumberText: Text = {
            type: 'text',
            value: lineNumber ? lineNumber.toString() : ' '
        };

        // Count whitespaces at beginning of line
        const regexp = /^[\t ]*/;
        let whitespaceCount = 0;
        inOrderTraversal(line, null, 0, (node, parent, index) => {
            if (node.type === 'text') {
                const match = node.value.match(regexp);
                if (match) {
                    whitespaceCount += match[0].length;
                    return false;
                }
                else {
                    whitespaceCount += node.value.length;
                }
            }
            return true;
        });

        const lineNumberSpan = createElement('span', {'data-line-number': ''});
        lineNumberSpan.children = [lineNumberText];

        const lineCodeSpan = createElement('span', {'data-line-code': ''});
        lineCodeSpan.children = line.children;
        
        // Create empty span even if no space for consistent styling
        let whitespaceSpan = splitElement(
            lineCodeSpan, whitespaceCount, KeepSide.Right) ||
            createElement('span', {});
        whitespaceSpan.properties = {'data-line-code-pre-ws': ''};

        line.children = [lineNumberSpan, whitespaceSpan, lineCodeSpan];
        line.properties['data-line'] = '';

        return line;
    },
    styleElements: (pre, meta, _) => {
        pre = pre as Element;
        const startLine = meta['start-line'];
        const code = pre.children[0] as Element;
        const lineCount = code.children.length;
        const lastLine = startLine + lineCount - 1;
        const numDigits = lastLine.toString().length;

        code.properties['data-line-number-max-digits'] = numDigits;

        const newStyles: string[] = [];
        (pre.properties['style'] as string).split(';').forEach((style) => {
            const [key, value] = style.trim().split(':');
            const newKey = key.replace('shiki', 'shiki-lineno');
            if (key === '--shiki-light') {
                const newValue = alterRGB(value, 
                    (decimal) => decimal * 5);
                newStyles.push(`${newKey}:${newValue};`);
            }
            else if (key === '--shiki-dark') {
                const newValue = alterRGB(value, 
                    (decimal) => Math.floor(decimal * 0.5));
                newStyles.push(`${newKey}:${newValue};`);
            }
        });
        code.properties['style'] = code.properties['style'] || '';
        code.properties['style'] += newStyles.join('');
        return pre;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
        return pre;
    }
};

export default transformer;