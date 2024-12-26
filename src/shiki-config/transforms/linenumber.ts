import type { ShikiTransformer } from 'shiki';

import { parseMeta } from './utils';

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

            // Add styling to line::before pseudo-elements to show line numbers
            node.children.push({
                type: 'element',
                tagName: 'style',
                properties: {},
                children: [{
                    type: 'text',
                    value: `
                        code[data-line-numbers] .line::before {
                            --line-number-color: rgba(115 138 148 / 50%);
                            content: counter(line);
                            counter-increment: line;
                            width: 0.75rem;
                            margin-right: 2rem;
                            display: inline-block;
                            text-align: right;
                            padding-right: 5px;
                            border-right: 1px solid var(--line-number-color);
                            color: var(--line-number-color);
                        }
                            
                        code[data-line-number-max-digits="2"] .line::before {
                            width: 1.5rem;
                        }

                        code[data-line-number-max-digits="3"] .line::before {
                            width: 2.25rem;
                        }

                        code[data-line-number-max-digits="4"] .line::before {
                            width: 3rem;
                        }`
                }]
            });

            return node;
        }
    };
};

export default transform;