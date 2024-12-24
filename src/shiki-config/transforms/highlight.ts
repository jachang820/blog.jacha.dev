import type { ShikiTransformer } from 'shiki';
import type { Element, Text, ElementContent, Properties } from 'hast';

import { parseMeta } from './utils';

export type HighlightedSegment = {
    startLine: number,
    endLine: number,
    startChar: number,
    endChar: number,
    dataId: string
};

enum KeepSide { 
    Left, 
    Right
}

const transformCommand = 'highlight';

const regexp = /(([\d]+)(?:-([\d]+))?(?::([\d]+)(?:-([\d]+))?)?(?:#([A-Za-z]+))?),?/g;

const parseTransformMeta = (meta: string | null): HighlightedSegment[] | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    const values = [...meta.matchAll(regexp)].map((match: RegExpExecArray): HighlightedSegment => {
        return {
            startLine: parseInt(match[2]),
            endLine: parseInt(match[3]),
            startChar: parseInt(match[4]),
            endChar: parseInt(match[5]),
            dataId: match[6] ?? null
        };
    });

    if (values.length === 0) {
        return null;
    }
    else {
        return values;
    }
};

const getSegmentByLines = (segments: HighlightedSegment[]): Map<number, HighlightedSegment[]> => {
    const lines = new Map<number, HighlightedSegment[]>();
    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index];
        if (segment.endLine) {
            for (let lineNumber = segment.startLine; lineNumber <= segment.endLine; lineNumber++) {
                if (lines.has(lineNumber)) {
                    lines.get(lineNumber)!.push(segment);
                }
                else {
                    lines.set(lineNumber, [segment])
                }
            }
        }
        else {
            if (lines.has(segment.startLine)) {
                lines.get(segment.startLine)!.push(segment);
            }
            else {
                lines.set(segment.startLine, [segment]);
            }
        }
    }
    return lines;
};

const getTextLength = (node: ElementContent): number => {
    let length = 0;
    if (node.type !== 'element') {
        return node.value.length;
    }

    // Element
    const nodesToVisit = [...node.children];
    while (nodesToVisit.length > 0) {
        const child = nodesToVisit.pop();
        if (child) {
            if (child.type === 'element') {
                nodesToVisit.push(...child.children);
            }
            else {
                length += child.value.length;
            }
        }
    }
    return length;
};

const splitElement = (
    node: ElementContent, 
    splitIndex: number, 
    keepSide: KeepSide
): ElementContent => {

    if (node.type === 'element') {
        let afterSplit = false;
        let splitChildIndex = node.children.length;
        const newChildren = []
        let splitChild = null;
        const newElement: Element = {...node};
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];

            if (!afterSplit) {
                const textLength = getTextLength(child);
                if (splitIndex > textLength) {
                    splitIndex -= textLength;
                }
                else if (splitIndex === 0) {
                    // Splitting child node not necessary
                    splitChildIndex = i;
                    afterSplit = true;
                }
                else {
                    // Child node to split
                    splitChild = splitElement(child, splitIndex, keepSide);
                    splitChildIndex = i + 1;
                    afterSplit = true;
                }
            }

            // Add side that is not kept to new node that will be returned
            if (keepSide === KeepSide.Left) {
                if (splitChild && splitChildIndex === i + 1) {
                    newChildren.push(splitChild);
                }
                else if (afterSplit) {
                    newChildren.push(child);
                }
            }
            else {
                if (splitChild && splitChildIndex === i + 1) {
                    newChildren.push(splitChild);
                }
                else if (!afterSplit) {
                    newChildren.push(child);
                }
                else { // All new elements already collected
                    break;
                }
            }
        }

        // Add new children to new node
        newElement.children = newChildren;

        // Remove children that are moved to new node
        if (splitChildIndex < node.children.length) {
            if (keepSide === KeepSide.Left) {
                node.children.splice(splitChildIndex);
            }
            else {
                node.children.splice(0, splitChildIndex);
            }
        }
        return newElement;
    }
    else {
        const leftText = node.value.substring(0, splitIndex);
        const rightText = node.value.substring(splitIndex);
        const newText: Text = { type: 'text', value: '' };
        if (keepSide === KeepSide.Left) {
            newText.value = rightText;
            node.value = leftText;
        } else {
            newText.value = leftText;
            node.value = rightText;
        }
        return newText;
    }

}

const markTokens = (
    line: Element,
    startTokenIndex: number,
    endTokenIndex: number | null,
    dataId?: string
): void => {

    // Create element that will wrap around text
    const markProperties: Properties = { 'data-highlighted-chars': '' };
    if (dataId) {
        markProperties['data-highlighted-chars-id'] = dataId;
    }
    const mark: Element = {
        type: 'element',
        tagName: 'mark',
        properties: markProperties,
        children: []
    };

    if (endTokenIndex === null) {
        endTokenIndex = line.children.length;
    }

    // Add elements to highlight
    for (let i = startTokenIndex; i < endTokenIndex; i++) {
        const child = line.children[i];
        if (child.type === 'element') {
            if (child.tagName === 'span') {
                mark.children.push(child);
            }
            else if (child.tagName === 'mark') {
                // Get rid of existing highlighting over the same segment
                mark.children.push(...child.children);
            }
        }
        else {
            mark.children.push(child);
        }
    }

    // Replace tokens with highlighted tokens
    const deleteCount = endTokenIndex - startTokenIndex;
    line.children.splice(startTokenIndex, deleteCount, mark);
};

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:meta-highlight',
        line(node, line) {
            // Find relevant data from options meta
            const highlightMeta = parseMeta(this.options.meta?.__raw, transformCommand);

            // Parse text data for highlight segments
            const segments = parseTransformMeta(highlightMeta);

            // Check valid segments and node
            if (segments === null || node.type !== 'element') {
                return node;
            }

            // Organize segments by lines
            const lines = getSegmentByLines(segments);
            
            // Current line has no highlights
            if (!lines.has(line)) {
                return node;
            }

            const lineSegments = lines.get(line);

            for (const segment of lineSegments!) {
                // Invalid segment
                if ((segment.endLine && segment.endLine < segment.startLine)
                    || (segment.endChar && segment.endChar < segment.startChar)) {
                        continue;
                    }
                
                // Highlight entire line
                if (!segment.startChar) {
                    node.properties = node.properties || {};
                    node.properties['data-highlighted-line'] = '';
                    if (segment.dataId) {
                        node.properties['data-highlighted-line-id'] = segment.dataId;
                    }
                }
                // Select text from elements
                else {
                    let startIndex = segment.startChar;
                    let endIndex = segment.endChar;
                    let startMark: number | null = null;
                    let endMark: number | null = null;
                    let i = 0;
                    while (i < node.children.length && endMark === null) {
                        const child = node.children[i] as Element;
                        const textLength = getTextLength(child);
                        
                        if (startMark === null) {
                            if (startIndex === 0) {
                                startMark = i;
                                endIndex -= startIndex;
                            }
                            else if (startIndex < textLength) {
                                const newSplitNode = splitElement(child, startIndex, KeepSide.Left);
                                startMark = i + 1;
                                node.children.splice(startMark, 0, newSplitNode);
                                endIndex -= startIndex;
                                i++;
                                continue;
                            }
                            else {
                                startIndex -= textLength;
                                endIndex -= textLength;
                            }
                        }

                        if (startMark !== null && endMark === null) {
                            if (endIndex === 0) {
                                endMark = i;
                            }
                            else if (endIndex < textLength) {
                                const newSplitNode = splitElement(child, endIndex, KeepSide.Right);
                                endMark = i + 1;
                                node.children.splice(endMark - 1, 0, newSplitNode);
                            }
                            else {
                                endIndex -= textLength;
                            }
                        }

                        i++;
                    }
                    
                    markTokens(node, startMark!, endMark, segment.dataId);

                }
            }

            return node;
        }
    };
};

export default transform;