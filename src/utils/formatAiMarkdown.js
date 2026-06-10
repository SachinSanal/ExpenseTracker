import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

/**
 * Convert assistant markdown to sanitized HTML for chat bubbles.
 * @param {string} text
 * @returns {string}
 */
export function formatAiMarkdown(text) {
  if (!text) return ''
  const html = marked.parse(text, { async: false })
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  })
}
