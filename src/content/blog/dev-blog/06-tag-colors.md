---
title: 'Astro: Generating tag colors the easy way'
description: 'Rather than manually assign tag colors in a database, we can generate deterministic tags using a hash.'
pubDate: 'Dec 25 2024'
tags: ['Astro', 'typescript']
---
One common functionality when it comes to blogs are tags, or keywords, that categorize posts and make searching easier. Because we want more fine-tuned categories and we can't foresee every keyword that comes up in the future, it would be more convenient to go with a bottom-up approach, where the tags are defined from the posts as opposed to a central repository. With this workflow, we wouldn't want to sap our creative juice worrying about what colors and properties to assign each tag at the same time that we are writing an article. It would be convenient, then, that tags are automatically assigned a color.

The tag color should be deterministic to avoid confusion. Hashes are suitable for this application over PRNGs since a good hash should have good uniformity and an _avalanche effect_. In other words, the output space should be uniform, and small changes in the input should produce a significantly different output. We wouldn't want "C#" and "F#" to have similar colors, nor, say, "HTML" and "XML". We also want generation to be order-invariant, so that adding new tags or changing the ordering preserves previously generated colors.

Since we're using Astro to pre-render a static site, the tags won't be generated in runtime, so we don't need it to be extremely fast. But at the same time, it isn't exactly a security concern, and the color output space isn't so large that extremely strong hashes become necessary. With all this in mind, it's probably worth avoiding writing our own hash function and instead use a fast or non-cryptographic hash functon.

So I did a quick Google for the fastest hash functions and found the following table.

| Name | Speed | Quality | Author |
| :--- | :---: | :---:   | :---   |
| xxHash | 5.4GB/s | 10 | Y.C. |
| MurmurHash 3a | 2.7GB/s | 10 | Austin Appleby |
| SBox | 1.4GB/s | 9 | Bret Mulvey |
| Lookup3 | 1.2GB/s | 9 | Bob Jenkins |
| CityHash64 | 1.05GB/s | 10 | Pike & Alakuijala |
| FNV | 0.55GB/s | 5 | Fowler, Noll, Vo |
| CRC32 | 0.43GB/s | 9 | |
| MD5-32 | 0.33GB/s | 10 | Ronald L. Rivest |
| SHA1-32 | 0.28GB/s | 10 | |

<cite>[Google Open Source Readme](https://chromium.googlesource.com/external/github.com/Cyan4973/xxHash/+/375d401bd4a4eba07ee75d6e627546052cb5b0ec/README.md)</cite>

Rather than use broken cryptographic hashes like SHA1 or MD5 like I was going to, it makes more sense to look into newer algorithms like **xxHash**.

In order to make tags easy to read, there needs to be sufficient contrast between the text and background color. It's not immediately obvious how to determine the _lightness_ of colors using the RGB model. But luckily, CSS allows us to use **HSL** (hue, saturation, lightness), where hue controls the color over 360 degrees, and the other axes of freedom are percentages. For the tags, we'd want every color, but for light themes we might want lower saturation and higher lightness, and for dark themes medium saturation and lower lightness. Note that high saturation causes neon colors that stand out a bit too much and should be avoided.

So the basic steps are:
1. Set a random seed for determinate results.
2. Generate a hash from the tag text lowercased.
3. Use a piece of the hash to generate hues _0-359 degrees_.
4. Use another piece of the hash to generate saturations of, say, about _25-50%_ or so for light themes, and _35-60%_ for dark themes.
5. Use another piece to generate lightnesses of about _60-85%_ for light themes, and _30-55%_ for dark themes.
6. Define a dark gray, near-black color for text using light themes, and a near-white color for dark themes.

Finally, we `npm install js-xxhash{:shell}` and put it all together.

```astro meta=---;
---
title = /src/components/Tag.astro
dir-level-fade = 1
---
---
import { xxHash32 } from 'js-xxhash';
const seed = 0;

interface Props {
    name: string;
}

// [!code annotation] Lower case to reduce duplicate tags from different casing. 
const { name } = Astro.props;
const nameLower = name.toLowerCase();

// [!code annotation] Ex. If hash = 0x9f25c5a7. Then, hue = 0x9f2 % 360, saturation = 0x5c % 25, lightness= 0x5a % 25. 
let hash: string = xxHash32(nameLower, seed).toString(16);
const hue = parseInt(hash.slice(0, 3), 16) % 360;
const saturation = parseInt(hash.slice(3, 5), 16) % 25;
const lightness = parseInt(hash.slice(5, 7), 16) % 25;

const hslLight = `hsl(${hue}deg ${25 + saturation}% ${60 + lightness}%)`;
const hslDark = `hsl(${hue}deg ${35 + saturation}% ${30 + lightness}%)`;
---

<!-- [!code annotation] Abbreviated styling for example. -->
<a href=`/blog/tag/${nameLower}`>
    <span style=`--tag-color-light: ${hslLight}; 
                --tag-color-dark: ${hslDark};`>
        {nameLower}
    </span>
</a>

<style>
    span {
        @media (prefers-color-scheme: light) {
            color: black;
            background-color: var(--tag-color-light);
        }
        @media (prefers-color-scheme: dark) {
            color: white;
            background-color: var(--tag-color-dark);
        }
    }
</style>
```