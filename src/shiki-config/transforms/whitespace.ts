import { type ShikiTransformer, addClassToHast } from 'shiki';
import type { Element, ElementContent } from 'hast';

import { parseMeta, isLine } from './utils';

const tabSizeCommand = 'tabSize';

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
                if (isLine(line)) {
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
        },
    };
};

export default transform;