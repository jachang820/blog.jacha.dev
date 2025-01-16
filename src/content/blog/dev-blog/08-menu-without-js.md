---
title: 'HTML: Hamburger menu without JS'
description: 'Menus used to require Javascript to work. With new CSS standards, not anymore.'
pubDate: 'Jan 7 2025'
tags: ['html']
---
Not too long ago, if we wanted to make navigation menus, it took Javascript to animate the icons, and open and close menus on click. Today, CSS can achieve all of this as long as some attention is paid to its structure to make them accessible to the selectors. For this example, we'll create a "plus" icon that rotates into an "X" when clicked. On top of that, it opens a menu. We might also want the menu to be fully visible when the screen width exceeds a threshold e.g. for desktop monitors.

We'll start with a typical HTML layout of a menu icon on top of main content section with some navigation links on the right.

```html highlight=[2-5]
<details>
    <summary>
        <div class="vertical"></div>
        <div class="horizontal"></div>
    </summary>
</details>
<main>
    <article>
        <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vitae ultricies leo integer malesuada nunc vel risus commodo viverra. Adipiscing enim eu turpis egestas pretium. Euismod elementum nisi quis eleifend quam adipiscing. 
        </p>
    </article>
    <nav>
        <ul>
            <li>Menu Item 1</li>
            <li>Menu Item 2</li>
        </ul>
    </nav>
</main>
```
The `<details>{:html}` will be leveraged for the menu icon, since it has the built-in capability to add an `open` attribute when clicked without Javascript. Of course, it takes some styling to get it to how we might want it.
```css
details {
    /* [!code annotation] Place the icon in the top right corner. */
    position: absolute;
    top: 10px;
	right: 10px;
    /* [!code annotation] Parametrize some sizes, so they can be adapted for Astro. */
    --icon-size: 30px;
    --icon-width: 8px;
    --icon-start: calc(0.5 * (var(--icon-size) - var(--icon-width)));
    --icon-color: black;
    width: var(--icon-size);
	height: var(--icon-size);
    /* [!code annotation] Summary is shown whether open or closed. It defaults with an arrow list style, which we need to remove. */
    & summary {
        list-style: none;

        /* [!code annotation] Change cursor and icon appearance when mouse is hovered to make it feel more like a button. */
        &:hover {
            cursor: pointer;
            opacity: 0.6;
        }

        & div {
            /* [!code annotation] These divs represent the two bars of the "Plus" icon.*/
            transition-duration: 0.5s;
            position: absolute;
            background-color: var(--icon-color);
            &.vertical {
                width: var(--icon-width);
                height: var(--icon-size);
                left: var(--icon-start);
            }
            &.horizontal {
                width: var(--icon-size);
                height: var(--icon-width);
                top: var(--icon-start);
            }
        }
    }
    /* [!code annotation] The "open" attribute on <details> is added when clicked and selected with css. */
    &[open] summary {
        /* [!code annotation] Rotate the "Plus" icon to create an "X" icon when clicked. */
        transform: rotateZ(45deg) scale(1.2);
    }
    /* [!code annotation] Let's give some default styling to the main content and nav links. */
    & + main {
        /* [!code annotation] Make sure the text starts below the menu icon. */
        margin-top: 50px;
        /* [!code annotation] On larger screens, nav links should appear on the right quarter of the screen. Put a little spacing around each component. */
        @media (min-width: 600px) {
            display: flex;
            gap: 1rem;
            margin-left: 1rem;
            margin-right: 1rem;
        }
        & article {
            @media (min-width: 600px) {
                flex-basis: 75%;
            }
        }
        & nav {
            @media (min-width: 600px) {
                flex-basis: 25%;
                text-align: center;
            }
            & ul {
                /* [!code annotation] Lists come with 40px left padding by default. We want the menu to be centered instead. */
                padding: 0;
                list-style: none;
            }
        }
    }
}
```
The remaining styling is what's important. We already have a flex container that splits content and navigation to a 75% to 25% basis for larger screens, when the screen width is greater than 600px. We've set the appearance of the icon when it's open and closed. What's left is to make the icon invisible on large screens, and open the menu on top when the icon is clicked for smaller screens.

```css
/* [!code annotation] Hide icon on larger screens since navigation is already on the right side. */
details {
    @media (min-width: 600px) {
        display: none;
    }
    /* [!code annotation] Hide navigation on smaller screens when the menu is closed. */
    & + main nav {
        @media (max-width: 599px) {
            display: none;
        }
    }
    /* [!code annotation] Show a floating navigation menu when it is open on smaller screens. */
    &[open] + main nav {
       @media (max-width: 599px) {
            /* [!code annotation] Stretch menu across screen, but underneath the icon. */
            position: absolute;
            top: 0;
            width: 95%;
            margin-top: 50px;
            padding-top: 4rem;
            padding-bottom: 4rem;
            /* [!code annotation] Center menu items. */
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            /* [!code annotation] Give it some color to hide main text behind it. */
            background-color: lightslategray;
            z-index: 100;
        } 
    }
}
```

## Results

This is what it looks like on larger screens without the menu icon.

<style>
    div.menu-without-js-large {
        position: relative;
        width: 90%;
        margin: 0 auto;
        border: 1px solid #999;
        border-radius: 1rem;
        box-sizing: border-box;
    }

    .menu-without-js-large main {
        margin-top: 50px;
        display: flex;
        gap: 1rem;
        margin-left: 1rem;
        margin-right: 1rem;
    }

    .menu-without-js-large main article {
        flex-basis: 75%;
    }

    .menu-without-js-large main nav {
        & ul {
            padding: 0;
            list-style: none;
        }

        display: inline-block;
        flex-basis: 25%;
        text-align: center;
    }
</style>

<div class="menu-without-js-large">
    <main>
        <article>
            <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vitae ultricies leo integer malesuada nunc vel risus commodo viverra. Adipiscing enim eu turpis egestas pretium. Euismod elementum nisi quis eleifend quam adipiscing.
            </p>
        </article>
        <nav>
            <ul>
                <li>Menu Item 1</li>
                <li>Menu Item 2</li>
            </ul>
        </nav>
    </main>
</div>

This is what it looks like on smaller screens.

<style>
    div.menu-without-js-small {
        position: relative;
        width: 90%;
        margin: 0 auto;
        border: 1px solid #999;
        border-radius: 1rem;
        box-sizing: border-box;
    }

    .menu-without-js-small details {
        position: absolute;
        display: inline-block;
        --icon-size: 30px;
        --icon-width: 8px;
        --icon-start: calc(0.5 * (var(--icon-size) - var(--icon-width)));
        width: var(--icon-size);
        height: var(--icon-size);
        top: 10px;
        right: 2rem;

        & summary {
            list-style: none;

            &:hover {
                cursor: pointer;
                opacity: 0.5;
            }

            & div {
                transition-duration: 0.5s;
                position: absolute;
                @media (prefers-color-scheme: light) {
                    background-color: black;
                }
                @media (prefers-color-scheme: dark) {
                    background-color: white;
                }

                &.vertical {
                    width: 8px;
                    height: 30px;
                    left: var(--icon-start);
                }

                &.horizontal {
                    width: 30px;
                    height: 8px;
                    top: 11px;
                }
            }
        }

        &[open] summary {
            & div {
                transform: rotateZ(45deg) scale(1.2);
            }
        }

        & + main {
            margin-top: 50px;
            margin-left: 1rem;
            margin-right: 1rem;
        }

        & + main nav {
            & ul {
                padding: 0;
                list-style: none;
            }
        }

        & + main nav {
            display: none;
        }

        &[open] + main nav {
            position: absolute;
            padding-top: 2rem;
            padding-bottom: 2rem;
            display: flex;
            flex-direction: column;
            gap: 5rem;
            justify-content: flex-start;
            align-items: center;
            background-color: lightslategray;
            margin-top: 50px;
            top: 0;
            width: 95%;
        }
    }
</style>

<div class="menu-without-js-small">
    <details>
        <summary>
            <div class="vertical"></div>
            <div class="horizontal"></div>
        </summary>
    </details>
    <main>
        <article>
            <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vitae ultricies leo integer malesuada nunc vel risus commodo viverra. Adipiscing enim eu turpis egestas pretium. Euismod elementum nisi quis eleifend quam adipiscing.
            </p>
        </article>
        <nav>
            <ul>
                <li>Menu Item 1</li>
                <li>Menu Item 2</li>
            </ul>
        </nav>
    </main>
</div>