---
title: 'Shiki: Creating a new transformer for line skips'
description: "Splitting up long blocks of code into multiple blocks can cause breaks in context cues. Here, we create a new transformer that enables line skips into chunks within the same block."
pubDate: 'Dec 21 2024'
tags: ['typescript', 'shiki']
---
I found myself in the situation of wanting to analyze a long file of code, of which there are particular parts that are the most relevant. To do this, I could use redundant phrasing to direct a reader to focus on particular lines, or use multiple blocks of code to represent that various chunks of interest. Below are roughly speaking 3 methods that came to mind, from _worst_ to **best**.

## Three examples of ways to discuss long code
### One long block

_Reading one long block of code, even with highlights to call to attention, requires multiple passes of scanning back and forth to establish context, and to connect the descriptions to code. Presenting code in this way is tiresome to the reader._

Below is an example of a Rehype plugin. From line 233, the `visit` async function is called from the `unist-util-visit` package that traverses a HAST (tree) and calls a function for every node that matches the second argument -- in this case, nodes with type "element". The first iteration is to retrieve the languages of all blocks, on line 239. They are aggregated on line 241, and then dynamically loaded on line 266. Then on line 278, a second pass through the tree strips escape characters from the code before parsing it with a cached singleton of the Shiki highlighter object.

```typescript start-line=227; tab-size=2; highlight=[233,239,241,266,278]; title=rehype-pretty-code/packages/core/src/index.ts; 
  return async (tree) => {
    const langsToLoad = new Set<string>();
    const highlighter = await cachedHighlighter;
    if (!highlighter) return;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    visit(tree, 'element', (element, _, parent) => {
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;
        const lang = getInlineCodeLang(value, defaultInlineCodeLang);
        if (lang && lang[0] !== '.') {
          langsToLoad.add(lang);
        }
      }

      if (isBlockCode(element)) {
        const codeElement = element.children[0];
        if (!isElement(codeElement)) return;

        const { lang } = parseBlockMetaString(
          codeElement,
          filterMetaString,
          defaultCodeBlockLang,
        );

        if (lang) {
          langsToLoad.add(lang);
        }
      }
    });

    try {
      await Promise.allSettled(
        Array.from(langsToLoad).map((lang) => {
          try {
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
```
<cite>[Rehype inline code plugin](https://github.com/rehype-pretty/rehype-pretty-code/blob/master/packages/core/src/index.ts)</cite>

### Multiple blocks

_Breaking up the blocks allows more in-depth commentary without wasting effort on directing the reader's attention. It is much easier to focus and grasp the context when the code is limited to the vicinity of interest._

Below is an example of a Rehype plugin. First, the `visit` async function is called from the `unist-util-visit` package that traverses a HAST (tree) and calls a function for every node that matches the second argument -- in this case, nodes with type "element". The first iteration is to retrieve the languages, aggregating them in a `langsToLoad` Set (to eliminate redundancies).

```typescript start-line=227; tab-size=2; highlight=[233:12-21,241:0-21]; title=rehype-pretty-code/packages/core/src/index.ts; 
  return async (tree) => {
    const langsToLoad = new Set<string>();
    const highlighter = await cachedHighlighter;
    if (!highlighter) return;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    visit(tree, 'element', (element, _, parent) => {
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;
        const lang = getInlineCodeLang(value, defaultInlineCodeLang);
        if (lang && lang[0] !== '.') {
          langsToLoad.add(lang);
        }
      }
```
<cite>[Rehype inline code plugin](https://github.com/rehype-pretty/rehype-pretty-code/blob/master/packages/core/src/index.ts)</cite>

The retrieved languages are then dynamically loaded using a resolved singleton of a cached Shiki highlighter object. 

```typescript start-line=261; tab-size=2; highlight=[265-266]; title=rehype-pretty-code/packages/core/src/index.ts (cont'd); 
    try {
      await Promise.allSettled(
        Array.from(langsToLoad).map((lang) => {
          try {
            return highlighter.loadLanguage(
              lang as Parameters<typeof highlighter.loadLanguage>[0],
            );
          } catch (e) {
            return Promise.reject(e);
          }
```
<cite>[Rehype inline code plugin](https://github.com/rehype-pretty/rehype-pretty-code/blob/master/packages/core/src/index.ts)</cite>

A second pass through the tree strips escape characters from the code before parsing it with Shiki. The elements are checked for validity and the languages are tested to see if loading was successful.

```typescript start-line=277; tab-size=2; title=rehype-pretty-code/packages/core/src/index.ts (cont'd); 
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    visit(tree, 'element', (element, _, parent) => {
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;
```
<cite>[Rehype inline code plugin](https://github.com/rehype-pretty/rehype-pretty-code/blob/master/packages/core/src/index.ts)</cite>

## Multiple chunks in a block

_Although content-wise this version is nearly identical to the second one, describing specific lines of code right next to them maintains a single continuous context instead of forcing the reader to endure multiple subconscious context switches. It also allows for the separation of more general statements when context switches are necessary. In my opinion, this makes it much easier to read._

Below is an example of a Rehype plugin.

```typescript start-line=227; tab-size=2; highlight=[233:12-21,241:0-21, 265-266]; title=rehype-pretty-code/packages/core/src/index.ts; 
  return async (tree) => {
    const langsToLoad = new Set<string>();
    const highlighter = await cachedHighlighter;
    if (!highlighter) return;
    
// [!code annotation] The 'visit' async function is called from the 'unist-util-visit' package that traverses a HAST (tree) and calls a function for every node that matches the second argument -- in this case, nodes with type 'element'.
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    visit(tree, 'element', (element, _, parent) => {
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;
        // [!code annotation] The first iteration retrieves the language from each block, storing unique languages into a Set.
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
            // [!code annotation] After 'visit' is complete, the retrieved languages are then dynamically loaded using a resolved singleton of a cached Shiki highlighter object.
            return highlighter.loadLanguage(
              lang as Parameters<typeof highlighter.loadLanguage>[0],
            );
          } catch (e) {
            return Promise.reject(e);
          }
// [!code skipto 277]
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
    // [!code annotation] A second pass through the tree strips escape characters from the code before parsing it with Shiki. The elements are checked for validity and the languages are tested to see if loading was successful.
    visit(tree, 'element', (element, _, parent) => {
      if (isInlineCode(element, parent, bypassInlineCode)) {
        const textElement = element.children[0];
        if (!isText(textElement)) return;
        const value = textElement.value;
        if (!value) return;
```
<cite>[Rehype inline code plugin](https://github.com/rehype-pretty/rehype-pretty-code/blob/master/packages/core/src/index.ts)</cite>

## Another reason for a customized code block
It's a relief to pass Groundhog Day, I'm sure, but I hope I've impressed upon you the importance of a customized syntax highlighting environment. Even if you disagree with my ideas about what is easier to read, the more important point is that each blog author could advance their own ideas, making each blog stand out with a unique style.

What's more, it's not that hard to implement!

For the line skips shown above, first recall the overall form of a Transformer object.
```typescript title=/src/shiki/transforms/linebreaks.ts; dir-level-fade=1;
import { ShikiTransformer, CodeOptionsMeta } from 'shiki';
const transformer: ShikiTransformer = {
    // Hook functions...
};
export default transformer;
```
For each line that a skip occurs, we want to use a comment with a code to tell it which line to skip to. For example,
```typescript
// Line 1
// [!cоde skipto 261]
// Line 261
```
causes
```typescript
// Line 1
// [!code skipto 261]
// Line 261
```
This means that we should iterate through the lines of the raw code before tokenization to find these codes, then keep a map of line indices to the corresponding numbering.
```typescript title=/src/shiki/transforms/linebreaks.ts; dir-level-fade=1;
const transformer: ShikiTransformer = {
    preprocess(raw_code: string, meta: CodeOptionsMeta ) {
        const regexp: RegExp = /\[!code skipto (\d+)\]/;
        const lines: string[] = raw_code.split('\n');
        let lineNumber = 1;
        //[!code annotation] We use the meta object to pass objects between functions.
        meta['skipMap'] = new Map<number, number | null>();
        for (let i = 0; i < lines.length; i++) {
            const match: Array = lines[i].match(regexp);
            if (match) {
                const skipTo = parseInt(match[1]);
                if (!isNaN(skipTo)) {
                    //[!code annotation] Line index is 1-based. The skip itself is doesn't have a line number. Set the next line to the skip-to line.
                    meta['skipMap'].set(i + 1, null);
                    lineNumber = skipTo;
                }
            }
            else {
                //[!code annotation] Post-increment after assigning.
                meta['skipMap'].set(i + 1, lineNumber++);
            }
        }
    },
    // ...
};
```
Now we just need to add several elements to each line that matches our criteria.
```typescript title=/src/shiki/transforms/linebreaks.ts; dir-level-fade=1;
import { Element } from 'hast';
const createElement = (tagName: string): Element => ({
    type: 'element', tagName, properties: {}, children: []
});
const transformer: ShikiTransformer = {
    line(line: Element, index: number ) {
        // [!code annotation] Pass meta object from ShikiTransformer context.
        const skipMap: Map<number, number | null> = this.options.meta['skipMap'];
        const lineNumber: number | null = skipMap.get(index);
        if (lineNumber) {
            // [!code annotation] Create div to hold line number.
            const lineNumberDiv = createElement('div');
            lineNumberDiv.properties['data-line-number'] = '';
            lineNumberDiv.children = [{type: 'text', value: 
                lineNumber ? lineNumber.toString() : ' ' }];
            // [!code annotation] Put code tokens under sibling div.
            const lineCodeDiv = createElement('div');
            lineCodeDiv.properties['data-line-code'] = '';
            lineCodeDiv.children = line.children;
            line.children = [lineNumberDiv, lineCodeDiv];
        }
        else {
            // [!code annotation] Lines without a number are skips in this example.
            const lineSkip = createElement('div');
            lineSkip.properties['data-line-break-skip'] = '';
            const topSide = createElement('div');
            topSide.properties['data-line-break-top'] = '';
            const bottomSide = createElement('div');
            bottomSide.properties['data-line-break-bottom'] = '';
            line.properties['data-line-break'] = '';
            line.children = [topSide, lineSkip, bottomSide];
        }
        return line;
    },
    // ...
};
```
Finally, we can give some basic styling that approximates what it looks like above.
```css
.astro-code {
    & span[data-line-break] {
        /* [!code annotation] We want [topSide, lineSkip, bottomSide] to flow vertically. */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 4rem;

        & [data-line-break-top],
        & [data-line-break-bottom] {
            /* [!code annotation] The sides should have the same color as the theme background. */
            @media (prefers-color-scheme: light) {
                background-color: var(--shiki-light-bg);
            }
            @media (prefers-color-scheme: dark) {
                background-color: var(--shiki-dark-bg);
            }
            /* [!code annotation] Keep size fixed. */
            flex-basis: 1rem;
            flex-grow: 0;
            flex-shrink: 0;
        }

        & [data-line-break-top] {
            /* [!code annotation] Add some drop shadow from the top. Realistically the colors here need to be styled by theme as well. */
            box-shadow: 0px 5px 0.75rem 0.4rem #999
        }

        & [data-line-break-skip] {
            background-color: grey;
            flex-basis: 2rem;
            flex-grow: 0;
            flex-shrink: 0;
        }
    }
}
```
Obviously, the styles could use some tuning, but the code here took about half an hour to write. I've spent more time just trying to get the font right in Wordpress.