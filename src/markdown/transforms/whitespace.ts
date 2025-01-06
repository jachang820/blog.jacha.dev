import type { ShikiTransformer } from 'shiki';
import type { Element, ElementContent } from 'hast';

import { parseMeta, isLine, isLineMessage } from '../utils';

const tabSizeCommand = 'tab-size';

const parseTransformMeta = (meta: string | null): number | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    const value = parseInt(meta);
    return !Number.isNaN(value) ? value : null;
};

const transform = (): ShikiTransformer => {
    const classMap: Record<string, string> = {
        ' ': 'space',
        '\t': 'tab',
    };

    const keys = Object.keys(classMap);

    return {
        name: 'shikiji-transformers:render-whitespace',
        // We use `root` hook here to ensure it runs after all other transformers
        root(root) {
            // Find relevant data from options meta
            const tabSizeMeta = parseMeta(this.options, tabSizeCommand);

            // Parse text data for number of spaces to convert tabs (default: 4)
            const tabSize = parseTransformMeta(tabSizeMeta) ?? 4;

            const pre = root.children[0] as Element;
            const code = pre.children[0] as Element;

            code.children.forEach((line) => {
                if (isLine(line) && !isLineMessage(line)) {
                    const nodesToVisit: ElementContent[] = [line];

                    // Extract whitespace from text
                    while (nodesToVisit.length > 0) {
                        const parent = nodesToVisit.pop() as Element;
                        let index = 0;
                        while (index < parent.children.length) {
                            const child = parent.children[index] as Element;
                            if (child.children.length > 0) {
                                const testElement = child.children[0];
                                if (testElement.type !== 'text') {
                                    nodesToVisit.push(child);
                                }
                                else { // Text
                                    const parts: Element[] = [];
                                    for (const part of testElement.value.split(/([ \t])/)) {
                                        if (part.length > 0) {
                                            const clone: Element = {
                                                ...child,
                                                properties: { ...child.properties }
                                            };
                                            clone.children = [{ type: 'text', value: part}];

                                            if (keys.includes(part)) {
                                                clone.properties[`data-line-${classMap[part]}`] = '';
                                                delete clone.properties.style;

                                                if (part === '\t') {
                                                    clone.properties['style'] = `tab-size: ${tabSize};`;
                                                }
                                            }

                                            parts.push(clone);
                                        }
                                    }
                                    parent.children.splice(index, 1, ...parts);
                                    index += parts.length - 1;
                                }
                            }
                            index++;
                        }
                    }
                }
            });

            // Split spaces before text into their own element
            code.children.forEach((line) => {
                if (isLine(line) && !isLineMessage(line)) {
                    line = line as Element;
                    if (line.children && 
                        line.children[1].type === 'element' 
                    ) {
                        const lineCode = line.children[1] as Element;
                        let count = 0;
                        while (count < lineCode.children.length) {
                            const child = lineCode.children[count] as Element;
                            const partProperties = Object(child.properties);
                            if ('data-line-space' in partProperties ||
                                'data-line-tab' in partProperties
                            ) {
                                count++;
                            }
                            else {
                                // First non-whitespace part
                                break;
                            }
                        }
                        const whitespaceElements = lineCode.children.splice(0, count);
                        const whitespaceWrapper: Element = {
                            type: 'element',
                            tagName: 'span',
                            properties: {'data-line-code-pre-ws': ''},
                            children: whitespaceElements
                        };
                        line.children.splice(1, 0, whitespaceWrapper);
                    }
                }
            });
        },
    };
};

export default transform;