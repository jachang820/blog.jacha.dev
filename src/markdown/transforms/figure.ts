import type { ShikiTransformer } from 'shiki';
import type { Element } from 'hast';

import { parseMeta, alterRGB } from '../utils';

const titleCommand = 'title';
const fadeCommand = 'directory-level-fade';

const parseTransformTitle = (meta: string | null): string | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    meta = meta.trim();
    if (meta.substring(0, 1) === '"' && meta.substring(meta.length - 1) === '"') {
        meta = meta.substring(1, meta.length - 1);
    }
    return meta;
};

const parseTransformLevel = (meta: string | null): number | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    meta = meta.trim();
    const level = parseInt(meta);
    return !isNaN(level) ? level : null;
}

const transform = (): ShikiTransformer => {
    
    return {
        name: 'devblog-transformers:meta-figure',
        root(node) {
            // Find relevant data from options meta
            const titleMeta = parseMeta(this.options, titleCommand);
            const dirLevelFadeMeta = parseMeta(this.options, fadeCommand);

            // Parse text data for title
            const title = parseTransformTitle(titleMeta);

            // Parse text data for directory
            let level = parseTransformLevel(dirLevelFadeMeta);

            // Split title by directory
            const titleLevels = title?.split('/');

            if (title && level) {
                if (level < 0 || level >= titleLevels!.length) {
                    console.error("Directory level out of range. Fade will not be in effect");
                    level = null;
                }
            }
            else if (!title) {
                level = null;
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
                if (key.startsWith('--shiki')) {
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

            const figCaption: Element = {
                type: 'element',
                tagName: 'figcaption',
                properties: {
                    'style': figcaptionStyles,
                    'data-code-caption': '',
                    'data-language': lang
                },
                children: []
            };

            const figTitle: Element = {
                type: 'element',
                tagName: 'span',
                properties: {
                    'data-code-title': '',
                    'style': pre.properties['style']
                },
                children: []
            };

            const figLanguage: Element = {
                type: 'element',
                tagName: 'span',
                properties: {
                    'data-code-title-language': ''
                },
                children: [{ type: 'text', value: lang }]
            };

            if (level) {
                const fadeText = titleLevels!.slice(0, level + 1).join('/');
                const fadeTextSpan: Element = {
                    type: 'element',
                    tagName: 'span',
                    properties: {
                        'data-code-title-fade': ''
                    },
                    children: [{ type: 'text', value: fadeText }]
                };
                figTitle.children.push(fadeTextSpan);

                if (level < titleLevels!.length - 1) {
                    const mainText = '/' + titleLevels!.slice(level + 1).join('/');
                    const mainTextSpan: Element = {
                        type: 'element',
                        tagName: 'span',
                        properties: {
                            'data-code-title-main': ''
                        },
                        children: [{ type: 'text', value: mainText }]
                    };
                    figTitle.children.push(mainTextSpan);
                }
            }
            else {
                figTitle.children.push({
                    type: 'text',
                    value: title!
                });
            }

            if (title) {
                figCaption.children.push(figTitle);
            }
            figCaption.children.push(figLanguage);

            figure.children.push(figCaption);

            figure.children.push(pre);
            
            node.children.splice(0, 1, figure);

            // Remove unnecessary properties from pre tag
            if (this.options.meta) {
                const meta = Object(this.options.meta)
                const keys = Object.keys(meta);
                for (const key of keys) {
                    delete pre.properties[key];
                }
            }

            return node;
        }
    };
};

export default transform;