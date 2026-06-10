/** Instant reply for casual greetings — no API call needed. */
export const GREETING_REPLY =
  'Hi! I can help you understand your spending. Try one of the suggestions above, or ask something like **What is my average monthly spend?**'

/**
 * True when the message is small talk only (no expense question).
 * @param {string} text
 */
export function isCasualGreeting(text) {
  const normalized = (text ?? '')
    .toLowerCase()
    .replace(/[!?.…,]+$/g, '')
    .trim()
  if (!normalized) return false

  if (
    /^(hi|hello|hey|hiya|yo|howdy|sup|thanks|thank you|thx|ty|good morning|good afternoon|good evening|how are you)$/.test(
      normalized,
    )
  ) {
    return true
  }

  const words = normalized.split(/\s+/)
  if (words.length > 4) return false

  const greetingWord =
    /^(hi|hello|hey|hiya|yo|howdy|sup|thanks|thank|you|thx|ty|good|morning|afternoon|evening|how|are|ya|there|doing)$/
  return words.every((w) => greetingWord.test(w))
}
