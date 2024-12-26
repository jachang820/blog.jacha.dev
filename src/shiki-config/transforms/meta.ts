import type { ShikiTransformer } from 'shiki';

import { parseMeta } from './utils';

const metaCommand = 'meta';

const parseTransformMeta = (meta: string | null): string | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    meta = meta.trim();
    if (meta.substring(0, 1) === '"' && meta.substring(meta.length - 1) === '"') {
        meta = meta.substring(1, meta.length - 1);
    }
    return meta;
};

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:meta-expand-meta',
        preprocess(code, options) {
            // Find relevant data from options meta
            const fenceMeta = parseMeta(this.options, metaCommand);

            // Parse text data for fence around expanded metadata
            const fence = parseTransformMeta(fenceMeta);

            // Check if data exists
            if (!fence) {
                return code;
            }

            // Find meta data between fences
            let startIndex, endIndex;
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim() === fence) {
                    if (!startIndex) {
                        startIndex = i + 1;
                    }
                    else {
                        // Closing fence found
                        endIndex = i;
                        code = lines.slice(i + 1).join('\n');
                        break;
                    }
                }
            }

            // Construct meta options
            options.meta = options.meta || {};
            for (const option of lines.slice(startIndex, endIndex)) {
                const [key, value] = option.trim().split('=');
                const optionValue = parseTransformMeta(value);
                if (optionValue) {
                    options.meta[key] = optionValue;
                }
            }

            return code;
        }
    };
};

export default transform;