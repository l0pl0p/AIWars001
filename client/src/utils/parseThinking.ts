/**
 * Parses content that may contain <think>...</think> blocks.
 *
 * Returns:
 *   - thinking: the text inside <think> tags (null if none found)
 *   - response: the text after </think> (or all of content if no <think> tag)
 *   - isThinkingInProgress: true if <think> has started but </think> hasn't appeared yet
 */
export interface ThinkingParsed {
  thinking: string | null;
  response: string;
  isThinkingInProgress: boolean;
}

export function parseThinking(content: string): ThinkingParsed {
  const openTag = '<think>';
  const closeTag = '</think>';

  const openIdx = content.indexOf(openTag);
  if (openIdx === -1) {
    // No thinking block at all
    return { thinking: null, response: content, isThinkingInProgress: false };
  }

  const closeIdx = content.indexOf(closeTag, openIdx + openTag.length);

  if (closeIdx === -1) {
    // <think> started but hasn't ended yet — streaming in progress
    const thinkingContent = content.slice(openIdx + openTag.length);
    return {
      thinking: thinkingContent,
      response: '',
      isThinkingInProgress: true,
    };
  }

  // Both tags found
  const thinkingContent = content.slice(openIdx + openTag.length, closeIdx).trim();
  const responseContent = content.slice(closeIdx + closeTag.length).trim();

  return {
    thinking: thinkingContent || null,
    response: responseContent,
    isThinkingInProgress: false,
  };
}

/**
 * Estimates how long the model was "thinking" based on approximate
 * character count (very rough heuristic: ~4 chars/token, ~3 tokens/second).
 */
export function estimateThinkingSeconds(thinkingText: string): number {
  const tokens = thinkingText.length / 4;
  return Math.round(tokens / 3);
}
