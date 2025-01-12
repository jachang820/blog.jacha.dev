---
title: 'Astro: Customizing content routes'
description: 'Renaming each post to its slugified publish date and title.'
pubDate: 'Dec 28 2024'
tags: ['Astro', 'typescript']
---
Perhaps we want to organize our content file structure differently, or we don't want to have to keep track of how we name files, or we don't want to type a post title in two different ways. Each of these situations merit considering a post file naming scheme besides the Astro default.

For example, suppose I have a blog post named "My First Blog Post". Using the blog starter template, I would create a `/src/content/blog/my-first-blog-post.md`, and then enter the title in the frontmatter. The title would be used in the header of the post, but its route would be determined by the file name as stored in `post.data.id{:ts}`. For my first several posts, I want to organize them in the file structure, maybe, in a subdirectory so that they're grouped by project, but I don't want this structure publicly exposed. So perhaps my file name is `/src/content/blog/first-project/01.md`, but I still want the route to be `/blog/2024-28-12-my-first-blog-post/`.

To achieve this, we make use of a tool to convert the title into URL format: `npm install slugify{:shell}`. This should make it easier to write a helper function to convert post metadata to a slug.


```typescript 
import type { CollectionEntry } from 'astro:content';
import slugify from 'slugify';

type BlogPost = CollectionEntry<'blog'>;

export const slugifyPost = (post: BlogPost): string => {
    // Ex. toISOString() => 2024-12-28T08:00:00.000Z
    const date = new Date(post.data.pubDate).toISOString().split('T')[0];
    const title = slugify(post.data.title, {
        lower: true,
        strict: true
    });
    return [date, title].join('-');
};
```

To generate dynamic routes in Astro, we need to use `GetStaticPaths` to map out all the routes according to a pattern. In this case, since we want the route to end in a slug, we first create the page `/src/pages/blog/[slug].astro`. The word in between the square brackets can be used as a parameter name.

```typescript meta=---;
---
title=/src/pages/blog/[slug].astro
dir-level-fade=2
---
---
import { type CollectionEntry, getCollection } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
	// getCollection replaces import.meta.glob
	const posts = await getCollection('blog');
	return posts.map((post) => ({
		params: { id: post.id } // [!code --]
		params: { slug: slugifyPost(post) },// [!code ++]
		props: post,
	}));
}

// Render Markdown from post
const { Content } = await render(post);

// Specify types to props (e.g. to pass metadata to post header)
type Props = CollectionEntry<'blog'>
const { ...post } = Astro.props;
---
<BlogPost {...post.data}>
	<Content />
</BlogPost>
```

And then in the layout, we just use what we need. 

```astro meta=---;
---
title=/src/layouts/BlogPost.astro
dir-level-fade=2
---
---
import type { CollectionEntry } from 'astro:content';

// The type of post.data that we passed in. In the blog starter template,
//   it is { title, pubDate, updatedDate?, heroImage? }
type Props = CollectionEntry<'blog'>['data'];
const { title, pubDate, updatedDate, heroImage } = Astro.props;
---
// ...abbreviated example
<h1>{ title }</h1>
<slot />
```

Now this...

```markdown meta=---;
---
title=/src/content/blog/some-file-name.md
dir-level-fade=2
---
---
title: 'My first blog post'
pubDate: 'Dec 28 2024'
---
```
will have the route of `/blog/2024-12-28-my-first-blog-post/`.