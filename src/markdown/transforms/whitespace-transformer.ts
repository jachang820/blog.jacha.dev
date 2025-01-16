import type { Element } from 'hast';
import { 
    metaKey,
    parseIntMeta,
    cloneElement,
    inOrderTraversal
} from '../utils';
import type { DevTransformer, TraversalFunction } from '../types';

const transformerName: string = 'devblog:highlight';

interface Params {
    index: number;
    excludeProps: Set<string>;
}

const transformer: DevTransformer = {
    name: transformerName,
    register: new Map([
        ['tab-size', (keyword) => parseIntMeta(keyword) || 4]
    ]),
    transform: (line, meta, { index, excludeProps}: Params) => {
        /* 
            Hook: line
            Params:
                index: number -- Line number.
                excludeClasses: Set<string> -- 
                    Exclude lines with these classes from being transformed.
        */
        line = line as Element;

        // Don't transform lines with excluded properties
        for (const prop of Object.keys(line.properties)) {
            if (excludeProps.has(prop)) {
                return line;
            }
        }

        const tabSize: number = meta[metaKey].get('tab-size');
        const propMap = new Map<string, string>([
            [' ', 'data-line-space'],
            ['\t', 'data-line-tab'],
        ]);

        const splitWhitespaces: TraversalFunction = (node, parent, index) => {
            if (
                node.type === 'element' && 
                node.children.length === 1 &&
                node.children[0].type === 'text'
            ) {
                const text = node.children[0].value;

                // Ignore whitespace that has already been processed
                if (text.length === 1) {
                    if (
                        propMap.has(text) && 
                        propMap.get(text)! in node.properties
                    ) {
                        return true;
                    }
                }

                // Iterate space, tabs, or text
                const parts: Element[] = [];
                for (const part of text.split(/([ \t])/)) {
                    if (part.length > 0) {
                        const clone = cloneElement(node);
                        clone.children = [{ type: 'text', value: part }];
                        // Part is space or tab, so remove text styling
                        if (propMap.has(part)) {
                            clone.properties[propMap.get(part)!] = '';
                            delete clone.properties.style;
                            if (part === '\t') {
                                clone.properties['style'] = `tab-size: ${tabSize};`;
                            }
                        }
                        parts.push(clone);
                    }
                }
                /* Delete original element, replace with element delimited by 
                   whitespaces. */
                parent?.children.splice(index, 1, ...parts);
            }
            return true;
        };

        if (line.children.length !== 3) {
            console.error(
                `Line on index ${index} has wrong number of children. ` + 
                'Make sure Line Numbering has been applied.');
        }
        else {
            const linePreWhitespace = line.children[1] as Element;
            const lineCode = line.children[2] as Element;
            if (!('data-line-code-pre-ws' in linePreWhitespace.properties) ||
                !('data-line-code' in lineCode.properties)
            ) {
                console.error(
                    `Malformed line on index ${index}. ` + 
                    'Make sure Line Numbering has been applied.');
            } else {
                inOrderTraversal(linePreWhitespace, null, 0, splitWhitespaces);
                inOrderTraversal(lineCode, null, 0, splitWhitespaces);
            }
        }

        return line;
    },
    styleElements(pre, meta, _) {
        const tabSize: number = meta[metaKey].get('tab-size');
        const code = pre.children[0] as Element;
        code.properties['style'] = code.properties['style'] || '';
        code.properties['style'] += `--shiki-line-code-indent: ${tabSize}ch;`;
        return pre;
    }
};

export default transformer;