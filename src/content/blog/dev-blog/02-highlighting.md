---
title: 'Shiki: Highlighting lines and phrases in Shiki'
description: "Flexible highlighting of code block lines and phrases using regular expressions. Help the audience focus on the important lines of code without redundantly describing it."
pubDate: 'Dec 17 2024'
tags: ['typescript', 'shiki']
---

Blogging about and describing code, to me, is an act of irony. The point of having a logical, mathematical language to begin with is to avoid and disambiguate the vagueness in natural language. Yet, it remains important to communicate and bridge that gap. However, if a picture is worth a thousand words, then surely good highlighting is worth at least a hundred. Instead of directing an audience what to look for in a block, and where to look for it, highlighting a certain line or phrase focuses their attention more directly. This is another reason I had to go with a static site generator framework or build my own blog, because _good luck_ trying to get all these features into Wordpress or Wix!

For the purposes of this post, I assume that using a complicated regular expression or string splitting, an input is derived in the following format.
```typescript
type HighlightSegment = {
    startLine: number,
    endLine?: number,
    startChar?: number,
    endChar?: number,
    termStr?: string,
    termRegexp?: RegExp,
    startMatch?: number,
    endMatch?: number,
    dataId?: string
};
```
Then I will break down how to apply each piece of this information.

## Highlighting entire lines
First, highlighting lines is as simple as applying a class or attribute to the line element that's within range.
```typescript title=/src/shiki/transforms/highlights.ts; dir-level-fade=1;
import { Element } from 'hast';
// ... Parse input.
const highlightEntireLine = (
    line: Element,
    segment: HighlightSegment
): void => {
    line.properties['data-highlighted-line'] = '';
    // [!code annotation] Set an attribute for further styling.
    if (segment.dataId) {
        line.properties['data-highlighted-line-id'] = segment.dataId;
    }
};
```

## Utility functions

Highlighting parts of lines is a little more involved, especially when it's possible to highlight from and to any arbitrary character, even if they're in the middle of spans. The strategy here would then be to traverse the [HAST trees](https://github.com/syntax-tree/hast) (where the line is the root), then make splits to Element nodes so that the highlighted parts can be grouped under a `<mark>{:html}`.

With that in mind, let's write some functions that make tree traversal easier. The first task is to be able to traverse all the Text nodes in-order. Since these lines are about 3 levels deep, we won't have to worry about any stack issues. To keep this simple, a recursive function shall do.
```typescript title=/src/shiki/utils.ts; dir-level-fade=1;
// [!code annotation] In HAST code, an Element has access to its children, but not its siblings. So it's helpful if the parent node is accessible. The TraversalFunction returns false when we want to stop traversing.
export type TraversalFunction = (
    node: ElementContent, 
    parent: Element | null,
    siblingIndex: number
) => boolean;

export const inOrderTraversal = (
    node: ElementContent,
    parent: Element | null,
    siblingIndex: number,
    func: TraversalFunction
): boolean => {
    // [!code annotation] Call TraversalFunction on current node. The function should save some data before telling whether it wants traversal to proceed.
    if (!func(node, parent, siblingIndex)) {
        return false;
    }
    if (node.type === 'element') {
        // [!code annotation] Traverse each child recursively.
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (!inOrderTraversal(child, node, i, func)) {
                return false;
            }
        }
    }
    return true;
};
```
With this, we could easily get all the text of a node.
```typescript title=/src/shiki/utils.ts; dir-level-fade=1;
import { ElementContent } from 'hast';
// [!code annotation] type ElementContent = Element | Text | Comment | Root
export const getNodeText = (node: ElementContent): string => {
    if (node.type !== 'element') {
        return node.type === 'text' ? node.value : '';
    }

// [!code annotation] Aggregate all text from Text nodes
    let textParts: string[] = [];
    inOrderTraversal(node, null, 0, (node, _parent, _index) => {
        if (node.type === 'text') {
            textParts.push(node.value);
        }
        return true;
    });
    return textParts.join('');
};
```
For the last utility, we'll make a split within an Element based on the character index of its text.
```typescript title=/src/shiki/utils.ts; dir-level-fade=1; 
export enum KeepSide { Left, Right };
type SiblingElement = {
    node: ElementContent,
    index: number
};
export const cloneElement = (node: Element): Element => ({ ...node, properties: {...node.properties }});
export const splitElement = (
    node: Element,
    splitIndex: number,
    keepSide: KeepSide
): Element | null => {
    // [!code annotation] Maintain a hierarchical list of nodes from root to the current node. Once the index where the split will be made is found in a Text node, this list will contain all the nodes that will be considered for splitting.
    const splitChain: SiblingElement[] = [];
    // [!code annotation] If the split index is in the middle of a Text or Element node in a given tree lavel, then the node will have to be split and the new node stored and returned. If the split index is between two Text or Element nodes, then the split node will remain null.
    let splitNode: Element | null = null;
    inOrderTraversal(node, null, 0, (node, parent, index) => {
        let lastChainIndex = splitChain.length - 1;
        let resume = true;
        if (node.type === 'element' && node.children.length > 0) {
            // [!code annotation] Remove nodes until the parent of current element is the last node in the chain.
            while (parent && parent !== splitChain[lastChainIndex].node) {
                splitChain.pop();
                lastChainIndex--;
            }
            // [!code annotation] There is only one Text node per Element. If the first child isn't text, then there are only Element children.
            const firstChild = node.children[0];
            if (firstChild.type === 'text') {
                if (splitIndex < firstChild.value.length) {
                    // [!code annotation] Split is in the middle of current Text node. The side that is "kept" remains on the original nodes. The other side is moved onto the split node.
                    if (splitIndex > 0) {
                        const leftText = firstChild.value.substring(0, splitIndex);
                        const rightText = firstChild.value.substring(splitIndex);
                        const newText: Text = { type: 'text', value: '' };
                        if (keepSide === KeepSide.Left) {
                            firstChild.value = leftText;
                            newText.value = rightText;
                        }
                        else {
                            newText.value = leftText;
                            firstChild.value = rightText;
                        }
                        // [!code annotation] const cloneElement = (node: Element): Element => { ...node, properties: {...node.properties }};
                        splitNode = cloneElement(node);
                        splitNode.children = [newText];
                    }
                    resume = false;
                }
                else {
                    // [!code annotation] If split has not been reached, subtract index by the length of the text that has been seen.
                    splitIndex -= firstChild.value.length;
                }
            }

            splitChain.push({node, index});
        }
        return resume;
    });
    // [!code annotation] From the bottom of the split chain, use the parent and sibling index where the split occurs at each level to split half of the tree onto a new tree to be returned.
    for (let i = splitChain.length - 2; i >= 0; i--) {
        const parent = splitChain[i].node as Element;
        let splitChildIndex = splitChain[i + 1].index;
        // [!code annotation] Split was never made, so the split chain should be on the left
        if (resume) {
            splitChildIndex++;
        }
        // [!code annotation] Suppose split is made on index s. If the left side is kept, then children represents the right side nodes: [splitNode, ...[s+1, s+2, ..., n-1]]. If the right side is kept, then children represents the left side nodes: [...[0, 1, ..., s], splitNode].
        const children: ElementContent[] = [];
        if (splitNode && keepSide === KeepSide.Left) {
            children.push(splitNode);
            splitChildIndex++;
        }
        if (keepSide === KeepSide.Left) {
            children.push(...parent.children.splice(splitChildIndex));
        }
        else {
            children.push(...parent.children.splice(0, splitChildIndex));
        }
        if (splitNode && keepSide === KeepSide.Right) children.push(splitNode);

        // [!code annotation] Aggregate children under new parent, which becomes the split node for the level above.
        if (children.length > 0) {
            splitNode = cloneElement(parent);
            splitNode.children = children;
        }
    }

    return splitNode;
};
```

## Parse and mark
With the heavy lifting out of the way, the only left to do is to parse the text of each line to find the indices where the highlighting will occur, and then make the necessary splits to mark those Element nodes. To find the indices, we aggregate the text values of the leaves of the tree, then use regular expression.
```typescript title=/src/shiki/transforms/highlights.ts; dir-level-fade=1; 
import type { Element } from 'hast';
import { getNodeText } from '../utils';

type HighlightRange = {
    start: number,
    end: number
};
const getRangesInLine = (
    line: Element,
    segment: HighlightSegment
): HighlightRange[] = {
    const lineText = getNodeText(line);
    const highlightRanges: HighlightRange[] = [];
    if (segment.termStr) {
        const length = segment.termStr.length;
        let i = lineText.indexOf(segment.termStr);
        while (i >= 0) {
            highlightRanges.push({ start: i, end: i + length });
            i = lineText.indexOf(segment.termStr, i + length);
        }
    }
    else if (segment.termRegexp) {
        let match;
        while ((match = segment.termRegexp.exec(lineText)) !== null) {
            highlightRanges.push({ 
                start: match.index, 
                end: segment.termRegexp.lastIndex
            });
        }
    }
    else {
        highlightRanges.push({
            start: segment.startChar, 
            end: segment.endChar
        });
    }
};
```
Finally, for each one of these ranges, we make a mark.
```typescript title=/src/shiki/transforms/highlights.ts; dir-level-fade=1; 
import type { Element, ElementContent } from 'hast';
import { splitElement } from '../utils';

const createElement = (tagName: string): Element => {
    return { type: 'element', tagName, properties: {}, children: []};
}
const transformer: ShikiTransformer = {
    line(line: Element, index: number) {
        // ... Parse input.
        const segment: HighlightSegment = parseInput(line);
        // [!code annotation] Only match startLine if endLine is not specified.
        if (segment.startLine && !segment.endLine) {
            segment.endLine = segment.startLine + 1;
        }
        if (index >= startLine && index < endLine) {
            // [!code annotation] If no ranges or search terms given, highlight entire line.
            if (!(segment.startChar || segment.termStr || segment.termRegexp)) {
                highlightEntireLine(line, segment);
            }
            else {
                const ranges: HighlightRange[] = getRangesInLine(line, segment);
                for (const highlight of ranges) {
                    // [!code annotation] We don't want to split the line Element itself, only its children. So we make a new <mark> Element under it.
                    const marked = createElement('mark');
                    marked.children = line.children;
                    marked.properties['data-highlighted'] = '';
                    if (segment.dataId) {
                        marked.properties['data-highlighted-id'] = segment.dataId;
                    }
                    // [!code annotation] Each highlight makes two potential splits: one at its start and one at its end. For the start, we want the <mark> to hold the right side and another element to hold the left.
                    const tempLeftElement = splitElement(
                        marked, highlight.start, KeepSide.Right);
                    
                    // [!code annotation] Since this second split is on the <mark> Element, that becomes the kept side on the left. The <mark> Element only holds the children after the first split at the start index, so the characters before that aren't counted.
                    const tempRightElement = splitElement(
                        marked, highlight.end - highlight.start, KeepSide.Left);
                    // [!code annotation] Combine overlapping marks.
                    const markedSpans: ElementContent[] = [];
                    for (let i = 0; i < marked.children.length; i++) {
                        const child = marked.children[i];
                        if (child.type === 'element' && child.tagName === 'mark') {
                            markedSpans.push(...child.children);
                        }
                        else {
                            markedSpans.push(child);
                        }
                    }
                    marked.children = markedSpans;
                    // [!code annotation] Combine temporary Element nodes back into line. The <mark> Element always exists since it's the kept side on both splits. The left and right elements, however, are split nodes, which returns null if nothing is selected.
                    line.children = [];
                    if (tempLeftElement) {
                        line.children.push(...tempLeftElement.children);
                    }
                    line.children.push(marked);
                    if (tempRightElement) {
                        line.children.push(...tempRightElement.children);
                    }
                }
            }
        }
        return line;
    }
};
```
And with this, the line now holds the original children spans, but with the highlighted segments grouped under `<mark>{:html}` elements, with attributes if specified. These mark elements can be styled by the tag. Both the mark and line can also be styled by specified attributes. For example,
```css
.astro-code {
    [data-line] {
        background-color: grey;
    }
    mark {
        background-color: grey;
        padding: 2px;
        border: 1px solid black;
        border-radius: 2px;
    }
}
```
