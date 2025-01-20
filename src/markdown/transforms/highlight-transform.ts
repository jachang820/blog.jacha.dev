import type { Element, ElementContent } from 'hast';
import { 
    metaKey,
    createElement,
    indexRangesOf, 
    alterRGB, 
    getNodeText, 
    KeepSide,
    splitElement
} from '../utils';
import type { DevTransformer, HighlightedSegment } from '../types';

const transformerName: string = 'devblog:highlight';

interface Params {
    index: number;
    numberingMap: Map<number, number | null>;
}

const parseSegmentMatches = (
    segments: HighlightedSegment[],
    text: string
): void => {
    let i = 0;
    while (i < segments.length) {
        const segment = segments[i];
        const newSegments: HighlightedSegment[] = [];
        
        if (segment.termStr || segment.termRegexp) {
            // Find all if match range is not limited
            if (!segment.startMatch) {
                segment.startMatch = 0;
                segment.endMatch = text.length;
            }
            // Find specified match if end of range not indicated
            else if (!segment.endMatch) {
                segment.endMatch = segment.startMatch + 1;
            }
            
            // Get all matches
            const searchTerm = segment.termStr || segment.termRegexp;
            let ranges = indexRangesOf(text, searchTerm!);
            const numMatches = ranges.length;
            if (segment.endMatch > numMatches) segment.endMatch = numMatches;

            // Limit to matches wanted
            ranges = ranges.splice(
                segment.startMatch, 
                segment.endMatch - segment.startMatch
            );

            // Create segment per match
            ranges.forEach(([startIndex, endIndex]) => {
                const newSegment: HighlightedSegment = {...segment};
                newSegment.startChar = startIndex;
                newSegment.endChar = endIndex;
                newSegments.push(newSegment);
            });
            // Convert segment with search term to indices
            segments.splice(i, 1, ...newSegments);
            i += newSegments.length;
        }
        else {
            i++;
        }
    }
};

const transformer: DevTransformer = {
    name: transformerName,
    register: new Map([
        ['highlight', (keyword): HighlightedSegment[] | null => {
            const regexp = /(?:([\d]+)(?:-([\d]+))?(?::([\d]+)(?:-([\d]+))?|(?::"(.+?)"|:\/(.+?)\/)(?:\[([\d]+)(?:-([\d]+))?\])?)?(?:#([A-Za-z0-9-]+))?),?/g;
            if (keyword) {
                const values = [...keyword.matchAll(regexp)].map((match: RegExpExecArray): HighlightedSegment => {
            
                    const handleInt = (n: string): number | undefined => {
                        const parsed = parseInt(n);
                        return !isNaN(parsed) ? parsed : undefined;
                    };

                    return {
                        startLine: parseInt(match[1]),
                        endLine: handleInt(match[2]),
                        startChar: handleInt(match[3]),
                        endChar: handleInt(match[4]),
                        termStr: match[5] ?? undefined,
                        termRegexp: match[6] ? RegExp(match[6], 'g') : undefined,
                        startMatch: handleInt(match[7]),
                        endMatch: handleInt(match[8]),
                        dataId: match[9] ?? undefined
                    };
                });
            
                return values.length !== 0 ? values : null;
            }
            else {
                return null;
            }
        }]
    ]),
    setup: (code, meta, _ = null) => {

        const segments: HighlightedSegment[] | null = meta[metaKey].get('highlight');
        const lines = new Map<number, HighlightedSegment[]>();
        if (segments) {
            // Map lines to segments
            for (let index = 0; index < segments.length; index++) {
                const segment = segments[index];
                if (!segment.endLine) {
                    segment.endLine = segment.startLine;
                }
                for (let lineNumber = segment.startLine; lineNumber <= segment.endLine; lineNumber++) {
                    if (lines.has(lineNumber)) {
                        lines.get(lineNumber)!.push(segment);
                    }
                    else {
                        lines.set(lineNumber, [segment])
                    }
                }
            }
        }
        meta[transformerName] = lines;
            
        return code;
    },
    transform: (line, meta, { index, numberingMap }: Params) => {
        /* 
            Hook: line
            Params:
                index: number -- Line number.
                numberingMap: Map<number, number | null> -- 
                    Map from line index to line numbering.
        */
        line = line as Element;

        let lineNumber = numberingMap.get(index);
        const segmentsByLine: Map<number, HighlightedSegment[]> = meta[transformerName];
        
        // Current line has no highlights or skips numbering
        if (!(lineNumber && segmentsByLine.has(lineNumber))) {
            return line;
        }

        // Convert segment matches to lines
        const lineCode = line.children[2] as Element;
        const overallText = getNodeText(lineCode);
        const segments = segmentsByLine.get(lineNumber);
        parseSegmentMatches(segments!, overallText);
        
        for (const segment of segments!) {
            // Invalid segment
            if ((segment.endLine && segment.endLine < segment.startLine) || 
                (segment.startChar && segment.endChar && 
                segment.endChar <= segment.startChar)) {
                    console.error("Highlight start must be before end.", segment);
                    continue;
            }
            // Highlight entire line
            if (typeof segment.startChar !== 'number') {
                line.properties['data-highlighted-line'] = '';
                if (segment.dataId) {
                    line.properties['data-highlighted-line-id'] = segment.dataId;
                }
            }
            // Select text from elements
            else {
                let startIndex = segment.startChar;
                let endIndex = segment.endChar || overallText.length;
                if (endIndex > overallText.length) {
                    endIndex = overallText.length;
                }
                if (startIndex >= overallText.length) {
                    console.error(`Start character index (${startIndex}) ` +
                                `out of range (${overallText.length}).`);
                        continue;
                    }

                /* Assume line number transform has been applied, and code has
                   been separated into its own child span */
                if (!('data-line-code' in lineCode.properties)) {
                        console.error(
                            `Malformed line on index ${index}. ` + 
                            'Make sure Line Numbering has been applied.');
                        continue;
                    }
                
                /* We don't want to split the line code wrapper element. So
                   create a new temporary element so we could split the children. */
                const marked = createElement('mark', {'data-highlighted': ''});
                if (segment.dataId) {
                    marked.properties['data-highlighted-id'] = segment.dataId;
                };
                marked.children = lineCode.children;
                const tempLeftElement = splitElement(
                    marked, startIndex, KeepSide.Right);

                const tempRightElement = splitElement(
                    marked, endIndex - startIndex, KeepSide.Left)!;

                // Flatten overlapped marks
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

                // Put temporary element contents back into line code wrapper
                marked.children = markedSpans;
                lineCode.children = [];
                if (tempLeftElement) {
                    lineCode.children.push(...tempLeftElement.children);
                }
                lineCode.children.push(marked);
                if (tempRightElement) {
                    lineCode.children.push(...tempRightElement.children);
                }
            }
        }

        return line;
    },
    styleElements: (pre, _meta, _) => {
        // Add some styles to determine line number width and color
        pre = pre as Element;
        const code = pre.children[0] as Element;
        const newStyles: string[] = [];
        (pre.properties['style'] as string).split(';').forEach((style) => {
            const [key, value] = style.trim().split(':');
            const newKey = key.replace('shiki', 'shiki-highlighted');
            if (key === '--shiki-light-bg') {
                const newValue = alterRGB(value, 
                    (decimal) => Math.floor(decimal * 0.9));
                newStyles.push(`${newKey}:${newValue};`);
            }
            else if (key === '--shiki-dark-bg') {
                const newValue = alterRGB(value, 
                    (decimal) => Math.floor(decimal * 1.5));
                newStyles.push(`${newKey}:${newValue};`);
            }
        });
        code.properties['style'] = code.properties['style'] || '';
        code.properties['style'] += newStyles.join('');
        return pre;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
        return pre;
    }
};

export default transformer;