import type { ShikiTransformer } from 'shiki';
import type { Element, Text } from 'hast';

import { parseMeta } from './utils';

const titleCommand = 'title';
const captionTextCommand = 'caption';
const captionLinkCommand = 'captionHref';

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
            const captionMeta = parseMeta(this.options, captionTextCommand);
            const captionHrefMeta = parseMeta(this.options, captionLinkCommand);

            // Parse text data for title and captions
            const title = parseTransformMeta(titleMeta);
            const caption = parseTransformMeta(captionMeta);
            const captionHref = parseTransformMeta(captionHrefMeta);

            // Check if data exists
            if (!title && !caption) {
                return node;
            }

            // Get existing code
            const pre = node.children[0] as Element;
            const lang = pre.properties['dataLanguage'] as string;
            pre.properties['style'] = pre.properties['style'] + 'overflow-y: hidden;';

            // Create a figure element
            const figure: Element = {
                type: 'element',
                tagName: 'figure',
                properties: {
                    'style': `font-size: 1rem; overflow-y: hidden;`
                },
                children: []
            };

            if (title) {
                figure.children.push({
                    type: 'element',
                    tagName: caption ? 'div' : 'figcaption',
                    properties: {
                        'data-language': lang
                    },
                    children: [
                        {
                            type: 'element',
                            tagName: 'span',
                            properties: {
                                'data-code-title': ''
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
            
            if (caption || captionHref) {
                const figcaption: Element = {
                    type: 'element',
                    tagName: 'figcaption',
                    properties: {
                        'data-language': lang
                    },
                    children: []
                };
                if (captionHref) {
                    const captionAnchor: Element = {
                        type: 'element',
                        tagName: 'a',
                        properties: {
                            'href': captionHref,
                            'target': '_blank',
                            'rel': 'external noopener noreferrer'
                        },
                        children: []
                    };
                    if (caption) {
                        captionAnchor.children.push({ 
                            type: 'text', value: caption
                        });
                    }
                    else {
                        captionAnchor.children.push({
                            type: 'text', value: captionHref
                        });
                    }
                    figcaption.children.push(captionAnchor);
                }
                else if (caption) {
                    figcaption.children.push({ 
                        type: 'text', value: caption
                    });
                }
                figure.children.push(figcaption);
            }
            
            node.children.splice(0, 1, figure);

            return node;
        }
    };
};

export default transform;