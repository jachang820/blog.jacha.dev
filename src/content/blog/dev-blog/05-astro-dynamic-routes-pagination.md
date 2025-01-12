---
title: 'Astro: Dynamic routes with params and pagination'
description: 'An example of paginated listings of posts by tag, using the Astro framework.'
pubDate: 'Dec 24 2024'
tags: ['Astro', 'typescript']
---

The internet is replete with examples of creating dynamic routes using Astro. Look for paginated routes with parameters and Typescript, however, and the results all seem a little incomplete. For a beginner like I am, it wasn't entirely clear how the different examples in the documentation work together. So let's walk through this.

I think the first thing that was slightly confusing for me was that non-paginated routes look like this for example:
```astro meta=---;
---
title=/src/pages/blog/tag/[tag].astro
dir-level-fade=2
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
```astro meta = ---;
---
title = /src/pages/blog/tag/[tag]/[page].astro
dir-level-fade = 2
highlight = [7:"flatMap"]
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

First, note the change in structure from the posts being passed as props to being a direct argument of `paginate`. It would have been more clear if it still passes through props, maybe with a predetermined property name, and whereas maybe `pageSize` becomes a direct argument in my opinion. 

Second, despite this being the latest version of the docs, the example uses outdated constructs like `import.meta.glob{:ts}`. It also avoids any Typescript typing (that exists from prior examples from the same page), which begs the question whether e.g. `satisfies GetStaticPaths{:ts}` is even compatible with pagination. I'm happy to report that it is, and the example in the documentation is just outdated. 

Of particular, I had a question of why `flatMap` is necessary, since it seems like a single object is being returned. But upon closer inspection, the `paginate` function actually wraps each single result with an array. I found this to be a pitfall, since it was unintuitive why that would be the case.

Continuing on, Typescript Configuration in Astro's docs suggests to infer `getStaticPaths(){:ts}` types.

```astro meta = ---;
---
title=/src/pages/blog/tag/[tag]/[page].astro
dir-level-fade=2
---
---
import type { 
    InferGetStaticParamsType, 
    InferGetStaticPropsType 
} from 'astro';

// getStaticPaths function

type Params = InferGetStaticParamsType<typeof getStaticPaths>;
type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { tag } = Astro.params as Params;
// { tag: string } // [!code --]
// { tag: never } // [!code ++]
const { page } = Astro.props;
---
```
<cite>Slightly altered from [Astro's Typescript Configuration](https://docs.astro.build/en/guides/typescript/)</cite>

Strangely, I found that the params inference always returned "never" types instead of "string" as it should. Additionally, VSCode reports correct inference of the props type even without `InferGetStaticPropsType`. 

It seems visually odd that it isn't `const {page} = Astro.props as Props{:ts}`, but adding this causes the component to silently fail to recognize the prop, even though the prop clearly has been passed in, which could be confirmed with a `console.log(page);{:ts}` statement.

In the end, I find that the following works just as well, if not better.
```astro meta = ---;
---
title=/src/pages/blog/tag/[tag]/[page].astro
dir-level-fade=2
highlight=[7:"flatMap"]
---
---
// getStaticPaths function

type Params = InferGetStaticParamsType<typeof getStaticPaths>;// [!code --]
type Props = InferGetStaticPropsType<typeof getStaticPaths>;// [!code --]
type Params = { tag: string };// [!code ++]

const { tag } = Astro.params as Params; // { tag: string }
const { page } = Astro.props;
---
```