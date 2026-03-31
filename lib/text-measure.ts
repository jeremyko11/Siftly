'use client'

/**
 * Client-side text height measurement using Pretext.
 * Must run in a browser environment with canvas support.
 */
import { prepare, layout } from '@chenglou/pretext'

export interface TextMeasureInput {
  text: string
  /** Width available for text in pixels */
  colWidth: number
  fontSize?: string
  lineHeight?: number
}

/**
 * Measure text height using Pretext (canvas-based, DOM-independent).
 */
export function measureTextHeight(input: TextMeasureInput): number {
  const { text, colWidth, fontSize = '14px system-ui, -apple-system, sans-serif', lineHeight = 20 } = input
  const cleanText = text.replace(/https?:\/\/\S+/g, '').trim()
  if (!cleanText) return 0
  const textWidth = Math.max(100, colWidth - 32) // account for card padding (p-4 = 16px each side)
  try {
    const prepared = prepare(cleanText, fontSize)
    const { height } = layout(prepared, textWidth, lineHeight)
    return Math.round(height + 4) // small buffer
  } catch {
    // Fallback: rough character-based estimate
    const avgCharWidth = fontSize === '14px system-ui, -apple-system, sans-serif' ? 7.8 : 8.5
    return Math.round(Math.ceil(cleanText.length / Math.max(1, textWidth / avgCharWidth)) * lineHeight + 4)
  }
}

/**
 * Batch measure multiple texts — more efficient than individual calls.
 * ~19ms for 500 texts.
 */
export function measureBatchTexts(inputs: TextMeasureInput[]): number[] {
  return inputs.map((input) => measureTextHeight(input))
}

/** Average character width for 14px system-ui */
export const AVG_CHAR_WIDTH = 7.8
