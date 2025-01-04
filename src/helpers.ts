
import { type CollectionEntry } from 'astro:content';
import slugify from 'slugify';

type BlogPost = CollectionEntry<'blog'>;

export const getUniqueTags = (posts: BlogPost[]): string[] => {
     return [...new Set(
        posts.flatMap((post) => 
            post.data.tags?.map((value) => value.toLowerCase()) ?? []
        )
    )];
};

export const getUniqueMonths = (posts: BlogPost[]): number[] => {
    return [...new Set(
        posts.flatMap((post) => {
            const postDate = post.data.updatedDate ?? post.data.pubDate;
            const year = postDate.getUTCFullYear();
            const month = postDate.getUTCMonth();
            return [JSON.stringify([year, month])];
        })
    )].map((value) => JSON.parse(value));
};

export const sortByDateDesc = (a: BlogPost, b: BlogPost) => {
    const aDate = a.data.updatedDate ?? a.data.pubDate;
    const bDate = b.data.updatedDate ?? b.data.pubDate;
    return bDate.valueOf() - aDate.valueOf();
};

export const getDashDate = (date: Date): string => {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    const year = date.getUTCFullYear().toString();
    let month = (date.getUTCMonth() + 1).toString();
    let day = date.getUTCDate().toString();

    // Make sure month and date are two characters
    month = ('0' + month).slice(month.length - 1);
    day = ('0' + day).slice(day.length - 1);

    return `${year}-${month}-${day}`;
};

export const slugifyPost = (post: BlogPost): string => {
    const date = getDashDate(post.data.pubDate);
    const title = slugify(post.data.title, {
        lower: true,
        strict: true
    });
    return `${date}-${title}`;
};