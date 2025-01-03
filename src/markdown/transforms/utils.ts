import type { CodeOptionsMeta } from 'shiki';
import type { ElementContent } from 'hast';

export const parseMeta = (
    options: CodeOptionsMeta, 
    commandName: string
): string | null => {

    let value = null;
    if (options.meta) {
        if (commandName in options.meta) {
            value = options.meta[commandName].trim();
        }
        else if (options.meta.__raw) {
            options.meta.__raw.split(';').forEach((option) => {
                const [key, value_string] = option.trim().split('=');
                if (key.trim() === commandName) {
                    value = value_string.trim();
                }
            });
        }
    }
    
    return value;
};

export const alterRGB = (rgb: string, func: (decimal: number) => number) => {
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

export const isLine = (line: ElementContent): boolean => {
    if (line.type === 'element' &&
        line.tagName === 'span' &&
        !!line.properties['class']) {
            let classes = line.properties['class'];
            if (typeof classes === 'string') {
                classes = classes.split(' ');
            }
            return (classes as string[]).includes('line');
    } 
    return false;
};