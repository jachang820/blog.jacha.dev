---
title: 'Astro: Dynamic routes with params and pagination'
description: 'An example of paginated listings of posts by tag, using the Astro framework.'
pubDate: 'Dec 24 2024'
tags: ['Astro', 'typescript']
---

The internet is replete with examples of creating dynamic routes using Astro. Look for paginated routes with parameters and Typescript, however, and the results all seem a little incomplete. For a beginner like I am, it wasn't entirely clear how the different examples in the documentation work together. So let's walk through this.

I think the first thing that was slightly confusing for me was that non-paginated routes look like this for example:
```astro meta="---" 
---
title="/src/pages/blog/tag/[tag].astro"
directory-level-fade=2
---
---
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
export const getStaticPaths = (async () => {
    const posts = await getCollection('blog');
    const tags = getTags() // get tags from somewhere
    return tags.map((tag) => {
        const filteredPosts = posts.filter((post) =>
            post.data.tags?.includes(tag));
        return {
            params: { tag },
            props: { post: filteredPost }
        };
    });
}) satisfies GetStaticPaths;
---
```

However, according to Astro's Routing Reference, this is what paginated routes look like:
```astro meta="---" 
---
title="/src/pages/blog/tag/[tag]/[page].astro"
directory-level-fade=2
highlight=[7:16-23]
---
---
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
export const getStaticPaths = (async () => {
    const posts = Object.values(import.meta.glob('../pages/content/blog/*.md', { eager: true })); // [!code --]
    const posts = await getCollection('blog'); // [!code ++]
    const tags = getTags() // get tags from somewhere
    return tags.flatMap((tag) => {
        const filteredPosts = posts.filter((post) => 
            post.frontmatter.tag === tag);
        return paginate(filteredPost, {
            params: { tag },
            // props: { }, optional
            pageSize: 10
        });
    });
}); // [!code --]
}) satisfies GetStaticPaths; // [!code ++]
---
```
<cite>Slightly altered from [Astro's Routing Reference](https://docs.astro.build/en/guides/routing/#dynamic-routes)</cite>

First, note the change in structure from the posts being passed as props to being a direct argument of `paginate`. It would have been more clear if it still passes through props, whereas maybe `pageSize` becomes a direct argument in my opinion. Second, despite this being the latest version of the docs, the example uses outdated constructs. It also avoids any Typescript typing (that exists from prior examples from the same page), which begs the question whether e.g. `satisfies GetStaticPaths` is even compatible with pagination. I'm happy to suggest that it is, and the example in the documentation is just outdated. 