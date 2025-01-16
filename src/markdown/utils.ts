import type { ElementContent, Element, Text, Properties } from 'hast';
import type { TraversalFunction } from './types';

export const metaKey = 'devblog:meta';

export const parseIntMeta = (meta?: string): number | null => {
    if (meta) {
        const num = parseInt(meta.trim());
        return !isNaN(num) ? num : null;
    }
    else {
        return null;
    }
};

export const parseStringMeta = (meta?: string): string | null => {
    if (meta) meta = meta.trim();
    return meta || null;
};

export const cloneElement = (node: Element): Element => {
    return {
        ...node,
        properties: {...node.properties}
    };
};

export const createElement = (
    tagName: string, 
    properties: Properties = {}
): Element => {
    return { type: 'element', tagName, properties, children: [] };
};

export const createIcon = (
    definitions: string[]
): Element => {
    const iconWrapper = createElement(
        'span', {'data-line-message-icon': ''});
    const svg = createElement('svg', {'viewBox': "0 0 32 32"});
    for (const definition of definitions) {
        svg.children.push(
            createElement('path', {
                'fill': 'currentColor',
                'd': definition
            })
        );
    }
    iconWrapper.children.push(svg);
    return iconWrapper;
};


export const alterRGB = (
    rgb: string, 
    func: (decimal: number) => number
): string => {
    const originalHex = '0x' + rgb.substring(1);
    let originalDecimal = parseInt(originalHex, 16);
    const colors = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
        colors[i] = func(originalDecimal % 256);
        originalDecimal = Math.floor(originalDecimal / 256);
    }
    return '#' + colors.map((color) => {
        const colorHex = color.toString(16);
        const length = colorHex.length;
        return ('0' + colorHex).substring(length - 1, 3);
    }).join('');
};

export const inOrderTraversal = (
    node: ElementContent,
    parent: Element | null,
    siblingIndex: number,
    func: TraversalFunction
): boolean => {
    if (!func(node, parent, siblingIndex)) {
        return false;
    }
    if (node.type === 'element') {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (!inOrderTraversal(child, node, i, func)) {
                return false;
            }
        }
    }
    return true;
};

export const getNodeText = (node: ElementContent): string => {
    if (node.type !== 'element') {
        return node.type === 'text' ? node.value : '';
    }

    // Aggregate all text from Text nodes
    let textParts: string[] = [];
    inOrderTraversal(node, null, 0, (node, _parent, _index) => {
        if (node.type === 'text') {
            textParts.push(node.value);
        }
        return true;
    });
    return textParts.join('');
};

export const indexRangesOf = (
    text: string, 
    searchTerm: string | RegExp
): [number, number][] => {
    const isRegexp = searchTerm instanceof RegExp;
    
    let numFound = 0;
    const matches: [number, number][] = [];

    let match = isRegexp ?
        searchTerm.exec(text) : 
        text.indexOf(searchTerm, 0);
    while (isRegexp ? match !== null : (match as number) >= 0) {
        const startIndex: number = isRegexp ? 
            (match as RegExpExecArray).index :
            (match as number);
        const endIndex: number = isRegexp ? 
            searchTerm.lastIndex :
            (match as number) + searchTerm.length;
        matches.push([startIndex, endIndex]);

        match = isRegexp ?
            searchTerm.exec(text) :
            text.indexOf(searchTerm, (match as number) + 1);
        numFound++;
    }
    return matches;
};

export enum KeepSide {
    Left, Right
};

type SiblingElement = {
    node: ElementContent,
    index: number
};

export const splitElement = (
    node: Element,
    splitIndex: number,
    keepSide: KeepSide
): Element | null => {
    /* Maintain a hierarchical list of nodes from root to the
       split text node. */
    const splitChain: SiblingElement[] = [];
    let splitNode: Element | null = null;
    let resume = true;
    inOrderTraversal(node, null, 0, (node, parent, index) => {
        let lastChainIndex = splitChain.length - 1;
        if (node.type === 'element' && node.children.length > 0) {
            /* If parent is the last node in the chain, then current
               node is a child. Otherwise, we remove nodes from the
               chain until the sibling is removed. */
            while (parent && parent !== splitChain[lastChainIndex].node) {
                splitChain.pop();
                lastChainIndex--;
            }

            // Check if terminal node
            const firstChild = node.children[0];
            if (firstChild.type === 'text') {
                if (splitIndex < firstChild.value.length) {
                    // Split is in the middle of current text node
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
        
                        splitNode = cloneElement(node);
                        splitNode.children = [newText];
                    }
                    resume = false;
                }
                else {
                    splitIndex -= firstChild.value.length;
                }
            }

            // Add current node
            splitChain.push({node, index});
        }
        return resume;
    });

    for (let i = splitChain.length - 2; i >= 0; i--) {
        const parent = splitChain[i].node as Element;
        let splitChildIndex = splitChain[i + 1].index;
        // Split was never made since splitIndex is at the end
        if (resume) {
            splitChildIndex++;
        }
        // Select which side to return
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

        // Aggregate children under split parent
        if (children.length > 0) {
            splitNode = cloneElement(parent);
            splitNode.children = children;
        }
    }

    return splitNode;
};