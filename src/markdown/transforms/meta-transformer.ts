import { parseStringMeta } from '../utils';
import type { DevTransformer } from '../types';

const transformerName: string = 'devblog:meta';

const transformer: DevTransformer = {
    name: transformerName,
    register: new Map([
        ['meta', (keyword) => parseStringMeta(keyword)]
    ]),
    setup: (code, meta) => {
        // Find meta data between fences
        let startIndex, endIndex;
        const lines = code.split('\n');
        
        // Check if user entered the option
        if (!(meta[transformerName].get('meta'))) {
            return code;
        }

        // Find lines of meta data and delete them from code
        const fence: string = meta[transformerName].get('meta');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === fence) {
                if (!startIndex) {
                    startIndex = i + 1;
                }
                else {
                    // Closing fence found
                    endIndex = i;

                    // Delete meta from code
                    code = lines.slice(i + 1).join('\n');
                    break;
                }
            }
        }

        // Convert meta frontmatter to meta object
        const fencedMetaRegexp = /^(?:\s*([a-z-]+)\s*=\s*(.+?)\s*)$/;
        for (const option of lines.slice(startIndex, endIndex)) {
            const match = option.match(fencedMetaRegexp);
            if (match) {
                const [_, keyword, rawValue] = match;
                meta[transformerName].set(keyword, rawValue);
            }
        }
        
        return code;
    },
    cleanup: (pre) => {
        delete pre.properties[transformerName];
    }
};

export default transformer;