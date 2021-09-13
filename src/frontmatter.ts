import type { Program, VariableDeclarator } from 'estree'
import { name as isValidIdentifierName } from 'estree-util-is-identifier-name'
import { valueToEstree } from 'estree-util-value-to-estree'
import { load as yaml } from 'js-yaml'
import { parse as toml } from 'toml'
import type { Plugin } from 'unified'
import type { Node, Data, Parent } from 'unist'
import visit from 'unist-util-visit'

export type { Plugin }

/**
 * A remark plugin to expose frontmatter data as named exports.
 *
 * @param options - Optional options to configure the output.
 * @returns A unified transformer.
 */
const plugin: Plugin = () => (ast: any) => {
  const parent = ast as Parent
  const frontmatterDeclarationNodes: Node[] = []
  const frontmatterKeys: string[] = []

  visit(parent, (node) => {
    const data = parseFrontmatter(node as Node<Data> & { value: string })
    if (!data) return

    frontmatterKeys.push(...Object.keys(data))
    const frontmatterVariables = Object.entries(data).map(([frontmatterKey, frontmatterValue]) => {
      if (!isValidIdentifierName(frontmatterKey)) {
        throw new Error(
          `Frontmatter keys should be valid identifiers, got: ${JSON.stringify(
            frontmatterKey,
          )}`,
        )
      }
      return {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: frontmatterKey },
        init: valueToEstree(frontmatterValue),
      } as VariableDeclarator
    })

    frontmatterDeclarationNodes.push(defineConsts(...frontmatterVariables))
  })
  parent.children.unshift(...frontmatterDeclarationNodes)
  parent.children.push(defineConsts({
    type: 'VariableDeclarator',
    id: { type: 'Identifier', name: 'frontmatter' },
    init: shorthandObjectExpression(frontmatterKeys),
  } as VariableDeclarator))
}

function parseFrontmatter ({ type, value }: { type: string, value: string }) {
  const data = type === 'yaml' ? yaml(value) : type === 'toml' ? toml(value) : undefined
  if (data && typeof data !== 'object')
    throw new Error(`Expected frontmatter data to be an object, got:\n${value}`)
  return data
}

function shorthandObjectExpression (variables: string[]) {
  return {
    type: 'ObjectExpression',
    properties: variables.map(id => ({
      type: 'Property',
      key: { type: 'Identifier', name: id },
      value: { type: 'Identifier', name: id },
      kind: 'init',
      shorthand: true,
      method: false,
      computed: false,
    })),
  }
}

function defineConsts (...declarations: VariableDeclarator[]) {
  return {
    type: 'mdxjsEsm',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExportNamedDeclaration',
            source: null,
            specifiers: [],
            declaration: {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations,
            },
          },
        ],
      } as Program,
    },
  }
}

export default plugin
