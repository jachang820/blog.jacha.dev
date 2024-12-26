---
title: 'Code 2'
description: 'Testing'
pubDate: 'Jul 09 2024'
heroImage: '/blog-placeholder-3.jpg'
---

```svelte meta="---"
---
title="Code 2"
startLine=86
highlight=[87:7-13#v,87:8-12#f]
---
<script>
    if (line.trim().length === 0) {
        /* Return blank lines verbatim. */
        return line; // [!code warning]
    }
    else {
        /* Remove indent from non-empty lines. */
        return line.slice(indent); // [!code ++]
    }
</script>
<div>{prop}</div>
<style>
    div {
        color: black;
    }
</style>
```
`const name = 'John'; {:js}`