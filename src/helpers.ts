
import { type CollectionEntry, getCollection } from 'astro:content';

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