---
title: 'Astro: Archives by year and month'
description: 'Astro allows categorizing and sorting posts by date, even without client-side Javascript.'
pubDate: 'Dec 26 2024'
tags: ['Astro', 'typescript']
---
Sorting and categorizing by years then months is useful over any collection of posts. The posts are usually displayed via an accordion by year, which expands to more fine-grained categories. Creating this should be straightforward for anyone who is used to using Javascript, but for those who only recently got their feet wet or haven't used it in a while, like me, there are several useful things to note. We will be creating an Astro component for this, and routing will be done using `getStaticPaths` to keep the site static.

The general idea of `getStaticPaths` has been covered in a [prior blog](/blog/2024-12-24-astro-dynamic-routes-with-params-and-pagination/), but I will make a note of things to pay attention to using annotations in the code.

```astro meta=---;
---
title=/src/pages/blog/[year]/[month]/[...page].astro
dir-level-fade=2
highlight=[14,18]
---
---
import type { GetStaticPaths } from 'astro';
import { type CollectionEntry, getCollection } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

const sortByDateDesc = (a: BlogPost, b: BlogPost): number => {
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
};

export const getStaticPaths = (async ({ paginate }) => {
	const posts = (await getCollection('blog')).sort(sortByDateDesc);
    // [!code annotation] We want a mapping of years and months to blog posts. However, objects can't easily be used as keys in JS objects without side effects. So the keys have to be joined into strings. We take advantage of the fact that Maps are sorted by insertion. 
    const dates = new Map<string, BlogPost[]>();
    const dateKeys: string[] = [];

    posts.forEach((post) => {
        // [!code annotation] JS Date objects use zero-based months (0-11), so that must be corrected for. 
        const postYear = post.data.pubDate.getUTCFullYear();
        const postMonth = post.data.pubDate.getUTCMonth() + 1;
        const key = `${postMonth}/${postYear}`;
        if (!dates.has(key)) {
            dates.set(key, [post]);
            dateKeys.push(key);
        }
        else {
            dates.get(key)?.push(post);
        }
    });

    return dateKeys.flatMap((monthYear) => {
        const [month, year] = monthYear.split('/');
        const filteredPosts = dates.get(monthYear)!;
        return paginate(filteredPosts, {
            params: { year, month },
            pageSize: 10
        });
    });
}) satisfies GetStaticPaths;

type Params = { year: string, month: string };
const { year, month } = Astro.params as Params;
const { page } = Astro.props;
---
```

Anyways, the layout of the page isn't so interesting. What's important is that we now have a route for each year and month that there are posts. Next we apply a similar technique to get the component to list the categories.

```astro meta=---;
---
title=/src/components/Archive.astro
dir-level-fade=1
highlight=[9,21-24]
---
---
import { getCollection } from 'astro:content';
import { sortByDateDesc } from '../helpers';

const posts = (await getCollection('blog')).sort(sortByDateDesc);
// [!code annotation] This time, years are mapped to months to get the correct routes. We use a Set for months to automatically ignore duplicates. Again, we leverage that the Set in JS is guaranteed to be ordered by insertion, unlike in e.g. Python. 
type PostsMap = Map<number, Set<number>>;
const postsByYear: PostsMap = new Map();
posts.forEach((post) => {
    // [!code annotation] The month is kept zero-based to make it easier to index month names to display. 
    const postMonth = post.data.pubDate.getUTCMonth();
    const postYear = post.data.pubDate.getUTCFullYear();
    if (!postsByYear.has(postYear)) {
        postsByYear.set(postYear, new Set([postMonth]));
    }
    else {
        postsByYear.get(postYear)?.add(postMonth);
    }
});

const years: number[] = Array.from(postsByYear.keys());

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 
    'August', 'September', 'October', 'November', 'December'
];
// [!code annotation] This is used to add an attribute to the HTML <details> tag so that the latest category is open by default. The relevant part is the name of the key, the value can be any truthy value. 
const open = true;
---
<section>
    {
        years.map((year, index) => (
            // [!code annotation] Only the most recent year is open by default, since the routes are sorted by descending date. 
            <details open={ index === 0 && open }>
                <summary>{year}</summary>
                <ul>
                    {
                        Array.from(postsByYear.get(year)!).map((month) => (
                            <li>
                                <a href={`/blog/${year}/${month + 1}`}>
                                    {monthNames[month]}, {year}
                                </a>
                            </li>
                        ))
                    }
                </ul>
            </details>
        ))
    }
</section>
```