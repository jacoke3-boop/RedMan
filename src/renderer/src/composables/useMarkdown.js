/**
 * Simple markdown to HTML converter for Reddit self-text
 * Supports: bold, italic, links, lists, code blocks
 */

export function useMarkdown() {
  const renderMarkdown = (text) => {
    if (!text) return ''

    let html = text
      // Code blocks (```...```)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code (`...`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold (**...** or __...__))
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      // Italic (*...* or _..._)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')

    return `<p>${html}</p>`
  }

  return { renderMarkdown }
}
