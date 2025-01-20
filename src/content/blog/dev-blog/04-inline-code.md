---
title: 'Shiki: Syntax highlighting for inline code in Astro'
description: "Astro has Shiki built-in for code blocks, but the integration configurations don't work for inline code. How do we apply the settings to other contexts?"
pubDate: 'Dec 24 2024'
tags: ['typescript', 'shiki']
---
**Note:** Between Astro version 5.1.1 and 5.1.7, `getSingletonHighlighterCore` no longer works. There is a "must invoke loadWasm first" error, but Vite module runner crashes when web assemblies are loaded. Luckily, the compatible alternative `createHighlighter` has mostly the same interface and methods, except perhaps that it doesn't handle caching out of the box. See [this post](/2025-02-01-astro-update-broke-my-code-blocks.html) for more details.

Astro is shipped with Shiki, which can be configured directly through its built-in `defineConfig` function.
```typescript title=/astro.config.ts; highlight=[13]
export default defineConfig({
    // ...
    markdown: {
        shikiConfig: {
            themes: {
                light: 'github-light-default',
                dark: 'github-dark-dimmed',
            },
            defaultColor: false,
            transformers: [],
            // ...
        },
        rehypePlugins: [],
        remarkPlugins: [],
        // ...
    }
});
```
Reading through the documentation, I noticed that there is no option to also apply Shiki to anything besides code blocks in Markdown content. If we wanted to add syntax highlighting elsewhere, how do we do it? The answer lies in the `rehypePlugins` that are applied to HTML (as opposed to `remarkPlugins` that are applied to Markdown), and we could gather some inspiration from the Rehype Pretty Code library for how to build one.

## Figuring out the Rehype plugin

The specific goal is to apply syntax highlighting to inline code (fenced by a single backtick in Markdown). Right-clicking the element in a browser, we see that the generated code looks like this.
```html
<!-- [!code annotation] Block code. -->
<pre class="astro-code astro-code-themes">
    <code>
        <span class="line">
            <span style="--shiki-dark:#F47067">export default </span>
            <span style="--shiki-dark:#DCBDFB">defineConfig</span>
            <span style="--shiki-dark:#F69D50">({</span>
        </span>
        <!-- more lines... -->
    </code>
</pre>
<!-- [!code annotation] Inline code. -->
<code>export default defineConfig({</code>
```
So the pattern that we have to match in the tree is a `<code>{:html}` without a `<pre>{:html}` parent or parent with the class `.astro-code`, and only has text as a child. We can define a function that looks like this.
```typescript highlight=[6:0-24, 10:0-23]
import { ElementContent } from 'hast';
const isInlineCode = (node: ElementContent, parent: ElementContent): boolean => {
    return (
        node.type === 'element' && parent.type === 'element' &&
        (
            parent.tagName !== 'pre' || 
            !('class' in parent.properties) ||
            !parent.properties['class'].includes(astro-code)
        ) &&
        node.tagName === 'code' &&
        node.children[0].type === 'text'
    );
};
```
We'll see something similar in Rehype Pretty's code base. The following is an excert from the Github repository of Rehype Pretty Code. Specifically, it's from the file [/packages/core/src/index.ts](https://github.com/rehype-pretty/rehype-pretty-code/blob/master/packages/core/src/index.ts).
```typescript start-line=227; title=rehype-pretty-code/packages/core/src/index.ts; tab-size=2;
return async (tree) => {
    // [!code annotation] The cachedHighlighter is an instance of Shiki. It's meant to be a singleton, such that all languages and themes are loaded and processed only once, instead of having to do so at every code block.
    const langsToLoad = new Set<string>();
    const highlighter = await cachedHighlighter;
    if (!highlighter) return;

    // [!code annotation] This function comes from the 'unist-util-visit' package. It's an in-order traversal through a HAST (tree) representing an HTML element (1st argument) that runs a given function (3rd argument) on nodes that match a criteria (2nd argument). In this case, it runs for all node.type === 'element'.
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    visit(tree, 'element', (element, _, parent) => {
      // [!code annotation] Current node matches the inline code pattern described above.
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;
        // [!code annotation] Code either has a language denoted by a suffix containing {:language}, or its 'plaintext'. All languages are added into a Set.
        const lang = getInlineCodeLang(value, defaultInlineCodeLang);
        if (lang && lang[0] !== '.') {
          langsToLoad.add(lang);
        }
      }
// [!code skipto 261]
    try {
      await Promise.allSettled(
        Array.from(langsToLoad).map((lang) => {
          try {
            // [!code annotation] Load all languages found into the singlton instance of Shiki so it can be processed once for all code blocks.
            return highlighter.loadLanguage(
              lang as Parameters<typeof highlighter.loadLanguage>[0],
            );
          } catch (e) {
            return Promise.reject(e);
          }
        }),
      );
    } catch (e) {
      console.error(e);
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    visit(tree, 'element', (element, _, parent) => {
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;

        // [!code annotation] This part looks identical to the implementation getInlineCodeLang, which was also called in the first iteration, except that it also strips the language part from the code.
        const keepLangPart = /\\{:[a-zA-Z.-]+}$/.test(value);
        const strippedValue = keepLangPart
          ? value.replace(/\\({:[a-zA-Z.-]+})$/, '$1')
          : value.replace(/{:[a-zA-Z.-]+}$/, '');
        textElement.value = strippedValue;
        const lang = keepLangPart
          ? ''
          : getInlineCodeLang(value, defaultInlineCodeLang);
        const isLang = lang[0] !== '.';
        if (!lang) return;

        let codeTree: Root;

        // [!code annotation] In this second iteration through the tree, run the syntax highlighting on the code using its language, which should have been loaded from the first iteration.
        if (isLang) {
          try {
            codeTree = hastParser.parse(
              highlighter.codeToHtml(strippedValue, getOptions(lang)),
            );
          } catch {
            codeTree = hastParser.parse(
              highlighter.codeToHtml(strippedValue, getOptions('plaintext')),
            );
          }
        } else {
```
In my opinion, that was quite redundant, though to be fair since we're not publishing our blog on `npm`, we can get away with narrowing the scope a bit. Specifically, the following code that we'll adapt will only work on bundled languages and themes, which we assume will be global. In other words, there won't be one code block with one theme, and another block with some other theme. Though, if this is desired, it can be achieved by naming different theme options, or caching multiple highlighters.

The most significant change I propose is that instead of adding languages into a Set in the first traversal, we add the language, the code and maybe even a reference to the node containing the code in an object. That way we will only need a single traversal, since we'll have a list of every inline code element on a page in an Array. I'm not sure why Shiki found it necessary to be so wordy, but maybe that's my inexperience talking?

## Figuring out the Shiki highlighter

Since this is being done for a single blog, we will leverage the existing config Astro has so that we don't have to define themes in two different places. So in `astro.config.ts`, we could move our Shiki themes to a common file so that they could be referenced. We'll also add a Rehype plugin at this time.
```typescript title=/astro.config.ts
import { shikiThemes } from './src/markdown/settings';
import inlineCodePlugin from './src/markdown/inline-code';

export default defineConfig({
    // ...
    markdown: {
        shikiConfig: {
            themes: shikiThemes,
            // ...
        },
        rehypePlugins: [inlineCodePlugin],
        // ...
    }
});
```
```typescript title=/src/markdown/settings.ts; dir-level-fade=1
import type { ThemePresets } from '@astrojs/markdown-remark';
import type { ThemeRegistration, ThemeRegistrationRaw } from 'shiki';
import type { ShikiConfig } from 'astro';

export type ThemeTypes = type ThemeTypes = 
    ThemeRegistration | ThemeRegistrationRaw | ThemePresets;
export type ShikiThemes = Record<string, ThemeTypes>;

export const shikiThemes: ShikiThemes =  {
    light: 'github-light-default',
    dark: 'github-dark-dimmed',
};
export const shikiConfig: Partial<ShikiConfig> = {
    themes: shikiThemes,
    defaultColor: false,
    transformers: []
};
// ... etc.
```
Astro's configs expect certain types like the ones in the Record above. It throws an error if we try to directly assert it "as string". However, the Shiki highlighter expects yet _another_ type. Most blogs will probably just use the bundled themes and languages in Shiki instead of defining their own, so that is what we'll assume. This time, we take a hint from Shiki's [bundle-factory.ts](https://github.com/shikijs/shiki/blob/main/packages/core/src/constructors/bundle-factory.ts)

```typescript title=shiki/packages/core/src/constructors/bundle-factory.ts; start-line=68; highlight=[73-74]
export function createdBundledHighlighter<BundledLangs extends string, BundledThemes extends string>(
  arg1: Record<BundledLangs, LanguageInput> | CreatedBundledHighlighterOptions<BundledLangs, BundledThemes>,
  arg2?: Record<BundledThemes, ThemeInput>,
  arg3?: HighlighterCoreOptions['loadWasm'],
): CreateHighlighterFactory<BundledLangs, BundledThemes> {
  let bundledLanguages: Record<BundledLangs, LanguageInput>
  let bundledThemes: Record<BundledThemes, ThemeInput>
  let engine: () => Awaitable<RegexEngine>
// [!code skipto 105]
    function resolveTheme(theme: ThemeInput | BundledThemes | SpecialTheme): ThemeInput | SpecialTheme {
      if (isSpecialTheme(theme))
        return 'none'
      // [!code annotation] Since the themes in Astro's config are all defined by string, the bundledTheme here is the only type that's relevant. This object is declared on line 74, which takes in a BundledThemes type as key, returning a ThemeInput as value.
      if (typeof theme === 'string') {
        const bundle = bundledThemes[theme]
        if (!bundle)
          throw new ShikiError(`Theme \`${theme}\` is not included in this bundle. You may want to load it from external source.`)
        return bundle
      }
      return theme
    }
```
Therefore, our own simplified version of a "resolve" function should input Astro's expected types, and output as described above.
```typescript title=/src/markdown/inline-code.ts; dir-level-fade=1
import { type ThemeTypes, shikiThemes } from './settings';
import type { 
    ThemeInput, LanguageInput, 
    BundledThemes, BundledLanguages,
    getSingletonHighlighterCore, 
    HighlighterCore 
} from 'shiki';
import type { Element } from 'hast';

const resolveLanguage = (languageText: string): LanguageInput => {
    return bundledLanguages[languageText as BundledLanguages];
};
const resolveTheme = (themeText: ThemeTypes): ThemeInput => {
    return bundledThemes[(themeText! as string) as BundledThemes];
};
```

Now that the highlighter settings are ready, we can now initialize the cached highlighter and write a function to load languages, which seems to be a large consideration in the Rehype Pretty Code example. We'll also define an interface for the data that will be extracted from each inline code instance we encounter from the `visit` function tree traversal.
```typescript title=/src/markdown/inline-code.ts; dir-level-fade=1; start-line=17; highlight=[22-27]
interface InlineCodeInstance {
    node: Element,
    code: string,
    language: string
}
//[!code warning] At some version between Astro 5.1.1 and 5.1.7, getSingletonHighlighterCore is no longer compatible. Use "import { createHighlighter } from 'shiki';" instead.
const getCachedHighlighter = (): Promise<HighlighterCore> => {
    return getSingletonHighlighterCore({
        langs: [resolveLanguage('plaintext')], 
        themes: Object.values(shikiThemes).map(resolveTheme)
    });
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
            // [!code annotation] If language is not recognized by Shiki to be one of its bundled languages, then interpret it as plain text.
            console.error(
                "Invalid language on inline code, using 'plaintext' instead.",
                instance.code);
            instance.language = 'plaintext';
        }
        // [!code annotation] Add loaded languages to a set to prevent redundant loading.
        loadedLanguages.add(instance.language);
    }
};
```
## Putting it all together

Now let's actually create the plugin, find all instances of inline code with a tree traversal, then run syntax highlighting on those nodes. Rather than using an in-house traversal for this one, we'll just go ahead and `npm install unist-util-visit{:shell}`.
```typescript title=/src/markdown/inline-code.ts; dir-level-fade=1; start-line=48
const inlineCodePlugin = () => {
    const cachedHighlighter = getCachedHighlighter();
    return async (tree: Root) => {
        const instances: InlineCodeInstance[] = [];
        const loadedLanguages: Set<string> = new Set(['plaintext']);
        // [!code annotation] Retrieve all instances of inline code in document.
        visit(tree, 'element', (node: Element, 
                                _index: number | undefined,
                                parent: Element | Root | undefined) => {

            if (isInlineCode(node, parent)) {
                const textNode = node.children[0] as Text;
                const value: string = textNode.value;
                // [!code annotation] Match code{:language}, where language conists of one or more alphabet characters. Example: For "const x = 5;{:js}", code = "const x = 5;", and language = "js".
                const match: Array = value.match(/^(.+){:(\w+)}$/);
                if (match) {
                    const [_matchText, code, language] = match;
                    // [!code annotation] Store a reference to the Element, and separate code from the language (from {:language}). The example from Rehype Pretty Code only extracted the language, and had to take a second iteration to strip the language from the code. Since we get both the code and language from the regular expression, we can easily strip the language by replacing the contents with just the code.
                    instances.push({ node, code, language });
                }
                else {
                    // [!code annotation] If no language is passed, then interpret it as plain text. Shiki will still color it with the theme font and background, maintaining a uniform look.
                    instances.push({ node, code: value, language: 'plaintext' });
                }
            }
        });

        const highlighter = await cachedHighlighter;
        for (const instance of instances) {
            await loadLanguage(highlighter, instance, loadedLanguages);
            // [!code annotation] Create a new tree containing all the syntax highlighting for each inline code instance. The themes and languages are already loaded, but we can tell Shiki which we want it to interpret with. The output will be a HAST since it's a Rehype plugin. 
            const newRoot = highlighter.codeToHast(instance.code, {
                lang: instance.language, 
                themes: shikiThemes,
                // [!code annotation] Shiki adds CSS variables for both light and dark themes if there's no default.
                defaultColor: false
            });
            // [!code annotation] Replace the original <code> element with the syntax highlighted one.
            const newPre = newRoot.children[0] as Element;
            const newCode = newPre.children[0] as Element;
            instance.node = newCode;
            instance.node.properties = newPre.properties;
            instance.node.properties['data-inline-code'] = '';

            // [!code annotation] Replace shiki with astro-code by convention.
            const classes: Array = instance.node.properties['class'];
            instance.node.properties['class'] = classes.map(
                (className: string) => className.replace('shiki', 'astro-code'));
        }
    }
};
export default inlineCodePlugin;
```

When Astro intreprets Markdown content, it will now call the Rehype plugin we just built, then convert the output back to HTML. To show that this works \`const x = 5;{:js}\` now renders to (without escape characters): `const x = 5;{:js}`