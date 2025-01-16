import type { ThemePresets } from '@astrojs/markdown-remark';
import {
    type BundledTheme,
    type BundledLanguage,
    type LanguageInput,
    type ThemeInput,
    bundledLanguages,
    bundledThemes,
    getSingletonHighlighterCore,
    type HighlighterCore,
    type ThemeRegistration,
    type ThemeRegistrationRaw,
} from 'shiki';
import type { Element, Text, Root } from 'hast';
import { visit } from 'unist-util-visit';
import config from '.';

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

const loadLanguage = async (
    highlighter: HighlighterCore, 
    instance: InlineCodeInstance,
    loadedLanguages: Set<string>
): Promise<void> => {
    if (!loadedLanguages.has(instance.language)) {
        const lang = resolveLanguage(instance.language);
        if (lang) {
            await highlighter.loadLanguage(lang);
        }
        else {
            console.error(
                "Invalid language on inline code, using 'plaintext' instead.",
                instance.code);
            instance.language = 'plaintext';
        }
        loadedLanguages.add(instance.language);
    }
};

const regexp = /^(.+){:(\w+)}$/;

const highlightInlineCode = () => {

    const shikiThemes = config.shikiConfig!.themes!;

    const cachedHighlighter = getSingletonHighlighterCore({
        langs: [resolveLanguage('plaintext')], 
        themes: Object.values(shikiThemes).map(resolveTheme)
    });

    return async (tree: Root) => {

        const instances: InlineCodeInstance[] = [];
        const loadedLanguages: Set<string> = new Set(['plaintext']);
        let counter = 0;

        // Retrieve all instances of inline code in document
        visit(tree, 'element', (node: Element, 
                                _index: number | undefined,
                                parent: Element | Root | undefined) => {

            if (isInlineCode(node, parent)) {
                const textNode = node.children[0] as Text;
                const value = textNode.value;
                const match = value.match(regexp);
                if (match) {
                    const [_matchText, code, language] = match;
                    instances.push({ node, code, language });
                    counter++;
                }
                else {
                    instances.push({ node, code: value, language: 'plaintext' });
                }
            }
        });

        const highlighter = await cachedHighlighter;

        for (const instance of instances) {
            // Load language
            await loadLanguage(highlighter, instance, loadedLanguages);

            // Syntax highlighted structure
            const newRoot = highlighter.codeToHast(instance.code, {
                lang: instance.language, 
                themes: shikiThemes,
                defaultColor: false
            });
            const newPre = newRoot.children[0] as Element;
            const newCode = newPre.children[0] as Element;

            // Replace class with astro-code to conform
            let preClasses = newPre.properties['class'] as string;
            preClasses = preClasses.replaceAll('shiki', 'astro-code');
            newPre.properties['class'] = preClasses;
            newPre.properties['data-inline-code'] = '';
            newPre.properties['data-pagefind-ignore'] = 'all'; //Ignore code from search results

            // Replace original element
            instance.node.properties = newPre.properties;
            instance.node.children = newCode.children;
        }
    }
};

export default highlightInlineCode;