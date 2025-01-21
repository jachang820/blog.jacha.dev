---
title: 'Code Block Reference'
description: 'I made my own syntax highlighted code block on top of Shiki.'
pubDate: 'Dec 10 2024'
tags: ['markdown', 'typescript']
---

## Code Block

The code block is a number of transformers built on top of [Shiki](https://shiki.style/guide/transformers). I needed some functionality not supported out of the box in either Shiki or [Rehype Pretty](https://rehype-pretty.pages.dev/) (and Rehype has a lot of functionality I don't want). So I made my own. Some important considerations are that

- Long lines should wrap into multiple lines at a reasonable indent level. They should not interfere with the line numbering, at any browser width.
- There should be flexibility in highlighting and annotations that make discussing the code easier.
- The ability to cite sources is a must.
- It must be easy to start the code with any indentation level without having to make the actual code ugly due to mismatched indentations. Luckily, using Markdown processing makes this much easier. Picture this:

```html
<body>
    <div class="content">
        <h1>Sample Code</h1>
        <pre>
The code must start all the way back here to get rid of unnecessary
whitespace, despite the html being two tabs in at this point. This
violates my aesthetic sense.
        </pre>
    </div>
</body>
```
- Meta options should be easy to write and read.
- Functionality should be easy to extend.

Much of the advances here are in the CSS and elements that are created to make it work. For example, it would have been easy to create line numbers with CSS, as oft suggested on Stack Overflow.
```css
code {
    counter-set: step;
    counter-increment: step 0;

    .line::before {
        content: counter(step);
        counter-increment: step;
        width: 2.5rem;
        text-align: right;
        border-right: 1px solid gray;
    }
}
```
However, this would have failed as soon as a line of code wraps around, or a message or diff requires the numbering to skip a line.

Nevertheless, the major features that were added are listed below.

### meta: string

Out of the box, Shiki parses a raw meta (or info) string to pass in options.

````markdown
```javascript title="Example" startLine=5 {1-2,4}
// some code
```
````

To make parsing easier, I changed the meta data to be delimited by semi-colons. Spacing can be added or omitted around any of the terms and they will be stripped.

````markdown
```javascript title = Example; start-line=5;highlight = [5-6,8]
// some code
```
````

However, this starts to get pretty unweldy. With more options, it would be desirable to move these into their own lines, into a meta data section. We'd need to determine the fence to keep this meta data separate from the code. That's what `meta` does, its assigned value being the fence. For example,

````markdown title=Example; start-line=5; highlight=[5,7-9]
```javascript meta=---;//[!code skipline]
---//[!code skipline]
title=Example//[!code skipline]
start-line=5//[!code skipline]
highlight=[5, 7-9]//[!code skipline]
---//[!code skipline]
// Retrieve all instances of inline code in document
visit(tree, 'element', (
    node: Element, 
    _index: number | undefined,
    parent: Element | Root | undefined
) => {
```//[!code skipline]
````

### start-line: integer = 1

Line numbers are automatic. `start-line` specifies the line number to show for the first line of code. Every line thereafter is incremented.

````markdown start-line=99
```javascript start-line=99 //[!code skipline]
const message = "Hello world!";
console.log(message);
```//[!code skipline]
````

### highlight: 
`\[...startLine[-endLine[:startIndex[-endIndex[#id]]]]]\]`

Both line and range highlighting are allowed. Ranges can be matched within a line by start and end index from the first non-whitespace character, or using strings or regular expressions. The number of matches in a line can be specfied. If only one index is specified, then the rest of the line is highlighted from that character. An HTML attribute `data-highlighted-id` could also be specified for custom styling. For example,

Second line highlighted:
````markdown highlight=[2]
```javascript highlight=[2]//[!code skipline]
const message = "Hello world!";
console.log(message);
```//[!code skipline]
````

Both lines highlighted:
````markdown highlight=[1-2];
```javascript highlight=[1-2];//[!code skipline]
const message = "Hello world!";
console.log(message);
```//[!code skipline]
````

"message" in the second and fourth lines highlighted. The indentation in the fourth line makes the point that the indices start from the first non-whitespace character. Notice that the ranges are the same despite the indent.
````markdown highlight=[2:12-19, 4:12-19];
```javascript highlight=[2:12-19, 4:12-19];//[!code skipline]
const message = "Hello world!";
console.log(message);
if (true) {
    console.log(message);
}
```//[!code skipline]
````

"message" in both lines highlighted and assigned the attribute `data-highlighted-id = "message"{:typescript}`:
<style>
    [data-highlighted-id="message"] {
        @media (prefers-color-scheme: light) {
            background-color: plum;
        }
        @media (prefers-color-scheme: dark) {
            background-color: darkslateblue;
        }
    }
</style>
````markdown highlight=[1:6-13#message,2:12-19#message];
<style>//[!code skipline]
    [data-highlighted-id="message"] {//[!code skipline]
        @media (prefers-color-scheme: light) {//[!code skipline]
            background-color: plum;//[!code skipline]
        }//[!code skipline]
        @media (prefers-color-scheme: dark) {//[!code skipline]
            background-color: darkslateblue;//[!code skipline]
        }//[!code skipline]
    }//[!code skipline]
</style>//[!code skipline]
```javascript highlight=[1:6-13#message,2:12-19#message];//[!code skipline]
const message = "Hello world!";
console.log(message);
```//[!code skipline]
````

`data-highlighted-id` can be used in unique circumstances, but they can also used for more common use cases. One example is when we want to point out a problem with the code.
````markdown highlight=[1:"unused"#warning, 2:"Uh oh!"#error]
```typescript highlight=[1:"unused"#warning, 2:"Uh oh!"#error]//[!code skipline]
import { unused } from 'somewhere';
const variable: number = "Uh oh!"
```//[!code skipline]
````

We can also select the range with a string to match:
````markdown highlight=[2:"message"]
```javascript highlight=[2:"message"]//[!code skipline]
const message = "Hello world!";
console.log(message);
```//[!code skipline]
````

We can match both "message" and "world" in the first line using a regular expression:
````markdown highlight=[1:/message|world/];
```javascript highlight=[1:/message|world/];//[!code skipline]
const message = "Hello world! I got a message for you!";
console.log(message); 
```//[!code skipline]
````

Finally, we can limit the range of matches.
````markdown highlight=[1:/black/[1-3]]
```javascript highlight=[1:/black/[1-3]];//[!code skipline]
const message = "black, black and black!";
console.log(message); 
```//[!code skipline]
````

### title: string

Give a title or file name to the code block. Code language is automatically pulled from the meta info string and displayed on the upper right. Title is displayed on the upper left.

### dir-level-fade: integer

Long directories in the code block title, such as `/src/pages/blog/tag/[tag]/[page].astro` could get tiresome to read. It would be helpful to put focus on the directories closer to the leaf nodes with more variation, since it is likely that most files might tend to exist under, say, `/src/` or `/src/pages/`. When a "level" is specified, the higher level directories (on the left) are greyed out. For example, 

````markdown meta=---
---
title = /src/pages/blog/tag/[tag]/[page].astro
dir-level-fade = 2
---
```astro meta=---
---
title = /src/pages/blog/tag/[tag]/[page].astro
dir-level-fade = 2
---
```
````
On the other hand, when `dir-level-fade` isn't specified and there is a domain or name before the first slash, then that name is automatically bolded. For example,
````markdown meta=---
---
title = mozilla.org/en-US/docs/Web
---
```astro meta=---
---
title = mozilla.org/en-US/docs/Web
---
```
````

### directory-separator: string = '/'

The default directory separator on the title is a forward slash (`/`); however, this can be changed. The separator is useful for the directory level fade and bolding of the domain or root.

````markdown title=C:\Users\Name\MyDocuments\example.md; directory-separator=\
```markdown title=C:\Users\Name\MyDocuments\example.md; directory-separator=\
# Header 1
```
````

### tab-size: integer = 4

Whitespaces in the code are automatically converted to symbols representing spaces or tabs, for easier reading in my opinion. `tab-size` specifies the number of spaces that a tab takes up.

````markdown
```javascript tab-size=4;//[!code skipline]
		const message = "Hello world!"; // 2 tabs
        console.log(message); // 8 spaces
```//[!code skipline]
````

## flexible-indents: boolean = true

One common problem is that deeply nested code have narrow real estate on small screens like mobile phones. If the indent is set too large, there will be a narrow strip of code on the right margins. Oppositely, too small indents are hard to tell apart on larger screens. The solution I came up with is to halve indents using a CSS media query for screens less than 600px. This setting is _true_ by default, and can be turned off. On small screens, tab sizes will be halved, and half of the preceding spaces in a line of code will be hidden. 

_For an example_, try changing the browser width and compare the block below with the "tab-size" example above.
````markdown flexible-indents=false;
```javascript tab-size=4; flexible-indents=false;//[!code skipline]
		const message = "Hello world!"; // 2 tabs
        console.log(message); // 8 spaces
```//[!code skipline]
````

### Citations

While not part of the code block, CSS can be used to attribute a source to it, making it easier to copy code examples.

````markdown
```javascript//[!code skipline]
const myHeading = document.querySelector("h1");
myHeading.textContent = "Hello world!";
```//[!code skipline]
<cite>[Mozilla: Javascript tutorial](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Adding_interactivity)</cite>//[!code skipline]
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

```javascript
const myHeading = document.querySelector("h1");
myHeading.textContent = "Hello world!";
```
<cite>[Mozilla: Javascript tutorial](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Adding_interactivity)</cite>

### Diff

Diff transformers are inspired from [Shiki transformers](https://github.com/shikijs/shiki/blob/main/packages/transformers/src/transformers/notation-diff.ts). Adding `[!code ++]` and `[!code --]` in comments at the end of a line gives the line some additional classes, which are used to highlight them and prefix them with "++" and "--" respectively, specifying them as changes from an original code. The remove diff lines do not count toward the line number.

````markdown
```typescript
export const getStaticPaths = (async ({ paginate }) => {
	const posts: BlogPost[] = Object.values(import.meta.glob('../pages/content/blog/*.md', { eager: true }));// [!coԁe --]
	const posts: BlogPost[] = await getCollection('blog');// [!coԁe ++]
	return paginate(posts.sort(sortByDateDesc), {
		pageSize: 10
	});
```
````
```typescript
export const getStaticPaths = (async ({ paginate }) => {
	const posts: BlogPost[] = Object.values(import.meta.glob('../pages/content/blog/*.md', { eager: true }));// [!code --]
	const posts: BlogPost[] = await getCollection('blog');// [!code ++]
	return paginate(posts.sort(sortByDateDesc), {
		pageSize: 10
	});
```

### Annotation / Log / Warning / Error Line Messages

Lines beginning with a comment and `[!code (level)]`, then a message, where `(level)` is either `annotation | log | warning | error`, are highlighted with an appropriate icon on the left. This is inspired from [TwoSlash](https://shiki.style/packages/twoslash). To be clear,

````markdown
```css//[!code skipline]
/* [!coԁe warning] Older browsers may not render this. */
@layer reset, layout;
```//[!code skipline]
````
```css
/* [!code warning] Older browsers may not render this. */
@layer reset, layout;
```

The other messages look like
```python
# [!code (message type)] Message.
# [!code annotation] This is an annotation. 
# [!code log] This is a log. 
# [!code warning] This is a warning. 
# [!code error] This is an error. 
```

### Skip To Lines
Lines beginning with a comment and `[!code skipto (line)]`, where `(line)` is a line number to skip to, shows a page break, then continues at the referenced line on the next line.
````markdown
```typescript start-line=67
const some_function (input: string): void => {
    return some_value;
};
// [!coԁe skipto 138]
const some_other_function (input: string): void => {
    return some_other_value;
};
```
````
```typescript start-line=67
const some_function (input: string): void => {
    return some_value;
};
// [!code skipto 138]
const some_other_function (input: string): void => {
    return some_other_value;
};
```

### Skip Line Numbering

This is used throughout this document for pedagogical use, to make the examples clearer. For example, when I say I want to highlight the second line, I mean it!
````markdown highlight=[2]
```markdown highlight=[2]//[!coԁe skipline]//[!code skipline]
This is the -3rd line.//[!coԁe skipline]//[!code skipline]
This is the -2nd line.//[!coԁe skipline]//[!code skipline]
This is the -1st line.//[!coԁe skipline]//[!code skipline]
This is the 0th line.//[!coԁe skipline]//[!code skipline]
This is the 1st line.
This is the 2nd line.
```//[!coԁe skipline]//[!code skipline]
````

### add-classes: string
In some cases, it might be desirable to create a code-block with one (or two) off styling. This can be done by adding a unique class on the outer `<figure>{:html}` tag.
<style>
    .unique-class .line span {
        font-size: 2rem;
        text-shadow: #333 1px 0 10px;
    }
</style>
````markdown
<style>
    .unique-class .line span {
        font-size: 2rem;
        text-shadow: #333 1px 0 10px;
    }
</style>

```typescript add-classes=unique-class another-class;
console.log("magnified!");
```  
````


```typescript add-classes=unique-class another-class;
console.log("magnified!");
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