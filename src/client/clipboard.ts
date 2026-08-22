/** Minimal browser clipboard surface used by the Runtime Inspector panel. */
export interface RuntimeInspectorClipboard {
  readonly writeText: (text: string) => void | Promise<void>
}

/**
 * Write text to the browser/host clipboard and report whether the write was
 * accepted. The fallback keeps the Browser half usable in older or test
 * environments where navigator.clipboard is unavailable.
 */
export async function writeRuntimeInspectorClipboard(
  text: string,
  clipboard?: RuntimeInspectorClipboard,
): Promise<boolean> {
  const target = clipboard
    ?? (typeof navigator === 'undefined' ? undefined : navigator.clipboard)
  if (target?.writeText !== undefined) {
    try {
      await target.writeText(text)
      return true
    } catch {
      return false
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function' || document.body === null) {
    return false
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
