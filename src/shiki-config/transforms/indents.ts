import type { ShikiTransformer } from 'shiki';
import type { ElementContent } from 'hast';

import { parseMeta } from './utils';

const tabSizeCommand = 'tabSize';

const parseTransformMeta = (meta: string | null): number | null => {
    if (!meta || !meta.trim()) {
        return null;
    }
    const value = parseInt(meta);
    return !Number.isNaN(value) ? value : null;
};

const transform = (): ShikiTransformer => {

    return {
        name: 'devblog-transformers:meta-tab-size',
        line(node, _) {
            // Find relevant data from options meta
            const tabSizeMeta = parseMeta(this.options, tabSizeCommand);

            // Parse text data for number of spaces to convert tabs
            const tabSize = parseTransformMeta(tabSizeMeta);

            // Check valid size
            if (tabSize === null) {
                return node;
            }

            const nodesToVisit: ElementContent[] = [...node.children];
            while (nodesToVisit.length > 0) {
                const child = nodesToVisit.pop();
                if (child) {
                    if (child.type === 'element') {
                        nodesToVisit.push(...child.children);
                    }
                    else {
                        child.value = child.value.replaceAll('\t', ' '.repeat(tabSize));
                    }
                }
            }
            return node;
        }
    };
};

export default transform;