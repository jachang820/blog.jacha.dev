import type { CodeOptionsMeta } from 'shiki';

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