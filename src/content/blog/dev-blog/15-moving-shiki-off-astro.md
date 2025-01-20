---
title: 'Astro update broke my code blocks!'
description: "Astro came out with version 5.1.7 recently that made unannounced breaking changes in its compatibility with various Shiki imports. Instead of trying to fix it, I moved Shiki completely off of Astro's integration instead."
pubDate: 'Feb 1 2025'
tags: ['astro', 'shiki', 'typescript']
---
Astro integrates a [compatibility build](https://shiki.style/guide/compat) of Shiki, but up until at least version 5.1.1, it was actually compatible with the fully featured Shiki v2.0.0. That's why I was able to highlight my inline code with `getSingletonHighlightCore` instead of the "compat" `createHighlighter`. I upgraded to 5.1.7 this morning and all my code blocks broke. I could've rolled it back, but I wanted to see what was up. 

If some context is needed, [this post](/2024-12-24-shiki-syntax-highlighting-for-inline-code-in-astro.html) explains a bit more in depth what I had to highlight inline code.

## The Problem

There were two problems. The first is that Astro insisted on using its own version of Shiki types. So every Shiki import became plagued with errors that looked like this.
```shell
Type 'import("j:/Projects/devblog-astro/node_modules/@shikijs/types/dist/index").ShikiTransformer' is not assignable to type 'import("j:/Projects/devblog-astro/node_modules/@astrojs/markdown-remark/node_modules/@shikijs/types/dist/index").ShikiTransformer'.
```
In this case, I was doing `import { ShikiTransformer } from 'shiki';{:typescript}`, but Astro really wanted me to use the identical version under `@astrojs/markdown-remark{:typescript}` that isn't even exposed/exported.

The second problem was more serious. I got the following error and neither my inline nor blocked code work.
```shell
ShikiError: Failed to parse Markdown file "J:\Projects\devblog-astro\src\content\blog\dev-blog\aws-deploy-series\14-cache-control\14-cache-control.md":
Must invoke loadWasm first.
    at new OnigString (file:///J:/Projects/devblog-astro/node_modules/@shikijs/engine-oniguruma/dist/index.mjs:259:19)
    at Object.createString (file:///J:/Projects/devblog-astro/node_modules/@shikijs/engine-oniguruma/dist/index.mjs:494:20)
    at Object.createOnigString (file:///J:/Projects/devblog-astro/node_modules/@shikijs/core/dist/index.mjs:1640:39)
    at Grammar.createOnigString (file:///J:/Projects/devblog-astro/node_modules/@shikijs/vscode-textmate/dist/index.mjs:2272:26)
    at Grammar._tokenize (file:///J:/Projects/devblog-astro/node_modules/@shikijs/vscode-textmate/dist/index.mjs:2428:31)
    at Grammar.tokenizeLine2 (file:///J:/Projects/devblog-astro/node_modules/@shikijs/vscode-textmate/dist/index.mjs:2366:20)
    at _tokenizeWithTheme (file:///J:/Projects/devblog-astro/node_modules/@shikijs/core/dist/index.mjs:863:28)
    at tokenizeWithTheme (file:///J:/Projects/devblog-astro/node_modules/@shikijs/core/dist/index.mjs:809:18)
    at codeToTokensBase (file:///J:/Projects/devblog-astro/node_modules/@shikijs/core/dist/index.mjs:785:10)
    at file:///J:/Projects/devblog-astro/node_modules/@shikijs/core/dist/index.mjs:982:21
16:25:22 [ERROR] [glob-loader] Error rendering dev-blog/aws-deploy-series/14-cache-control/14-cache-control.md: Failed to parse Markdown file "J:\Projects\devblog-astro\src\content\blog\dev-blog\aws-deploy-series\14-cache-control\14-cache-control.md":
Must invoke loadWasm first.
```
I tried filing a bug report with Astro, but their test environment on [StackBlitz](https://astro.new/repro) won't show the same error message. It just failed silently. After some digging, I figured out that I could get block code to work, but not inline code, by adding this line.
```typescript title=/astro.config.ts; start-line=3; highlight=[21]
import { createOniguramaEngine } from 'shiki/engine/onigurama';
// [!code skipto 10]
// https://astro.build/config
export default defineConfig({
    site: SITE_URL,
    integrations: [sitemap(), svelte()],
    markdown: {
        shikiConfig: {
            // [!code annotation] languages, themes, transformers, etc.
            // [!code skipto 21]
            engine: createOniguramaEngine(import('shiki/wasm'))
        }
    }
});
```
But it turned out this wasn't the main issue. 

### The _real_ problem

I eventually found that if I commented out specifically the lines that called the highlighter _outside_ of Astro integration and did e.g. `codeToHast` with it, the code would run (without highlighting my inline code of course). To fix it, it was something like this.
```typescript title=/src/markdown/inline-code.ts; dir-level-fade=1; highlight=[106:"'plaintext'"#error,155:"await h"#error]
import {
    //[!code skipto 8]
    getSingletonHighlighterCore //[!code --]
} from 'shiki';
import { createShikiHighlighter } from '@astrojs/markdown-remark';//[!code ++]
//[!code skipto 104]
const highlightCode = () => {
    const cachedHighlighter = getSingletonHighlighterCore({//[!code --]
        langs: [resolveLanguage('plaintext')],//[!code --]
        themes: Object.values(shikiThemes).map(resolveTheme)//[!code --]
    });//[!code --]
    const cachedHighlighter = createShikiHighlighter({//[!code ++]
    //[!code warning] Type 'string' is not assignable to type 'LanguageRegistration'.ts(2322)
        langs: ['plaintext'],//[!code ++]
        themes: shikiThemes //[!code ++]
    });//[!code ++]
    return async (tree: Root) => {
        //[!code skipto 151]
        const highlighter = await cachedHighlighter;
        for (const instance in inlineInstances) {
            const resolvedLanguage = resolveLanguage(instance.language);
            if (resolvedLanguage) {
                await highlighter.loadLanguage(//[!code --]
                    resolveLanguage(resolvedLanguage));//[!code --]
                await h
```
Uh, what? Astro's "convenience" function wraps around Shiki's `createHighlighter` and doesn't actually return a highlighter, making it impossible to add languages later. Not to mention it wrapping the parameters in unnecessary types.
```typescript title=astro/packages/markdown/remark/src/shiki.ts; start-line=72
export async function createShikiHighlighter({
	langs = [],
	theme = 'github-dark',
	themes = {},
	langAlias = {},
}: CreateShikiHighlighterOptions = {}): Promise<ShikiHighlighter> {
	theme = theme === 'css-variables' ? cssVariablesTheme() : theme;

	const highlighter = await createHighlighter({
		langs: ['plaintext', ...langs],
		langAlias,
		themes: Object.values(themes).length ? Object.values(themes) : [theme],
	});

	async function highlight(
        //[!code skipto 188]
	}

	return {
		codeToHast(code, lang, options = {}) {
			return highlight(code, lang, options, 'hast') as Promise<Root>;
		},
		codeToHtml(code, lang, options = {}) {
			return highlight(code, lang, options, 'html') as Promise<string>;
		},
	};
}
```
<cite>[Astro's createShikiHighlighter from its Github repo](https://github.com/withastro/astro/blob/7babf22b7fbcbe421f86f5ce8afdde7213c8d982/packages/markdown/remark/src/shiki.ts#L72)</cite>

If that's the case, I'd rather `import { createHighlighter } from 'shiki';` and set up `options.meta.__raw` myself.

## The solution

So we cut out any mention of "astro" from the script and end up with this.
```typescript title=/src/markdown/inline-code.ts; dir-level-fade=1; start-line=9;
import { createShikiHighlighter } from '@astrojs/markdown-remark';//[!code --]
import { createHighlighter } from 'shiki';
//[!code skipto 104]
const highlightCode = () => {
    const cachedHighlighter = createShikiHighlighter({//[!code --]
        langs: ['plaintext'],//[!code --]
        themes: shikiThemes //[!code --]
    });//[!code --]
    const cachedHighlighter = createHighlighter({//[!code ++]
        langs: ['plaintext'], //[!code ++]
        themes: Object.values(shikiThemes).map(//[!code ++]
            (theme: ThemeTypes) => resolveTheme(theme))//[!code ++]
    });//[!code ++]
    return async (tree: Root) => {
        //[!code skipto 151]
        const highlighter = await cachedHighlighter;
        for (const instance in inlineInstances) {
            const resolvedLanguage = resolveLanguage(instance.language);
            if (resolvedLanguage) {
                //[!code annotation] Shiki's highlighters have the same methods, so we didn't need to change this after all.
                await highlighter.loadLanguage(//[!code ++]
                    resolveLanguage(resolvedLanguage));//[!code ++]
```

Meanwhile, Astro is still complaining about the types, so I decided to just swap out its Shiki integration altogether, for both inline and code blocks.
```typescript title=/astro.config.ts
import type { ShikiConfig, AstroUserConfig } from 'astro';
// [!code skipto 5]
type MarkdownConfig = NonNullable<AstroUserConfig['markdown']>;
// [!code skipto 10]
export const config: Partial<MarkdownConfig> = {
    shikiConfig: {//[!code --]
        themes: shikiThemes,//[!code --]
        defaultColor: false,//[!code --]
        transformers: [transformer]//[!code --]
    },//[!code --]
    syntaxHighlight: false,//[!code ++]
    rehypePlugins: [highlightCode]
};
```
I already had the code to find inline code from HAST code (a tree representation of a document). All I need to do then is to add a branch to detect code blocks.
```typescript title=/src/markdown/inline-code.ts; highlight=[132-141]
import { Element, Text, Root } from 'hast';
import { visit } from 'unist-util-visit';
//[!code skipto 24]
const isInlineCode = (
    element: Element,
    parent: Element | Root | undefined
): boolean => {
    //[!code annotation] The default render of inline code is <code>Text</code>.
    return (
        element.tagName === 'code' &&
        parent.type === 'element' &&
        parent.tagName !== 'pre' &&
        element.children.length === 1 &&
        element.children[0].type === 'text'
    );
};
const isBlockCode = (
    element: Element,
    parent: Element | Root | undefined
): boolean => {
    //[!code annotation] The default render of a code block is <pre><code class=language-[language]>Text</code></pre>. The <pre> block distinguishes between inline and block code.
    return (
        element.tagName === 'pre' &&
        element.children.length === 1 &&
        element.children[0].type === 'element' &&
        element.children[0].tagName === 'code' &&
        element.children[0].children[0].type === 'text'
    );
};
//[!code skipto 100]
interface VisitCallback {
    node: Element;
    index?: number;
    parent?: Element | Root;
}
interface CodeInstance {
    node: Element;
    code: string;
    language: string;
    meta?: string
}
//[!code annotation] Inline code are expected to be in the format of Text{:Language}.
const regexp = /^(.+){:(\w+)}$/;
const highlightCode = () => {
    //[!code annotation] Create cached highlighter.
    //[!code skipto 117]
    return async(tree: Root) => {
        const inlineInstances: CodeInstance[] = [];
        const blockInstances: CodeInstance[] = [];
        //[!code annotation] Visit each element in the document in order.
        visit(tree, 'element', ({node, index, parent}: VisitCallback) => {
            if (isInlineCode(node, parent)) {
                const textNode = node.children[0] as Text;
                const match = textNode.value.match(regexp);
                if (match) {
                    const [_, code, language] = match;
                    inlineInstances.push({ node, code, language });
                }
                else {
                    inlineInstances.push({ node, code, 'plaintext' });
                }
            }
            else if (isBlockCode(node, parent)) {
                const codeElement = node.children[0] as Element;
                let meta = codeElement.data?.meta;
                if (!meta) meta = undefined;
                const textNode = codeElement.children[0] as Text;
                //[!code annotation] Expect <code class=language-[language]>.
                const language = (
                    codeElement.properties['className'] as string
                    )[0].split('-')[1];
                blockInstances.push({ node, code, language, meta });
            }
        });
//[!code skipto 151]
        const highlighter = await cachedHighlighter;
        for (const instance of inlineInstances) {
            //[!code annotation] Load languages if valid.
            //[!code skipto 163]
            const root = highlighter.codeToHast(instance.code, {
                lang: instance.language,
                themes: shikiThemes,
                defaultColor: false,
                transformers: [{
                    // Do some styling
                }]
            });
            const pre = root.children[0] as Element;
            const code = pre.children[0] as Element;
            instance.node.properties = {...pre.properties};
            instance.node.children = code.children;
        }
        for (const instance of blockInstances) {
            //[!code annotation] Load languages if valid.
            //[!code skipto 185]
            const root = highlighter.codeToHast(instance.code.trimEnd(), {
                lang: instance.language,
                themes: shikiThemes,
                defaultColor: false,
                transformers: [
                    {
                        pre(pre) {
                            pre.properties['data-language'] = instance.language;
                        }
                    },
                    //[!code annotation] Import all the code block transformers that used to run on shikiConfig.
                    transformer(instance.meta)
                ]
            });
            const figure = root.children[0] as Element;
            instance.node = {...figure, properties: {...figure.properties}};
        }
    }
};
export default highlightCode;
```

Finally, somewhere in the beginning of the transformers function, we need to initialize the meta data as it worked in Shiki.
```typescript highlight=[1:"metadata", 5:"metadata"]
const transformer = (metadata: string): ShikiTransformer => {
    return {
        preprocess(code, options) {
            options.meta = options.meta || {};
            options.meta.__raw = metadata;
            // [!code annotation] ... the rest of the transform
            // [!code skipto 128]
        }
    }
};
export default transformer;
```

## What's next?

I think there's no disadvantage to reducing dependencies. Before with the Astro integrations, I'm at the mercy of both Astro and Shiki. If either of these tools update, I may have to spend a day figuring it out. Now besides issues with Vite, I'm at the mercy of Shiki only. I can breathe easy updating Astro knowing that it likely won't mess with my blog posts, since the syntax highlighting is the most complicated piece of machinery in there. That trepidation shouldn't hold me back from potential bug fixes and new features.

One question remains: Is it still possible to _not_ use the `shiki/compat` `createHighlighter`? I'll be on the lookout for that, although this problem might be too involved for me right now. It seems to have something to do with Vite's interaction with web assembly, and that's not something I can diagnose easily. I'll most likely set this aside at some point and move on to the next project.