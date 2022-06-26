/*
 * @Author: licl
 * @Date: 2022-06-25 13:30:37
 * @LastEditTime: 2022-06-26 14:04:30
 * @LastEditors: licl
 * @Description:
 */
import { createGenerator } from '@unocss/core'
import { describe, expect, test } from 'vitest'
import presetMini from '../src/index'
import { presetMiniTargets } from './assets/preset-mini-targets'
import { align, bg, border, borderColor, color, size, typography } from './assets/weapp'

const uno = createGenerator({
  presets: [
    presetMini({
      dark: 'media',
    }),
  ],
  theme: {
    colors: {
      custom: {
        a: 'var(--custom)',
        b: 'rgba(var(--custom), %alpha)',
      },
    },
  },
})

describe('preset-weapp', () => {
  test('size', async () => {
    const code = size.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  test('border', async () => {
    const code = border.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  test('borderColor', async () => {
    const code = borderColor.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  test('align', async () => {
    const code = align.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  test('color', async () => {
    const code = color.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  test('bg', async () => {
    const code = bg.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  test('typography', async () => {
    const code = typography.join(' ')
    const { css } = await uno.generate(code)
    expect(css).toMatchSnapshot()
  })

  // test('targets', async () => {
  //   const code = presetMiniTargets.join(' ')
  //   const { css } = await uno.generate(code)

  //   expect(css).toMatchSnapshot()
  // })
})
