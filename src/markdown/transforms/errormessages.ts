import type { ShikiTransformer } from 'shiki';
import type { Element, Properties } from 'hast';

type ElementType = 'element' | 'text';

const createElement = (
    tagName: string, 
    properties: Properties
): Element => {
    return { type: 'element', tagName, properties, children: [] };
};

const createIcon = (
    innerDefinition: string, 
    outerDefinition?: string
): Element => {
    const iconWrapper = createElement(
        'span', {'data-line-message-icon': ''});
    const svg = createElement('svg', {'viewBox': "0 0 32 32"});
    if (innerDefinition) {
        svg.children.push(
            createElement('path', {
                'fill': 'currentColor',
                'd': innerDefinition
            })
        );
    }
    if (outerDefinition) {
        svg.children.push(
            createElement('path', {
                'fill': 'currentColor',
                'd': outerDefinition
            })
        );
    }
    iconWrapper.children.push(svg);
    return iconWrapper;
};

const annotationIcon = (): Element => {
    return createIcon(
        'M11 24h10v2H11zm2 4h6v2h-6zm3-26A10 10 0 0 0 6 12a9.19 9.19 0 0 0 3.46 7.62c1 .93 1.54 1.46 1.54 2.38h2c0-1.84-1.11-2.87-2.19-3.86A7.2 7.2 0 0 1 8 12a8 8 0 0 1 16 0a7.2 7.2 0 0 1-2.82 6.14c-1.07 1-2.18 2-2.18 3.86h2c0-.92.53-1.45 1.54-2.39A9.18 9.18 0 0 0 26 12A10 10 0 0 0 16 2'
    );
};

const logIcon = (): Element => {
    return createIcon(
        'M17 22v-8h-4v2h2v6h-3v2h8v-2zM16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8',
        'M26 28H6a2.002 2.002 0 0 1-2-2V6a2.002 2.002 0 0 1 2-2h20a2.002 2.002 0 0 1 2 2v20a2.002 2.002 0 0 1-2 2M6 6v20h20V6Z'
    );
};

const warningIcon = (): Element => {
    return createIcon(
        'M16 23a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 23m-1-11h2v9h-2z',
        'M29 30H3a1 1 0 0 1-.887-1.461l13-25a1 1 0 0 1 1.774 0l13 25A1 1 0 0 1 29 30M4.65 28h22.7l.001-.003L16.002 6.17h-.004L4.648 27.997Z'
    );
};

const errorIcon = (): Element => {
    return createIcon(
        'M15 8h2v11h-2zm1 14a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 22',
        'M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2m0 26a12 12 0 1 1 12-12a12 12 0 0 1-12 12'
    );
};

const regexp = /(?:\/\/|\/\*|<!--|#|--|%{1,2}|;{1,2}|"|')\s+\[!code (annotation|log|warning|error)\]\s*(.*)\s*(?:\*\/|-->)$/;

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:error-messages',
        line(node, _) {
            let level: string | null = null;
            let message: string | null = null;
            let lineCode: Element | null = null;
            for (let i = 0; i < node.children.length; i++) {
                let child = node.children[i] as Element;
                // Created by line-number transformer
                // Get phrase under group
                if (child.type === 'element' && 
                    'data-line-code' in child.properties &&
                    child.children[0].type === 'element') {
                        child = child.children[0] as Element;
                    lineCode = child;
                }

                // Match text
                if (child.children.length === 1 &&
                    child.children[0].type === 'text') {
                        const text = child.children[0].value;
                        const match = text.match(regexp);
                        if (match) {
                            let textMatch: string | null = null;
                            [textMatch, level, message] = match;
                            break;
                        }
                    
                }
            }

            // Check if matched
            if (!(level && message)) {
                return node;
            }

            // Create elements
            const lineSpan = createElement('span', {'data-line-message-type': ''});
            if (level === 'annotation') {
                lineSpan.properties['data-line-message-type'] = 'annotation';
                lineSpan.children.push(annotationIcon());
            }
            else if (level === 'log') {
                lineSpan.properties['data-line-message-type'] = 'log';
                lineSpan.children.push(logIcon());
            }
            else if (level === 'warning') {
                lineSpan.properties['data-line-message-type'] = 'warning';
                lineSpan.children.push(warningIcon());
            }
            else if (level === 'error') {
                lineSpan.properties['data-line-message-type'] = 'error';
                lineSpan.children.push(errorIcon());
            }
            lineSpan.children.push({ type: 'text', value: message});

            // Replace contents of line
            if (lineCode) {
                lineCode.children = [lineSpan];
            }
            else {
                node.children = [lineSpan];
            }
            
            node.properties['data-line-message'] = '';
            return node;
        }
    };
};

export default transform;