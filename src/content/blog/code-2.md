---
title: 'Code Five'
description: 'Testing'
pubDate: 'Jul 09 2024'
tags: ['AWS', 'Python', 'Markdown']
---

```svelte meta=---
---
title=/src/content/blog/code-2
dir-level-fade=1
start-line=9
highlight=[11:/blank|verbatim/]
---
<script>
// [!code annotation] This is the first line.
    if (line.trim().length === 0) {
        /* Return blank lines verbatim. */
        return line;// [!code --]
    }
    else {
        /* Remove indent from non-empty lines. */
        return line.slice(indent);// [!code ++]
    }
</script>
    <!--  [!code log] This is another line.-->
<div>{prop}</div>
<!--  [!code warning] This is a much longer post to test out browser width issues.-->
<style>
    div {
        color: black;
    }
    /* [!code error] RED ALERT! */
</style>
```
<cite>[Edgar Allen Poe](http://www.google.com)</cite>

This is inline code `const name = 'John';{:js}`. Isn't it amazing?

> Quoth the raven, never more.
> <cite>[Edgar Allen Poe](http://www.google.com)</cite>

![image](/blog-placeholder-about.jpg)
<cite>[Edgar Allen Poe](http://www.google.com)</cite>