import type { CompileOptions } from 'xdm/lib/integration/rollup.js'
import { createFormatAwareProcessors } from 'xdm/lib/util/create-format-aware-processors.js'
import type { BuildOptions, Plugin, TransformResult } from 'vite'
import type { Pluggable } from 'unified'
import { VFile } from 'vfile'
import { SourceMapGenerator } from 'source-map'
import { compact } from './utils'
export type { default as FrontmatterPlugin } from './frontmatter'

type PluginLike = null | undefined | false | Pluggable | Promise<Pluggable>

interface CustomOptions {
  /**
   * Remark plugins that should be used to process files.
   */
  remarkPlugins?: PluginLike[]

  /**
   * Rehype plugins that should be used to process files.
   */
  rehypePlugins?: PluginLike[]
}

export type PluginOptions = Omit<CompileOptions, 'remarkPlugins' | 'rehypePlugins'> & CustomOptions

export type XdmProcessor = ReturnType<typeof createFormatAwareProcessors>

export default function VitePluginXDM (options: PluginOptions = {}) {
  const { remarkPlugins = [], rehypePlugins = [], ...rest } = options

  let _xdm: XdmProcessor
  let sourcemap: BuildOptions['sourcemap'] = false

  async function createXDM () {
    return _xdm = createFormatAwareProcessors({
      SourceMapGenerator: sourcemap ? SourceMapGenerator : undefined,
      remarkPlugins: await resolvePlugins(remarkPlugins),
      rehypePlugins: await resolvePlugins(rehypePlugins),
      ...rest,
    })
  }

  const plugin = {
    name: 'vite-plugin-xdm',

    get api () {
      return _xdm || createXDM()
    },

    configResolved (config) {
      sourcemap = config.build.sourcemap
    },

    async transform (value, path) {
      const xdm = await plugin.api
      const file = new VFile({ value, path })

      if (file.extname && xdm.extnames.includes(file.extname)) {
        const compiled = await xdm.process(file)
        return { code: String(compiled.value), map: compiled.map } as TransformResult
      }
    },
  } as Plugin & { api: XdmProcessor }

  return plugin
}

// Resolve plugins that might need an async import in CJS.
async function resolvePlugins (plugins: PluginLike[]) {
  return compact<Pluggable>(await Promise.all(plugins))
}
