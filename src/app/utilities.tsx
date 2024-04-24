export function getCurrentCaretPosition(focusedElement: HTMLElement) {
  let selection = window.getSelection() as any
  let range = selection.getRangeAt(0)
  range.setStart(focusedElement, 0)
  selection.addRange(range)
  let caretOffset = selection.toString().replaceAll("\r","").length
  selection.collapseToEnd()
  range.collapse()
  return caretOffset
}

export function moveCaretToNewPosition(newCaretOffset: number, textNode: HTMLElement) {
  let selection = window.getSelection()
  if (!selection) {
    return
  }
  const range = selection.getRangeAt(0)
  range.setStart(textNode, newCaretOffset)
  range.setEnd(textNode, newCaretOffset)
  selection.addRange(range)
}
