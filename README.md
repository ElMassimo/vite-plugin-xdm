<h2 align='center'><samp>vite-plugin-xdm</samp></h2>

<p align='center'>
  <a href='https://www.npmjs.com/package/vite-plugin-xdm'>
    <img src='https://img.shields.io/npm/v/vite-plugin-xdm?color=222&style=flat-square'>
  </a>
  <a href='https://github.com/ElMassimo/vite-plugin-xdm/blob/main/LICENSE.txt'>
    <img src='https://img.shields.io/badge/license-MIT-blue.svg'>
  </a>
</p>

<br>

[plugin]: https://github.com/ElMassimo/vite-plugin-xdm
[vite.js]: http://vitejs.dev/
[xdm]: https://github.com/wooorm/xdm

## Why? 🤔

[xdm] is distributed as ESM-only, which makes it difficult to use
in [Vite.js] projects that have any CJS dependencies.

This plugin is a light wrapper around [xdm] that can receive plugins as promises,
simplifying the usage to avoid `async` and `await` wrappers.


## Installation 💿

Install the package as a development dependency:

```bash
npm i -D vite-plugin-xdm # yarn add -D vite-plugin-xdm
```

## Usage 🚀

You can provide any options that [xdm] would receive for MDX compilation.

```js
import { defineConfig } from 'vite'
import xdm from 'vite-plugin-xdm'

export default defineConfig({
  plugins: [
    xdm(
      remarkPlugins: [
        'remark-frontmatter',
        import('remark-mdx-frontmatter').then(mod =>
          [(mod.default || mod).remarkMdxFrontmatter, { name: 'frontmatter' }]
        ),
      ],
      rehypePlugins: [
        ['@mapbox/rehype-prism', { alias: { markup: ['html', 'vue'] } }],
      ],
    ),
  ],
})
```

Promises are also supported with `rehypePlugins`.

## Acknowledgements

- [xdm] — Excellent library, fast, and very well documented.

## License

This library is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
