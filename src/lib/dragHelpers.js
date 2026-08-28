// Native HTML5 drag-and-drop shows a browser-rendered "ghost" preview of the
// dragged element and can show a green "+" (copy) cursor if effectAllowed
// isn't set. This makes drags feel more like a native app: no ghost image,
// and a plain "move" cursor instead of the copy icon.

let emptyImg
function getEmptyImage() {
  if (!emptyImg) {
    emptyImg = new Image()
    emptyImg.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7'
  }
  return emptyImg
}

export function cleanDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setDragImage(getEmptyImage(), 0, 0)
}
