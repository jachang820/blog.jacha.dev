# Code Block Reference

## Code Block

The code block is a number of transformers built on top of (Shiki)[https://shiki.style/guide/transformers]. I needed some functionality not supported out of the box in either Shiki or (Rehype Pretty)[https://rehype-pretty.pages.dev/] (and Rehype has a lot of functionality I don't want). So I made my own.

### meta: string

Out of the box, Shiki parses a raw meta (or info) string to pass in options.

````markdown
```javascript title="Example" startLine=5 {1-3,4}
// some code
```
````

This starts to get pretty unweldy. With more options, it would be desirable to move these into their own lines, into a meta data section. We'd need to determine the fence to keep this meta data separate from the code. That's what `meta` does, its assigned value being the fence. For example,

````markdown
```javascript meta="---"
---
title="Example"
start-line=5
highlight=[1-3,4]
---
// some code
```
````

### start-line: integer

Line numbers are automatic. `start-line` specifies the line number to show for the first line of code. Every line thereafter is incremented.

### highlight: `\[...startLine[-endLine[:startIndex[-endIndex[#id]]]]]\]`

Both line and range highlighting are allowed. Word matching should be simple to implement at a future time. For now, a single line or a range of lines could be specified, and for either a range of indices could be specified. If only one index is specified, then the rest of the line is highlighted from that character. An HTML attribute `data-highlighted-chars-id` could also be specified for custom styling. For example,

Second line highlighted:
````markdown
```javascript highlight=[2]
const message = "Hello world!";
console.log(message); // line highlighted
```
````

Both lines highlighted:
````markdown
```javascript highlight=[1-2]
const message = "Hello world!"; // line highlighted
console.log(message); // line highlighted
```
````

`message` in the second line highlighted:
````markdown
```javascript highlight=[2:12-19]
const message = "Hello world!";
console.log(**message**); // "message" highlighted
```
````

`message` in both lines highlighted and assigned attribute `data-highlighted-chars-id="message"`:
````markdown
```javascript highlight=[1:6-13#message,2:12-19#message]
const **message** = "Hello world!";
console.log(**message**);
```
````

### title: string

Give a title or file name to the code block. Code language is automatically pulled from the meta info string and displayed on the upper right. Title is displayed on the upper left.

### directory-level-fade: integer

Long directories in the code block title, such as `/src/pages/blog/tag/[tag]/[page].astro` could get tiresome to read. It would be helpful to put focus on the directories closer to the leaf nodes with more variation, since it is likely that most files might tend to exist under, say, `/src/` or `/src/pages/`. When a "level" is specified, the higher level directories (on the left) are greyed out. For example, to get something like:

> /src/pages **/blog/tag/[tag]/[page].astro**

the following could be specified.

````markdown
```astro meta="---"
title="/src/pages/blog/tag/[tag]/[page].astro"
directory-level-fade=2
```
````

### tab-size: integer

Whitespaces in the code are automatically converted to symbols representing spaces or tabs, for easier reading in my opinion. `tab-size` specifies the number of spaces that a tab takes up.

````markdown
```javascript tab-size=4
⇥   ⇥   const message = "Hello world!"; // tab
········console.log(message); // spaces
```
````

### Citations

While not part of the code block, CSS can be used to attribute a source to it, making it easier to copy code examples.

````markdown
```javascript
const myHeading = document.querySelector("h1");
myHeading.textContent = "Hello world!";
```
<cite>[Mozilla: Javascript tutorial](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Adding_interactivity)</cite>
````
We can use styles like this.
```css
figure[data-code-block-figure] + p:has(cite) {
    margin-top: 0;
    font-size: 0.875em;
    font-style: italic;

    &::before {
        content: 'Source: ';
        font-style: normal;
    }
}
```

#### Output
```javascript
const myHeading = document.querySelector("h1");
myHeading.textContent = "Hello world!";
```
Source: [_Mozilla: Javascript tutorial_](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Adding_interactivity)

### Diff

Diff transformers are imported from [Shiki transformers](https://github.com/shikijs/shiki/blob/main/packages/transformers/src/transformers/notation-diff.ts). Adding `[!code ++]` and `[!code --]` in comments (with a space in between) at the end of a line gives the line some additional classes, which are used to highlight them and prefix them with "++" and "--" respectively, specifying them as changes from an original code.

### Annotation / Log / Warning / Error Line Messages

Lines beginning with a comment and `[!code (level)]`, then a message, where `(level)` is either `annotation | log | warning | error`, are highlighted with an appropriate icon on the left. This is inspired from (TwoSlash)[https://shiki.style/packages/twoslash]. To be clear,

````markdown
```css
/* [!code warning] Older browsers may not render this. */
@layer reset, layout;
```
````

#### Output

The output will be similar to

<span style="background-color: #c37d0d20; color: #c37d0d;">⚠ Older browsers may not render this.</span>
```css
@layer reset, layout;
```

## Inline Code

`unist-util-visit` package can take in an HTML tree, convert it to hast code and iterate through it. This can be used to make a Rehype plugin, since we can't directly access inline code from Markdown content in frameworks like Astro. Plugins can be something like

```typescript
const regexp = /^(.+){:(\w+)}$/;
type InlineCode = {node: Element, code: string, language: string};
const rehypePlugin = () => {
    return async (tree: Root) => {
        
        // Instances of inline code found
        const instances: InlineCode[] = [];

        visit(tree, 'element', (node: Element, 
                                index: number | undefined,
                                parent: Element | Root | undefined) => {
            // Detect inline code
            if (node.type === 'element' &&
                node.tagName === 'code' &&
                node.children.length === 1 &&
                node.children[0].type === 'text'
            ) {
                const match = node.children[0].value.match(regexp);
                if (match) {
                    const [_, code, language] = match;
                    instances.push({ node, code, language });
                }
            }
        });
    };
};
```

This detects inline code with a particular suffix pattern to be picked up for syntax highlighting, such as `console.log("Hello world!");{:javascript}`.