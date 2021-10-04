import type { CompileOptions } from 'xdm/lib/integration/rollup.js'
import { createFormatAwareProcessors } from 'xdm/lib/util/create-format-aware-processors.js'
import type { BuildOptions, Plugin, TransformResult } from 'vite'
import type { Pluggable } from 'unified'
import { VFile } from 'vfile'
import { SourceMapGenerator } from 'source-map'
import { compact } from './utils'

export type ResolvePluginFn = (mod: any) => Pluggable
export type AwaitedPluggableLike = null | undefined | false | Pluggable
export type PluggableLike = AwaitedPluggableLike | Promise<Pluggable>
export type PluginLike = PluggableLike | string | [string, any]

export type { Pluggable }

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

export type { CompileOptions }
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
  return compact<Pluggable>(await Promise.all(plugins.map(resolvePlugin)))
}

async function resolvePlugin (plugin: PluginLike): Promise<AwaitedPluggableLike> {
  if (isString(plugin)) return await importPlugin(plugin)
  if (!plugin) return plugin
  if (isStringPlugin(plugin)) return await importPlugin(...plugin)
  return plugin
}

async function importPlugin (pkgName: string, ...options: any[]): Promise<Pluggable> {
  return [await import(pkgName).then(m => m.default), ...options]
}

function isString (val: any): val is string {
  return typeof val === 'string'
}

function isStringPlugin (val: any): val is [string, any] {
  return Array.isArray(val) && isString(val[0])
}
