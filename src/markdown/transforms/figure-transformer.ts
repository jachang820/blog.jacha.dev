import type { Element } from 'hast';
import { 
    metaKey,
    parseIntMeta,
    parseStringMeta,
    createElement,
    alterRGB
} from '../utils';
import type { 
    DevTransformer, 
    ParseMetaFunction
} from '../types';

const transformerName: string = 'devblog:figure';

const transformer: DevTransformer = {
    name: transformerName,
    register: new Map<string, ParseMetaFunction>([
        ['title', (keyword) => parseStringMeta(keyword)],
        ['dir-level-fade', (keyword) => parseIntMeta(keyword)],
        ['add-classes', (keyword) => {
            if (keyword) {
                const regexp = /[a-z0-9-]+/g;
                const matches = keyword.match(regexp);
                return matches ? [...matches] : null;
            }
            else {
                return null;
            }
        }]
    ]),
    styleElements: (pre, meta, _) => {
        pre = pre as Element;
        // Get secondary theme colors
        const figcaptionStyles: string[] = [];
        (pre.properties['style'] as string).split(';').forEach((style) => {
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
                figcaptionStyles.push(`${figcaptionKey}:${newValue};`);
            }
        });
        meta[transformerName] = figcaptionStyles.join(' ');
        return pre;
    },
    transform: (root, meta, _) => {
        /* 
            Hook: root
            Params: null
        */
        const title = meta[metaKey].get('title');
        let level = meta[metaKey].get('dir-level-fade');

        // Split title by directory
        const titleLevels = title?.split('/');

        if (title && level !== null) {
            if (level < 0 || level >= titleLevels!.length) {
                console.error("Directory level out of range. Fade will not be in effect");
                level = null;
            }
        }
        else if (!title) {
            level = null;
        }
        
        // Get existing code
        const pre = root.children[0] as Element;
        const lang = pre.properties['dataLanguage'] as string;
        pre.properties['data-block-code'] = '';
        pre.properties['data-pagefind-ignore'] = 'all'; // Ignore code for search
        pre.properties['style'] = pre.properties['style'] + ' overflow-y: hidden;';

        const figcaptionStyles: string = meta[transformerName];

        // Create a figure element
        const classes = meta[metaKey].get('add-classes');
        const figure = createElement('figure', { 'data-code-block-figure': '' });
        if (classes) {
            figure.properties['class'] = classes;
        }
        
        const figCaption = createElement('figcaption', {
            'style': figcaptionStyles,
            'data-code-caption': '',
            'data-language': lang
        });
        const figTitle = createElement('span', {
            'data-code-title': '',
            'style': pre.properties['style']
        });
        const figLanguage = createElement('span', { 'data-code-title-language': '' });
        figLanguage.children = [{ type: 'text', value: lang }];

        if (titleLevels && typeof level === 'number') {
            const fadeText = titleLevels.slice(0, level + 1).join('/');
            const fadeTextSpan = createElement('span', 
                { 'data-code-title-prefix': 'fade' });
            fadeTextSpan.children = [{ type: 'text', value: fadeText }];
            figTitle.children.push(fadeTextSpan);

            if (level < titleLevels!.length - 1) {
                const mainText = '/' + titleLevels!.slice(level + 1).join('/');
                const mainTextSpan = createElement('span', 
                    {'data-code-title-main': 'fade'});
                mainTextSpan.children = [{ type: 'text', value: mainText }];
                figTitle.children.push(mainTextSpan);
            }
        }
        // Bold root/domain if fade not specified
        else if (titleLevels && 
                titleLevels.length > 0 && titleLevels[0].length > 0) {
            const rootText = titleLevels.slice(0, 1).join('/');
            const rootTextSpan = createElement('span', 
                { 'data-code-title-prefix': 'root' });
            rootTextSpan.children = [{ type: 'text', value: rootText }];
            figTitle.children.push(rootTextSpan);

            const mainText = '/' + titleLevels.slice(1).join('/');
            const mainTextSpan = createElement('span', {
                'data-code-title-main': ''});
            mainTextSpan.children = [{ type: 'text', value: mainText }];
            figTitle.children.push(mainTextSpan);
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
        
        root.children.splice(0, 1, figure);

        return root;
    }
};

export default transformer;