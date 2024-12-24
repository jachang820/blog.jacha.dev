---
title: 'Code 2'
description: 'Testing'
pubDate: 'Jul 09 2024'
heroImage: '/blog-placeholder-3.jpg'
---

```svelte highlight=[2:11-21#f,2:12-16#v,4:19-23]
    <script>
        if (line.trim().length === 0) {
            /* Return blank lines verbatim. */
            return line;
        }
        else {
            /* Remove indent from non-empty lines. */
            return line.slice(indent);
        }
    </script>
    <div>{prop}</div>
    <style>
        div {
            color: black;
        }
    </style>
```
`const name = 'John';{:js}`