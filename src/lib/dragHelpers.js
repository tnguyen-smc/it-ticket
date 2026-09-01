// Native HTML5 drag-and-drop shows a browser-rendered "ghost" preview of the
// dragged element by default, and can show a green "+" (copy) cursor if
// effectAllowed isn't set. This builds a small custom preview card instead —
// so dragging still looks and feels intentional, rather than empty — and
// forces the cursor to "move" instead of "copy".
export function setCustomDragPreview(e, { label, count = 1 }) {
  e.dataTransfer.effectAllowed = 'move'

  const preview = document.createElement('div')
  preview.style.cssText = `
    position: fixed;
    top: -1000px;
    left: -1000px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    padding: 8px 14px;
    font: 600 13px -apple-system, system-ui, sans-serif;
    color: #334155;
    box-shadow: 0 6px 16px rgba(0,0,0,0.18);
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `
  preview.textContent = count > 1 ? `${count} requests` : label || 'Request'
  document.body.appendChild(preview)
  e.dataTransfer.setDragImage(preview, 16, 16)
  // Browsers read the drag image synchronously at dragstart, so it's safe to
  // remove the node right after this call returns.
  setTimeout(() => {
    if (preview.parentNode) preview.parentNode.removeChild(preview)
  }, 0)
}

export function cleanDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  if (!emptyImg) {
    emptyImg = new Image()
    emptyImg.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7'
  }
  e.dataTransfer.setDragImage(emptyImg, 0, 0)
}

let emptyImg