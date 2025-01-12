---
title: 'Astro: Search content with Pagefind-UI'
description: 'The best way to use Pagefind-UI with Astro. There are a number of other ways that are less supported or have less functionality.'
pubDate: 'Dec 29 2024'
tags: ['Astro']
---
Pagefind is an open-source Javascript library capable of performant search using limited bandwidth, requiring only a little client-side scripting. It is perfect for being used in conjunction with static generation frameworks like Astro. It achieves this by indexing content into UTF-8 binary encoded meta data. There are several recommended ways to get this up and running.

Most obviously, we could follow the [Installing and running Pagefind](https://pagefind.app/docs/installation/) at the library's documentation and install with `npm install pagefind` or `npx pagefind`. The "--site" option specifies the directory from which Pagefind should be run, which should be where the site is built. For Astro, that is `/dist`. And since we want to update this whenever the site is built, we should update the build script at `package.json` to 

```json title=package.json; highlight=[3];
"scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build && pagefind --site dist && cp -r dist/pagefind public/",
    "preview": "astro preview",
    "astro": "astro"
},
```
Note that the third command in the build script copies the generated pagefind files to `/public/`
