export function getCurrentCaretPosition(focusedElement: HTMLElement) {
  let selection = window.getSelection() as any
  let selectedContentLength = selection.toString().replaceAll("\r","").length
  selection.collapseToStart()

  let range = selection.getRangeAt(0)
  range.setStart(focusedElement, 0)
  selection.addRange(range)
  let caretOffset = selection.toString().replaceAll("\r","").length
  selection.collapseToEnd()
  range.collapse()
  return [caretOffset, selectedContentLength]
}

export function moveCaretToNewPosition(newCaretOffset: number, textNode: HTMLElement) {
  let selection = window.getSelection()
  if (!selection) {
    return
  }
  const range = selection.getRangeAt(0)
  range.setStart(textNode, 0) // why does firefox ignore new lines in it's ranges
  range.setEnd(textNode, 0)
  selection.addRange(range)
  selection.collapseToEnd()
  for (let i=0; i<newCaretOffset; i++) { // very inefficient but it works cross browser (DAMN YOU FIREFOX!). must find better alternative
    selection.modify("move", "right", "character")
  }  
}
