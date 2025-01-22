import {
    bundledLanguages,
    bundledThemes,
    type BundledTheme,
    type BundledLanguage,
    type LanguageInput,
    type ThemeInput,
    type HighlighterCore,
    createHighlighter
} from 'shiki';
// import { getSingletonHighlighterCore, createOnigurumaEngine } from 'shiki';
import type { Element, Text, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { shikiThemes } from '.';
import type { ThemeTypes } from './types';
import transformer from './transformers';

interface CodeInstance {
    node: Element,
    code: string,
    language: string,
    meta?: string
}

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

const isBlockCode = (
    element: Element,
    parent: Element | Root | undefined
): boolean => {
    if (!parent) {
        return false;
    }
    else {
        if (
            element.tagName === 'pre' &&
            element.children.length === 1 &&
            element.children[0].type === 'element' &&
            element.children[0].tagName === 'code' &&
            element.children[0].children.length === 1 &&
            element.children[0].children[0].type === 'text'
        ) {
            const code = element.children[0] as Element;
            if (
                'className' in code.properties &&
                code.properties['className'] instanceof Array &&
                code.properties['className'].length === 1 &&
                typeof code.properties['className'][0] === 'string' &&
                code.properties['className'][0].startsWith('language-')
            ) {
                return true;
            }
        }
        return false;
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
    instance: CodeInstance,
    loadedLanguages: Set<string>
): Promise<void> => {
    if (!loadedLanguages.has(instance.language)) {
        const resolvedLanguage = resolveLanguage(instance.language);
        if (resolvedLanguage) {
            await highlighter.loadLanguage(resolvedLanguage);
            loadedLanguages.add(instance.language);
        }
        else {
            console.error(
                "Invalid language on inline code, using 'plaintext' instead.",
                instance.code);
            instance.language = 'plaintext';
        }
    }
};

const regexp = /^(.+){:(\w+)}$/;

const highlightCode = () => {
    const cachedHighlighter = createHighlighter({
        langs: ['plaintext'], 
        themes: Object.values(shikiThemes).map(
            (theme: ThemeTypes) => resolveTheme(theme))
    });

    // const cachedHighlighter = getSingletonHighlighterCore({
    //     langs: [resolveLanguage('plaintext')], 
    //     themes: Object.values(shikiThemes).map(
    //         (theme: ThemeTypes) => resolveTheme(theme)),
    // });
    
    return async (tree: Root) => {
        
        const inlineInstances: CodeInstance[] = [];
        const blockInstances: CodeInstance[] = [];
        const loadedLanguages: Set<string> = new Set(['plaintext']);

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
                    inlineInstances.push({ node, code, language });
                }
                else {
                    inlineInstances.push({ node, code: value, language: 'plaintext' });
                }
            }
            else if (isBlockCode(node, parent)) {
                const codeElement = node.children[0] as Element;
                let meta = codeElement.data?.meta;
                if (!meta) meta = undefined;
                const textNode = codeElement.children[0] as Text;
                const code = textNode.value;
                const classes = codeElement.properties.className as string[];
                const language = classes[0].split('-')[1];

                blockInstances.push({ node, code, language, meta });
            }
        });

        const highlighter = await cachedHighlighter;

        for (const instance of inlineInstances) {

            await loadLanguage(highlighter, instance, loadedLanguages);
            const root = highlighter.codeToHast(instance.code, {
                lang: instance.language, 
                themes: shikiThemes,
                defaultColor: false,
                transformers: [
                    {
                        pre(pre) {
                            pre.properties['data-inline-code'] = '';

                            //Ignore code from search results
                            pre.properties['data-pagefind-ignore'] = 'all';
                            return pre;
                        }
                    }
                ]
            });

            const pre = root.children[0] as Element;
            const code = pre.children[0] as Element;

            // Replace original element
            instance.node.properties = {...pre.properties};
            instance.node.children = code.children;
        }
        for (const instance of blockInstances) {

            await loadLanguage(highlighter, instance, loadedLanguages);

            const root = highlighter.codeToHast(instance.code.trimEnd(), {
                lang: instance.language, 
                themes: shikiThemes,
                defaultColor: false,
                transformers: [
                    {
                        pre(pre) {
                            pre.properties['data-language'] = instance.language;
                            return pre;
                        }
                    }, 
                    transformer(instance.meta)
                ]
            });

            const figure = root.children[0] as Element;

            // Replace original element
            instance.node.tagName = figure.tagName;
            instance.node.properties = {...figure.properties};
            instance.node.children = figure.children;
        }
    }
};

export default highlightCode;