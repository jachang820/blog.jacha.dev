import type { ShikiTransformer } from 'shiki';
import type { Element, Text, ElementContent, Properties } from 'hast';

import { parseMeta, alterRGB, isLine, isNonCodeSpan } from '../utils';

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
const startLineCommand = 'start-line';

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

    return values.length !== 0 ? values : null;
};

const getSegmentByLines = (
    segments: HighlightedSegment[],
): Map<number, HighlightedSegment[]> => {

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
    if (isNonCodeSpan(node)) {
        return 0;
    }

    const nodesToVisit = [...node.children];
    while (nodesToVisit.length > 0) {
        const child = nodesToVisit.pop();
        if (child) {
            if (child.type === 'element') {
                if (!isNonCodeSpan(child)) {
                    nodesToVisit.push(...child.children);
                }
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
                node.children.splice(0, splitChildIndex - 1);
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

const isNumberedLine = (line: Element): boolean => {
    for (let i = 0; i < line.children.length; i++) {
        const child = line.children[i];
        if (child.type === 'element' &&
            'data-line-number' in child.properties &&
            child.children[0].type === 'text') {
                return !isNaN(parseInt(child.children[0].value));
        }
    }
    return false;
}

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:meta-highlight',
        pre(node) {
            // Find relevant data from options meta
            const highlightMeta = parseMeta(this.options, transformCommand);
            const startLineMeta = parseMeta(this.options, startLineCommand);

            // Parse text data for highlight segments
            const segments = parseTransformMeta(highlightMeta);
            let startLine = 1;
            if (startLineMeta) {
                const startLineParse = parseInt(startLineMeta);
                if (!Number.isNaN(startLineParse)) {
                    startLine = startLineParse;
                }
                else {
                    console.error('Start line is not a number.')
                    startLine = 1;
                }
            }

            // Check valid segments and node
            if (segments === null || node.type !== 'element') {
                return node;
            }

            const code = node.children[0] as Element;
            
            // Organize segments by lines
            const lines = getSegmentByLines(segments);

            // Find last possible line
            let maxLineNumber = startLine - 1;
            for (const line of code.children) {
                if (isLine(line) && isNumberedLine(line as Element)) {
                    maxLineNumber++;
                }
            }
            
            let lineCount = startLine;
            for (let j = 0; j < code.children.length; j++) {
                // Skip nodes that are not lines of code
                if (!isLine(code.children[j]) ||
                    !isNumberedLine(code.children[j] as Element)) {
                    continue;
                }

                const line = code.children[j] as Element;
                const lineNumber = lineCount++;

                // Current line has no highlights
                if (!lines.has(lineNumber)) {
                    continue;
                }
                
                const lineSegments = lines.get(lineNumber);

                for (const segment of lineSegments!) {
                    // Invalid segment
                    if ((segment.endLine && segment.endLine < segment.startLine)
                        || (segment.endChar && segment.endChar < segment.startChar)) {
                            console.error("Highlight start must be before end.", segment);
                            continue;
                        }
                    else if (segment.startLine > maxLineNumber) {
                        console.error(`Highlight start line (${segment.startLine}) out of range.`);
                        continue;
                    }

                    // Highlight entire line
                    if (segment.startChar !== 0 && !segment.startChar) {
                        line.properties = line.properties || {};
                        line.properties['data-highlighted-line'] = '';
                        if (segment.dataId) {
                            line.properties['data-highlighted-line-id'] = segment.dataId;
                        }
                    }
                    // Select text from elements
                    else {
                        let startIndex = segment.startChar;
                        let endIndex = segment.endChar;

                        const overallTextLength = getTextLength(line);
                        if (startIndex >= overallTextLength) {
                            console.error(`Start character index (${startIndex}) ` +
                                        `out of range (${overallTextLength}).`);
                            continue;
                        }

                        let startMark: number | null = null;
                        let endMark: number | null = null;
                        let i = 0;
                        while (i < line.children.length && endMark === null) {
                            const child = line.children[i] as Element;

                            // Skip line number and indents
                            if (isNonCodeSpan(child)) {
                                i++;
                                continue;
                            }

                            const textLength = getTextLength(child);
                            
                            if (startMark === null) {
                                if (startIndex === 0) {
                                    startMark = i;
                                    endIndex -= startIndex;
                                }
                                else if (startIndex < textLength) {
                                    const newSplitNode = splitElement(child, startIndex, KeepSide.Left);
                                    startMark = i + 1;
                                    line.children.splice(startMark, 0, newSplitNode);
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
                                    line.children.splice(endMark - 1, 0, newSplitNode);
                                }
                                else {
                                    endIndex -= textLength;
                                }
                            }

                            i++;
                        }
                        if (!startMark) {
                            console.error('Highlight out of range.', segment);
                        } else {
                            markTokens(line, startMark, endMark, segment.dataId);
                        }
                    }
                }
            }

            // Get text color style
            const lineNumberStylesArray: string[] = [];
            const stylesString = node.properties['style'] as string;
            stylesString.split(';').forEach((style) => {
                const [key, value] = style.trim().split(':');
                const newKey = key.replace('shiki', 'shiki-highlighted');
                if (key === '--shiki-light-bg') {
                    const newValue = alterRGB(value, (decimal) => Math.floor(decimal * 0.9));
                    lineNumberStylesArray.push(`${newKey}:${newValue};`);
                }
                else if (key === '--shiki-dark-bg') {
                    const newValue = alterRGB(value, (decimal) => Math.floor(decimal * 1.5));
                    lineNumberStylesArray.push(`${newKey}:${newValue};`);
                }
            });

            const lineNumberStyles = lineNumberStylesArray.join('');
            code.properties['style'] = code.properties['style'] || '';
            code.properties['style'] += lineNumberStyles;

            return node;
        }
};
};

export default transform;