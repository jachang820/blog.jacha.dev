---
title: 'Astro: Search content with Pagefind-UI'
description: 'The best way to use Pagefind-UI with Astro. There are a number of other ways that are less supported or have less functionality.'
pubDate: 'Dec 29 2024'
tags: ['Astro']
---
Pagefind is an open-source Javascript library capable of performant search using limited bandwidth, requiring only a little client-side scripting. It is perfect for being used in conjunction with static generation frameworks like Astro. It achieves this by indexing content into UTF-8 binary encoded meta data. There are several recommended ways to get this up and running.

## Pagefind

Most obviously, we could follow the [Installing and running Pagefind](https://pagefind.app/docs/installation/) at the library's documentation and install with `npm install pagefind{:shell}` or `npx pagefind{:shell}`. The "--site" option specifies the directory from which Pagefind should be run, which should be where the site is built. For Astro, that is `/dist`. And since we want to update this whenever the site is built, we should update the build script at `package.json` to 

```shell title=package.json; highlight=[3];
"scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build && pagefind --site dist && cp -r dist/pagefind public/",
    "preview": "astro preview",
    "astro": "astro"
},
```
Note that the third command in the build script copies the generated pagefind files to `/public`, which Astro recognizes as part of the root directory during dev. So we'll build the site now with `npm run build{:shell}` so it could generate its utility files under `/pagefind`.

Then we continue with [Getting Started with Pagefind](https://pagefind.app/docs/) and run into our first problem.

```html highlight = [1-2, 6:4-14]; title=/src/components/Pagefind.astro; dir-level-fade=1
<link href="/pagefind/pagefind-ui.css" rel="stylesheet">
<script src="/pagefind/pagefind-ui.js"></script>
<div id="search"></div>
<script>
    window.addEventListener('DOMContentLoaded', (event) => {
        new PagefindUI({ element: "#search", showSubResults: true });
    });
</script>
```
<cite>[Getting Started with Pagefind](https://pagefind.app/docs/)</cite>

In plain Javascript, `/pagefind/pagefind-ui.js` would have loaded first with the definition for PagefindUI. But it's loaded as a client-side script and not recognized by Astro. Typescript also complains that it doesn't know what PagefindUI is and it can't find the types. So it _doesn't_ work out of the box and we'll have to either parse the script file and adapt it to an Astro component, or find a new solution.

## astro-pagefind

Before we get our hands dirty, there is supposedly already a drag and drop integration with Pagefind. I'm talking about the package `npm install astro-pagefind{:shell}`. Install it and then follow the instructions on its [Github repo](https://github.com/shishkin/astro-pagefind), adding the integration to `astro.config.ts`, then adding the `<Search />{:astro}` component.

```javascript title=/astro.config.ts
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";

export default defineConfig({
  build: {
    format: "file",
  },
  integrations: [pagefind()],
});
```
```astro title=/src/layouts/Nav.astro
---
import Search from "astro-pagefind/components/Search";
---

<Search id="search" className="pagefind-ui" uiOptions={{ showImages: false }} />
```
<cite>[astro-pagefind's Github repository](https://github.com/shishkin/astro-pagefind)</cite>

This _seems_ to work fine, following the prior workflow. We build to generate the search indices, etc. However, it appears to fail on some finer details. For example, from Pagefind's [docs](https://pagefind.app/docs/indexing/#removing-individual-elements-from-the-index), we see that it's possible to specify elements that Pagefind builds the index from using a `data-pagefind-body` attribute on its tag. Once the attribute is added, Pagefind will ignore all other content besides the descendents of the elements with that attribute. It is then also possible to specify elements to ignore, either when a `data-pagefind-body` attribute has not been used, or on a child of the prior to exclude a part of it. This is done using the attribute `data-pagefind-ignore`, or `data-pagefind-ignore="all"` to recursively ignore all of its children as well. 

In my tests, _astro-pagefind doesn't recognize_ the `data-pagefind-ignore`. Elements that are supposed to be ignored are still picked up by the search. So if just a site-wide search is desired, then this option works fine. But be aware that some of the fine-tuning features may not work.

## @pagefind/default-ui

Finally, we'll look at a package that seems to be maintained by the creators of Pagefind, or at least a regular contributor. Using `npm install @pagefind/default-ui{:shell}`, it becomes possible to import PagefindUI using _ES6_ syntax, so that Astro could recognize it. This solves the original problem of using the Pagefind script. Now, it becomes...
```javascript highlight=[6:4-14] ;title=/src/components/Pagefind.astro; dir-level-fade=1
import { PagefindUI } from '@pagefind/default-ui'
import styles from "@pagefind/default-ui/css/ui.css";

<script>
    window.addEventListener('DOMContentLoaded', (event) => {
        new PagefindUI({ element: "#search" });
    });
</script>
```
<cite>Adapted from [@pagefind/default-ui at NPM](https://www.npmjs.com/package/@pagefind/default-ui)</cite>

Beautiful. However, when we go to build the index, we get an error that looks something like this.
```shell
src/components/PageFind.astro:9:32 - error ts(7016): Could not find a declaration file for module '@pagefind/default-ui'. 'J:/Projects/devblog-astro/node_modules/@pagefind/default-ui/npm_dist/cjs/ui-core.cjs' implicitly has an 'any' type.
  Try `npm i --save-dev @types/pagefind__default-ui` if it exists or add a new declaration (.d.ts) file containing `declare module '@pagefind/default-ui';`

9     import { PagefindUI } from '@pagefind/default-ui';
```
Luckily, there's a hint on how to resolve this issue from the developer behind `astro-pagefind`, which he describes on [Github issue #209](https://github.com/CloudCannon/pagefind/issues/209#issuecomment-1422618776) that spawned the Pagefind UI package.

Specifically, either we create an `env.d.ts` file to declare the module for the environment.
```typescript title=/src/env.d.ts dir-level-fade=1
declare module "@pagefind/default-ui" {
    declare class PagefindUI {
        constructor(arg: any);
    }
}
```
Or we add a "module" declaration to the script tag.
```javascript highlight=[4:8-31, 6:4-14] ;title=/src/components/Pagefind.astro; dir-level-fade=1
import { PagefindUI } from '@pagefind/default-ui'
import styles from "@pagefind/default-ui/css/ui.css";

<script type="module" is:inline>
    window.addEventListener('DOMContentLoaded', (event) => {
        new PagefindUI({ element: "#search" });
    });
</script>
```
Astro might still complain that the script contains an attribute. It automatically adds an `is:inline` tag to prevent itself from optimizing it. So we should add it explicitly.

After adding some `data-pagefind-body` attributes around the blog post content, and `data-pagefind-ignore` around some stylistic elements that I don't want the search to index, it now works magnificently! 

The search result styling is a bit basic. The beauty of Pagefind is being able to get up and running quickly (_or it should be_, if it weren't for the issues above). If more customization is needed, it does have an API that generate a JSON object from search, which could be used to dynamically create HTML elements or a syntax tree library like [unist](https://github.com/syntax-tree/unist). I've taken a look at this and the path seems easily viable. But I think the styling is okay as it is, and actually writing content is more important at the beginning stages of a blog than perfecting styling.