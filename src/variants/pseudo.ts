import type { VariantObject } from '@unocss/core'
import { escapeRegExp, escapeSelector, warnOnce } from '@unocss/core'

import { restoreSelector } from 'unplugin-transform-class/utils'
import type { PresetWeappOptions } from '..'
import { handler as h, variantGetBracket } from '../utils'
import type { Theme } from '../theme'

const PseudoClasses: Record<string, string> = Object.fromEntries([
  // pseudo elements part 1
  ['first-letter', '::first-letter'],
  ['first-line', '::first-line'],

  // location
  'any-link',
  'link',
  'visited',
  'target',
  ['open', '[open]'],

  // forms
  'default',
  'checked',
  'indeterminate',
  'placeholder-shown',
  'autofill',
  'optional',
  'required',
  'valid',
  'invalid',
  'in-range',
  'out-of-range',
  'read-only',
  'read-write',

  // content
  'empty',

  // interactions
  'focus-within',
  'hover',
  'focus',
  'focus-visible',
  'active',
  'enabled',
  'disabled',

  // tree-structural
  'root',
  'empty',
  ['even-of-type', ':nth-of-type(even)'],
  ['even', ':nth-child(even)'],
  ['odd-of-type', ':nth-of-type(odd)'],
  ['odd', ':nth-child(odd)'],
  'first-of-type',
  ['first', ':first-child'],
  'last-of-type',
  ['last', ':last-child'],
  'only-child',
  'only-of-type',

  // pseudo elements part 2
  ['backdrop-element', '::backdrop'],
  ['placeholder', '::placeholder'],
  ['before', '::before'],
  ['after', '::after'],
  ['selection', '::selection'],
  ['marker', '::marker'],
  ['file', '::file-selector-button'],
].map(key => Array.isArray(key) ? key : [key, `:${key}`]))

const PseudoClassesKeys = Object.keys(PseudoClasses)

const PseudoClassesColon: Record<string, string> = Object.fromEntries([
  ['backdrop', '::backdrop'],
].map(key => Array.isArray(key) ? key : [key, `:${key}`]))

const PseudoClassesColonKeys = Object.keys(PseudoClassesColon)

const PseudoClassFunctions = [
  'not',
  'is',
  'where',
  'has',
]

const PseudoClassesStr = Object.entries(PseudoClasses).filter(([, pseudo]) => !pseudo.startsWith('::')).map(([key]) => key).join('|')
const PseudoClassesColonStr = Object.entries(PseudoClassesColon).filter(([, pseudo]) => !pseudo.startsWith('::')).map(([key]) => key).join('|')
const PseudoClassFunctionsStr = PseudoClassFunctions.join('|')

function taggedPseudoClassMatcher(tag: string, parent: string, combinator: string): VariantObject {
  const rawRE = new RegExp(`^(${escapeRegExp(parent)}:)(\\S+)${escapeRegExp(combinator)}\\1`)
  const pseudoRE = new RegExp(`^${tag}-(?:(?:(${PseudoClassFunctionsStr})-)?(${PseudoClassesStr}))(?:(/\\w+))?[:-]`)
  const pseudoColonRE = new RegExp(`^${tag}-(?:(?:(${PseudoClassFunctionsStr})-)?(${PseudoClassesColonStr}))(?:(/\\w+))?[:]`)

  const matchBracket = (input: string) => {
    const body = variantGetBracket(`${tag}-`, input, [])
    if (!body)
      return

    const [match, rest] = body
    const bracketValue = h.bracket(match)
    if (bracketValue == null)
      return

    const label = rest.split(/[:-]/, 1)?.[0] ?? ''
    const prefix = `${parent}${escapeSelector(label)}`
    return [
      label,
      input.slice(input.length - (rest.length - label.length - 1)),
      bracketValue.includes('&') ? bracketValue.replace(/&/g, prefix) : `${prefix}${bracketValue}`,
    ]
  }

  const matchPseudo = (input: string) => {
    const match = input.match(pseudoRE) || input.match(pseudoColonRE)
    if (!match)
      return

    const [original, fn, pseudoKey] = match
    const label = match[3] ?? ''
    let pseudo = PseudoClasses[pseudoKey] || PseudoClassesColon[pseudoKey] || `:${pseudoKey}`
    if (fn)
      pseudo = `:${fn}(${pseudo})`

    return [
      label,
      input.slice(original.length),
      `${parent}${escapeSelector(label)}${pseudo}`,
      pseudoKey,
    ]
  }

  return {
    name: `pseudo:${tag}`,
    match(input) {
      if (!input.startsWith(tag))
        return

      const result = matchBracket(input) || matchPseudo(input)
      if (!result)
        return

      const [label, matcher, prefix, pseudoName = ''] = result as [string, string, string, string | undefined]

      if (label !== '')
        warnOnce('The labeled variant is experimental and may not follow semver.')

      return {
        matcher,
        handle: (input, next) => next({
          ...input,
          prefix: `${prefix}${combinator}${input.prefix}`.replace(rawRE, '$1$2:'),
          sort: PseudoClassesKeys.indexOf(pseudoName) ?? PseudoClassesColonKeys.indexOf(pseudoName),
        }),
      }
    },
    multiPass: true,
  }
}

const PseudoClassesAndElementsStr = Object.entries(PseudoClasses).map(([key]) => key).join('|')
const PseudoClassesAndElementsColonStr = Object.entries(PseudoClassesColon).map(([key]) => key).join('|')

const PseudoClassesAndElementsRE = new RegExp(`^(${PseudoClassesAndElementsStr})[:-]`)
const PseudoClassesAndElementsColonRE = new RegExp(`^(${PseudoClassesAndElementsColonStr})[:]`)

export const variantPseudoClassesAndElements: VariantObject<Theme> = {
  name: 'pseudo',
  match(input: string, content) {
    input = restoreSelector(input, content.theme.transformRules)

    const match = input.match(PseudoClassesAndElementsRE) || input.match(PseudoClassesAndElementsColonRE)
    if (match) {
      const pseudo = PseudoClasses[match[1]] || PseudoClassesColon[match[1]] || `:${match[1]}`

      // order of pseudo classes
      let index: number | undefined = PseudoClassesKeys.indexOf(match[1])
      if (index === -1)
        index = PseudoClassesColonKeys.indexOf(match[1])
      if (index === -1)
        index = undefined

      return {
        matcher: input.slice(match[0].length),
        handle: (input, next) => {
          const selectors = pseudo.startsWith('::')
            ? {
                pseudo: `${input.pseudo}${pseudo}`,
              }
            : {
                selector: `${input.selector}${pseudo}`,
              }

          return next({
            ...input,
            ...selectors,
            sort: index,
            noMerge: true,
          })
        },
      }
    }
  },
  multiPass: true,
  autocomplete: `(${PseudoClassesAndElementsStr}):`,
}

const PseudoClassFunctionsRE = new RegExp(`^(${PseudoClassFunctionsStr})-(${PseudoClassesStr})[:-]`)
const PseudoClassColonFunctionsRE = new RegExp(`^(${PseudoClassFunctionsStr})-(${PseudoClassesColonStr})[:]`)

export const variantPseudoClassFunctions: VariantObject<Theme> = {
  match(input: string, content) {
    input = restoreSelector(input, content.theme.transformRules)
    const match = input.match(PseudoClassFunctionsRE) || input.match(PseudoClassColonFunctionsRE)

    if (match) {
      const fn = match[1]
      const pseudo = PseudoClasses[match[2]] || PseudoClassesColon[match[2]] || `:${match[2]}`
      return {
        matcher: input.slice(match[0].length),
        selector: s => `${s}:${fn}(${pseudo})`,
      }
    }
  },
  multiPass: true,
  autocomplete: `(${PseudoClassFunctionsStr})-(${PseudoClassesStr}|${PseudoClassesColonStr}):`,
}

export function variantTaggedPseudoClasses(options: PresetWeappOptions = {}): VariantObject[] {
  const attributify = !!options?.attributifyPseudo

  return [
    taggedPseudoClassMatcher('group', attributify ? '[group=""]' : '.group', ' '),
    taggedPseudoClassMatcher('peer', attributify ? '[peer=""]' : '.peer', '~'),
    taggedPseudoClassMatcher('parent', attributify ? '[parent=""]' : '.parent', '>'),
    taggedPseudoClassMatcher('previous', attributify ? '[previous=""]' : '.previous', '+'),
  ]
}

const PartClassesRE = /(part-\[(.+)]:)(.+)/
export const variantPartClasses: VariantObject = {
  match(input: string) {
    const match = input.match(PartClassesRE)
    if (match) {
      const part = `part(${match[2]})`
      return {
        matcher: input.slice(match[1].length),
        selector: s => `${s}::${part}`,
      }
    }
  },
  multiPass: true,
}
