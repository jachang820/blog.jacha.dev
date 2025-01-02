---
title: 'Code 2'
description: 'Testing'
pubDate: 'Jul 09 2024'
tags: ['AWS', 'Python', 'Markdown']
---

```svelte meta="---"
---
title="Code 2"
caption="Example code"
startLine=9
highlight=[10]
---
<script>
    if (line.trim().length === 0) {
        /* Return blank lines verbatim. */
        return line;// [!code --]
    }
    else {
        /* Remove indent from non-empty lines. */
        return line.slice(indent);// [!code ++]
    }
</script>
<div>{prop}</div>
<style>
    div {
        color: black;
    }
</style>
```
<cite>[Edgar Allen Poe](http://www.google.com)</cite>

This is inline code `const name = 'John';{:js}`. Isn't it amazing?

> Quoth the raven, never more.
> <cite>[Edgar Allen Poe](http://www.google.com)</cite>

![image](/blog-placeholder-2.jpg)
<cite>[Edgar Allen Poe](http://www.google.com)</cite>