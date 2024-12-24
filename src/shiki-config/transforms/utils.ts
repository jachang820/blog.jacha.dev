
export const parseMeta = (
    meta: string | undefined, 
    commandName: string
): string | null => {

    let value = null;
    if (meta) {
        meta.split(';').forEach((option) => {
            const [key, value_string] = option.trim().split('=');
            if (key.trim() === commandName) {
                value = value_string.trim();
            }
        });
    }
    return value;
};