import type { ThemePresets } from '@astrojs/markdown-remark';
import {
    type BundledTheme,
    type BundledLanguage,
    type LanguageInput,
    type ThemeInput,
    bundledLanguages,
    bundledThemes,
    getSingletonHighlighterCore,
    type ThemeRegistration,
    type ThemeRegistrationRaw,
} from 'shiki';
import type { Element, Text, Root } from 'hast';
import { visit } from 'unist-util-visit';
import config from '../shiki-config';

interface InlineCodeInstance {
    node: Element,
    code: string,
    language: string
}

type ThemeTypes = ThemeRegistration | ThemeRegistrationRaw | ThemePresets;

const isInlineCode = (
    element: Element,
    parent: Element | Root | undefined
): boolean => {
    if (!parent) {
        return false;
    }
    else {
        return (
            element.tagName === 'code' &&
            parent.type === 'element' &&
            parent.tagName !== 'pre' &&
            element.children.length === 1 &&
            element.children[0].type === 'text'
        );
    }
};

const resolveLanguage = (languageText: string): LanguageInput => {
    return bundledLanguages[languageText as BundledLanguage];
};

const resolveTheme = (themeText: ThemeTypes): ThemeInput => {
    return bundledThemes[(themeText! as string) as BundledTheme];
};

const regexp = /^(.+){:(\w+)}$/;

const highlightInlineCode = () => {

    const cachedHighlighter = getSingletonHighlighterCore({
        langs: [resolveLanguage('plaintext')], 
        themes: Object.values(config.themes!).map(resolveTheme)
    });

    return async (tree: Root) => {

        const instances: InlineCodeInstance[] = [];
        let counter = 0;

        // Retrieve all instances of inline code in document
        visit(tree, 'element', (node: Element, 
                                index: number | undefined, 
                                parent: Element | Root | undefined) => {

            if (isInlineCode(node, parent)) {
                const textNode = node.children[0] as Text;
                const value = textNode.value;
                const match = value.match(regexp);
                if (match && parent) {
                    const [_, code, language] = match;
                    instances.push({ node, code, language });
                    counter++;
                }
            }
        });

        const highlighter = await cachedHighlighter;

        for (const instance of instances) {
            // Load language
            await highlighter.loadLanguage(resolveLanguage(instance.language))

            // Syntax highlighted structure
            const newParent = highlighter.codeToHast(instance.code, {
                lang: instance.language, 
                themes: config.themes!
            });
            const newPre = newParent.children[0] as Element;

            // Replace original element
            instance.node.tagName = newPre.tagName;
            instance.node.properties = newPre.properties;
            instance.node.properties['data-inline-code'] = '';
            instance.node.children = newPre.children;
        }
    }
};

export default highlightInlineCode;