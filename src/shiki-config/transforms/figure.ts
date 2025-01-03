import type { ShikiTransformer } from 'shiki';
import type { Element } from 'hast';

import { parseMeta, alterRGB } from './utils';

const titleCommand = 'title';

const parseTransformMeta = (meta: string | null): string | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    meta = meta.trim();
    if (meta.substring(0, 1) === '"' && meta.substring(meta.length - 1) === '"') {
        meta = meta.substring(1, meta.length - 1);
    }
    return meta;
};



const transform = (): ShikiTransformer => {
    
    return {
        name: 'devblog-transformers:meta-figure',
        root(node) {
            // Find relevant data from options meta
            const titleMeta = parseMeta(this.options, titleCommand);

            // Parse text data for title and captions
            const title = parseTransformMeta(titleMeta);

            // Check if data exists
            if (!title) {
                return node;
            }

            // Get existing code
            const pre = node.children[0] as Element;
            const lang = pre.properties['dataLanguage'] as string;
            pre.properties['data-block-code'] = '';
            pre.properties['data-pagefind-ignore'] = 'all'; // Ignore code for search
            pre.properties['style'] = pre.properties['style'] + ' overflow-y: hidden;';

            // Get secondary theme colors
            const figcaptionStylesArray: string[] = [];
            pre.properties['style'].split(';').forEach((style) => {
                const [key, value] = style.trim().split(':');
                if (key.startsWith('--')) {
                    const figcaptionKey = key.replace('shiki', 'shiki-caption');
                    let newValue;
                    if (key === '--shiki-light') {
                        newValue = alterRGB(value, (decimal) => decimal * 4);
                    }
                    else if (key === '--shiki-light-bg') {
                        newValue = alterRGB(value, 
                            (decimal) => Math.floor(decimal * 0.9));
                    }
                    else if (key === '--shiki-dark') {
                        newValue = alterRGB(value, 
                            (decimal) => Math.floor(decimal * 0.8));
                    }
                    else if (key === '--shiki-dark-bg') {
                        newValue = alterRGB(value, (decimal) => Math.floor(decimal * 1.5));
                    }
                    figcaptionStylesArray.push(`${figcaptionKey}:${newValue};`);
                }
            });
            const figcaptionStyles = figcaptionStylesArray.join(' ');

            // Create a figure element
            const figure: Element = {
                type: 'element',
                tagName: 'figure',
                properties: {
                    'data-code-block-figure': ''
                },
                children: []
            };

            if (title) {
                figure.children.push({
                    type: 'element',
                    tagName: 'figcaption',
                    properties: {
                        'style': figcaptionStyles,
                        'data-code-caption': '',
                        'data-language': lang
                    },
                    children: [
                        {
                            type: 'element',
                            tagName: 'span',
                            properties: {
                                'data-code-title': '',
                                'style': pre.properties['style']
                            },
                            children: [{ type: 'text', value: title }]
                        }, 
                        {
                            type: 'element',
                            tagName: 'span',
                            properties: {
                                'data-code-title-language': ''
                            },
                            children: [{ type: 'text', value: lang }]
                        }
                    ]
                });
            }

            figure.children.push(pre);
            
            node.children.splice(0, 1, figure);

            return node;
        }
    };
};

export default transform;