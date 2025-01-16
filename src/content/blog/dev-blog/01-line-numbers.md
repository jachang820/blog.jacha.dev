---
title: 'Shiki: Line numbering for Shiki syntax highlighting'
description: "Unlike Prism.js and Highlight.js, Shiki doesn't ship with line numbering out of the box. Here's how I implemented it."
pubDate: 'Dec 14 2024'
tags: ['typescript', 'shiki']
---
Conventional wisdom states that new bloggers should focus on content instead of trying to build their own platforms, but for a dev blogger being able to dictate how a block of code looks is significant for quality of life. If I'm going to spend a lot of time discussing code, then it helps to be able to cite line numbers and sources to give context when code is copied from somewhere. It helps to be able to distinguish between in-code comments and comments used to discuss code for blogging purposes. It helps to label filenames and languages without again polluting code comments. And all of these issues are why platforms such as Medium are a no-go for me, besides the annoying paywall. There just isn't the customization I desire.

Before switching to Shiki, I wrote another piece of code to try to get highlight.js to output the format I wanted. A key problem was regarding code with multiple syntaxes in one file, such as with Astro or React components. highlight.js struggled here, and I had to add some Javascript to break code into sub-blocks so the library could interpret them as different languages. I switched to Shiki because it doesn't have this problem. But Shiki also doesn't support line numbering or a lot of other things out of the box.

The other reason for using Shiki is that it is shipped with Astro by default, though this is both a pro and a con. The disadvantage is that the integration forces customizations to be applied after the fact. For example, I wouldn't be able to apply CSS variables at the time that a code block is created, before the syntax highlighting starts. This makes solutions that rely purely on CSS such as [this](https://github.com/shikijs/shiki/issues/3#issuecomment-881312748) impractical, unless I resign to hacky methods such as `<style>{:html}` tags right before a code fence in Markdown.

## The plan

Let's start with a vision, a proposal, for how lines of code should _generally_ behave. Below is a block demonstrating what it usually looks like when long lines wrap around.

<style>
    .line-numbers-2024-12-20 [data-line-code-pre-ws] {
        display: inline;
        box-sizing: border-box;
        border: 2px solid rgb(204 117 117);
        background-color: rgb(204 117 117 / 0.2);
    }
    .line-numbers-2024-12-20 [data-line-code] {
        text-indent: 0;
    }
</style>
```javascript add-classes = line-numbers-2024-12-20
if (deeply) {
     if (nested) {
          if (block) {
               if (endIndex < startIndex) {
                    console.error("This is a really long error meant to cause the line to wrap around and around, making many code blocks look like crap.");
               }
          }
     }
}
```
In the following block, the whitespace preceding each line is in its own `inline-block` span, causing the wrap-around the start at a more appropriate indent.
```javascript add-classes = line-numbers-2024-12-20
if (deeply) {
    if (nested) {
        if (block) {
            if (endIndex < startIndex) {
                console.error("This is a really long error meant to cause the line to wrap around and around, making many code blocks look like crap.");
            }
        }
    }
}
```
Then, with a bit of CSS (`text-indent: 4ch hanging;{:css}`), we can create a single indent _from the start of the text_.
<style>
    .line-numbers-2024-12-20.latest-2024-12-20 [data-line-code] {
        text-indent: 4ch hanging;
    }
</style>
```javascript add-classes = line-numbers-2024-12-20 latest-2024-12-20
if (deeply) {
    if (nested) {
        if (block) {
            if (endIndex < startIndex) {
                console.error("This is a really long error meant to cause the line to wrap around and around, making many code blocks look like crap.");
            }
        }
    }
}
```
This version is what we're making. What does this have to do with line numbers? Since we're already breaking up the line, might as well do this at once.

Shiki uses the [Hypertext Abstract Syntax Tree (hast)](https://github.com/syntax-tree/hast) to represent HTML elements. Each line is represented by a `<span>{:html}` element, and beneath that are a number of spans for each time the code changes color. These "token" spans each have exactly one text element as child. In other words,
```plaintext
[Element tagName: span, class: line]
    [Element tagName: span]
        [Text value: console.]
    [Element tagName: span]
        [Text value: error]
    [Element tagName: span]
        [Text value: (]
    [Element tagName: span]
        [Text value: "This is a really long error..."]
    [Element tagName: span]
        [Text value: );]
```
<style>
    .boxes-2024-12-20 [data-line-code] span {
        box-sizing: border-box;
        @media (prefers-color-scheme: light) {
            opacity: 0.8;
            border: 1px solid var(--shiki-light);
        }
        @media (prefers-color-scheme: dark) {
            border: 2px solid var(--shiki-dark);
        }

        &[data-line-space] {
            border: 0;
        }
    }
</style>
```javascript add-classes = line-numbers-2024-12-20 boxes-2024-12-20
console.error("This is a really long error...");
```
## Shiki Transformers
[Shiki Transformers](https://shiki.style/guide/transformers) were introduced as a feature some time in the past year to allow users to hook into different parts of the syntax highlighting process and inject code to alter the output. For this task, we'll be hooking into when each **line** is created. Note that to keep things succinct, we'll leave out some of the type and error checking.
```typescript meta=---
---
title = /src/shiki/transforms/linenumbers.ts
dir-level-fade = 1
---
import type { ShikiTransformer } from 'shiki';
import type { Element, Text } from 'hast';

// [!code annotation] Helper function to reduce number of lines it takes to create an element.
const createElement = (tagName: string): Element => {
    return { type: 'element', tagName, properties: {}, children: []};
}

const transformer: ShikiTransformer = {
    line(line: Element, index: number) {
        // [!code annotation] We leverage the fact that the whitespace at beginnings of lines are always attached to the first color of code.
        const firstTextSpan = line.children[0] as Element;
        const textNode = firstTextSpan.children[0] as Text;
        const text: string = textNode.value;
        // [!code annotation] Match all whitespace that starts from the beginning of the text. 
        const match: string = text.match(/^\s*/g)![0];
        // [!code annotation] Split the whitespace from the element.
        const splitSpan = createElement('span');
        splitSpan.children = [{ type: 'text', value: match }];
        firstTextSpan.children = [{ type: 'text', value: text.slice(match.length)}];
        // [!code annotation] Create divs for the different line parts.
        const lineNumberDiv = createElement('div');
        lineNumberDiv.properties['data-line-number'] = '';
        lineNumberDiv.children = [{ type: 'text', value: index.toString() }];
        
        const lineWhitespaceDiv = createElement('div');
        lineWhitespaceDiv.properties['data-line-whitespace'] = '';
        lineWhitespaceDiv.children = [splitSpan];
        
        const lineCodeDiv = createElement('div');
        lineCodeDiv.properties['data-line-code'] = '';
        lineCodeDiv.children = line.children;
        // [!code annotation] Place these divs under the line.
        line.properties['data-line'] = '';
        line.children = [lineNumberDiv, lineWhitespaceDiv, lineCodeDiv];
        return line;
    },
    code(code) {
        // [!code annotation] <code> block wraps all the lines. Use digits to set styling.
        const numLines = code.children.length;
        code.properties['data-line-number-digits'] = numLines.toString();
        return code;
    }
};

export default transformer;
```

## Styling
Complete styling might be too much in a post, but I'll include some essentials. Astro changes class on the outer `<pre>{:html}` tag from `shiki-code` to `astro-code`, so I'll use that.
```css
.astro-code {
    & code {
        /* [!code annotation] Extend every line to end even for short lines. */
        display: grid;
        /* [!code annotation] Give more spacing depending on line numbering digits. */
        &[data-line-number-digits="1"],
        &[data-line-number-digits="2"] {
            width: 1.5rem;
        }
        &[data-line-number-digits="3"] {
            width: 2.25rem;
        }
        &[data-line-number-digits="4"] {
            width: 3rem;
        }
    }

    & [data-line] {
        /* [!code annotation] Make sure to wrap long lines. */
        display: flex;
        white-space: pre-wrap;
        overflow-x: hidden;
        justify-content: flex-start;
        align-items: start;

        & [data-line-number] {
            /* [!code annotation] These make the number appear in the upper right of a line (in case of a wrapped line). */
            display: inline-block;
            height: 100%;
            text-align: right;
            vertical-align: top;
            /* [!code annotation] Give a light gray color and line separating the numbering. Realistically, use @media for dark themes. */
            padding-right: 0.5rem;
            color: #bbb;
            border-right: 1px solid #bbb;
            /* [!code annotation] Prevent line numbers from shifting when browser width is adjusted. */
            flex-grow: 0;
			flex-shrink: 0;
        }

        & [data-line-whitespace] {
            /* [!code annotation] Prevent whitespace from collapsing on small screens. */
            display: inline-block;
            vertical-align: top;
            height: 100%;
            flex-shrink: 0;
        }

        & [data-line-code] {
            display: inline-block;
            vertical-align: top;
            height: 100%;
            /* [!code annotation] Wrap long lines with a hanging indent. */
            text-wrap: wrap;
            text-indent: 4ch hanging;
        }
    }
}
```