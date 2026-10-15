# fuz_css

[<img src="static/logo.svg" alt="a fuzzy tuft of green moss" align="right" width="192" height="192">](https://css.fuz.dev/)

> CSS with more utility 🪴

fuz_css is a semantic-first CSS framework and design system.
Semantic HTML looks finished with zero classes:
headings, links, buttons, forms, tables, and callouts come styled,
and block elements space themselves.
Themes are a handful of knobs, not a stylesheet:
hues, intents, lightness curves, and scales
re-derive every color and size in plain CSS,
and the contrast, gamut, and ramp-order checks the shipped themes pass
are an API you can run on your own.
A Vite plugin generates one stylesheet holding only the variables, base styles,
and utility classes your code uses, for Svelte, React, Preact, Solid, and plain HTML.

Browse the [docs](https://css.fuz.dev/docs) at [css.fuz.dev](https://css.fuz.dev/),
and try the [theme editor](https://css.fuz.dev/docs/themes#Theme-editor).
More about the stack at [fuz.dev](https://www.fuz.dev/).

It's in early alpha with breaking changes ahead.
Feedback and design input is welcome in
the [discussions](https://github.com/fuzdev/fuz_css/discussions).

## Install

```bash
npm i -D @fuzdev/fuz_css
```

## Usage

Add the Vite plugin:

```ts
// vite.config.ts
import {defineConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';

export default defineConfig({
	plugins: [sveltekit(), vite_plugin_fuz_css()],
});
```

Then import its virtual module once, from your root layout or entry file:

```ts
import 'virtual:fuz.css';
```

For JSX (React, Preact, Solid), install `acorn-jsx`
and pass it as `vite_plugin_fuz_css({acorn_plugins: [jsx()]})`.
The [setup docs](https://css.fuz.dev/docs/setup) cover each framework
and the TypeScript declaration for the virtual module.

### Without a build step

The package's two plain stylesheets work in any page,
the base `style.css` and `theme.css` with every variable.
jsDelivr serves them from npm - pin a version:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fuzdev/fuz_css@VERSION/dist/theme.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fuzdev/fuz_css@VERSION/dist/style.css" />
```

That's the full semantic styling;
utility classes and baked-in themes need the plugin.

## Semantic first

This form looks finished, themed, and spaced with only a built-in convention class:

```html
<form>
	<label>
		<div class="title">email</div>
		<input type="email" />
	</label>
	<button>subscribe</button>
</form>
```

The `title` class is one of the built-in conventions the base styles recognize,
like `selected` and `palette_c`.
When the defaults don't cover something, reach for a class:

```html
<!-- composite, token, and literal classes -->
<div class="row gap_md justify-content:space-between">
	<button class="palette_c">delete</button>
	<button class="selected">saved</button>
</div>
```

## Coming from Tailwind

- **The root font size is `62.5%`**, so `1rem` is 10px at the browser default
  and body text is `1.6rem`. Every `rem` length on the page follows it,
  including third-party ones, which render at 62.5% of what their authors intended.
  Tailwind's `p-4` is `1rem`, 16px; here 16px is `1.6rem`, and the spacing tokens carry the scale (`p_xl` is 16px at the defaults).
- **Utilities are generated from what you use**, found by parsing your source
  rather than matching it with a regex.
- **Four class types:** token classes map to design variables (`p_md`, `color_a_50`),
  keyword classes are CSS keywords that name their property (`flex`, `sticky`, `uppercase`),
  composites bundle properties (`row`, `box`, `panel`),
  and literals are CSS itself in `property:value` form (`justify-content:center`, `margin:0~auto`),
  with modifiers like `md:` and `hover:`.
- **Tailwind's keyword names resolve, its own names don't:** a Tailwind project's
  `flex`, `hidden`, or `sticky` gets the same CSS here,
  but `items-center` and `justify-between` generate nothing, with no warning,
  so `flex items-center` half-works. Spell those as literals (`align-items:center`).
- **Tokens, keywords, and literals beat composites:** composites render in a lower cascade layer,
  so `panel shadow_md` gets the medium shadow whatever the class order.

More in the [classes docs](https://css.fuz.dev/docs/classes).

## Contributing

[fuz.dev/contributing](https://www.fuz.dev/contributing)

## License [🐦](https://wikipedia.org/wiki/Free_and_open-source_software)

[0BSD](LICENSE)
