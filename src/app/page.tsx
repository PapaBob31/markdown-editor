"use client"

import { useEffect, useState, useRef } from "react"

const operators = "+-/*^|&=<>"
const delimiters = " .?;,:(){}[]`"
const numbers = "0123456789"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'true', 'false', 'null', 'undefined', 'void', 'return', 'if', 'else', 'for'
]

function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.textContent = token
  codeElement.className = classStr
  return codeElement;
}

function highlightCode(text: string) { // js only for now
  let token = ""
  let openedQuotesType = "" // stores the type of opened quotes (' or ") any is encountered during the loop
  let highlightedCode = []

  for (let i=0; i<text.length; i++) {
    let char = text[i]
    token += char

    if (char === '"' || char === "'") {
      openedQuotesType = (openedQuotesType === char ? "" : char)
      if (!openedQuotesType) {
        highlightedCode.push(styleCode(token, "text-green-300"))
      }
      continue
    }
    if (openedQuotesType) {
      continue
    }
    if (text[i] === '/' && text[i+1] === '/') {
      highlightedCode.push(styleCode(text.slice(i, text.length), "text-gray-400"))
      break
    }
    let styledToken2 = null
    if (delimiters.includes(char)) {
      styledToken2 = styleCode(char, "text-gray-400")
      token = token.slice(0, token.length-1)
    }else if (operators.includes(char)) {
      styledToken2 = styleCode(char, "text-orange-500")
      token = token.slice(0, token.length-1)
    }
    if (styledToken2 || (i === text.length-1)) {
      if ( !isNaN(token * 0) ) {
        highlightedCode.push(styleCode(token, "text-orange-300"))
      }else if (keywords.includes(token)) {
        highlightedCode.push(styleCode(token, "text-violet-500"))
      }else highlightedCode.push(styleCode(token, "text-white"))
      token = ""
    }
    styledToken2 && highlightedCode.push(styledToken2)
  }
  return highlightedCode
}

function LineOfCode({addNewLine, lineNo, focused} : {addNewLine: (num: number)=>void, lineNo: number, focused: boolean}) {
  useEffect(() => {
    if (focused && preElement.current) {
      preElement.current.focus()
    }
  }, [focused])
  
  const preElement = useRef<HTMLPreElement>(null)

  function reformatInput(event) {
    let insertedText = ""
    if (event.type === "paste") {
      insertedText = event.clipboardData.getData("text")
    }else {
      insertedText = event.data || ''
    }
    if (event.type !== "keyup") {
      event.preventDefault();
    }
    if (!preElement.current) { // this will never happen 
      return // typescript can rest now
    }
    let selection:any = window.getSelection()
    let range = selection.getRangeAt(0)
    range.setStart(preElement.current, 0)
    let caretOffset = range.toString().length
    let length = preElement.current.textContent.length
    let newText = preElement.current.textContent.slice(0, caretOffset) + insertedText + preElement.current.textContent.slice(caretOffset, length)
    
    let htmlTextList = highlightCode(newText)
    preElement.current.innerHTML = ""
    preElement.current.append(...htmlTextList)
    let newCaretOffset = caretOffset + insertedText.length
    for (let i=0; i<newCaretOffset; i++) {
      selection.modify("move", "right", "character")
    }  
  }

  function gotoNextLine(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addNewLine(lineNo)
    }
  }

  function deleteText(event) {
    if (event.key === "Backspace") {
      reformatInput(event)
    }
  }
  return (
    <div className="flex bg-sky-800">
    <span className="text-gray-300 w-6 pl-2">{lineNo}</span>
     <pre id="fat" contentEditable spellCheck="false" onKeyUp={deleteText} onKeyDown={gotoNextLine} onBeforeInput={reformatInput} onPaste={reformatInput}
     ref={preElement} className="text-white px-4 caret-amber-600 focus:outline-0 focus:outline-transparent focus:bg-sky-900 flex-grow"></pre>
    </div>
   
  )
}


export default function Editor() {
  const [linesKeys, setLinesKeys] = useState([1])
  const freeKeys = useRef<number[]>([])
  const newLineNum = useRef(-1)

  function addNewLine(num: number) {
    let newLineKeys = []
    if (freeKeys.current.length === 0) {
      let len = linesKeys.length
      newLineKeys = [...linesKeys.slice(0, num), linesKeys[len-1]+1, ...linesKeys.slice(num, linesKeys.length)]
    }else {
      newLineKeys = [...linesKeys.slice(0, num), freeKeys.current.pop() as number, ...linesKeys.slice(num, linesKeys.length)]
    }
    newLineNum.current = num+1
    setLinesKeys(newLineKeys)
  }

  function generateLinesofCode() {
    const jsxList = Array(linesKeys.length)
    for (let i=0; i < linesKeys.length; i++) {
      let isFocused = (newLineNum.current === i+1) 
      jsxList[i] = <LineOfCode key={linesKeys[i]} lineNo={i+1} addNewLine={addNewLine} focused={isFocused}/>
    }
    return jsxList;
  }

  return (
    <section>
      {generateLinesofCode()}
    </section>
  )
}
