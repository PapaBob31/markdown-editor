"use client"

import { useEffect, useState, useRef } from "react"

const operators = ["...", "in", '+', '?', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,:(){}[]`"
const numbers = "0123456789"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']

function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.textContent = token
  codeElement.className = classStr
  return codeElement;
}

// TODO:
// HTML, CSS
// escape chars e.g \t, \n

function highlightCode(text: string) { // js only for now
  let token = ""
  let openedQuotesType = "" // stores the type of opened quotes (' or ") if any is encountered during the loop
  let highlightedCode = []
  let prevTokenType = null
  let currentTokenType = null
  let i = 0;
  let stringNotParsed = true

  while (stringNotParsed) {
    let char = ( i < text.length ? text[i] : "")

    if (char === '"' || char === "'") {
      if (openedQuotesType){ 
        if (openedQuotesType === char) {
          openedQuotesType = ''
        }
      }else {
        openedQuotesType = char
        prevTokenType = currentTokenType
        currentTokenType = "string"
      }
    }else if (!openedQuotesType && char) {
      if (delimiters.includes(char)) {
        if (currentTokenType !== 'delimiter') {
          prevTokenType = currentTokenType
          currentTokenType = 'delimiter'
        }
      }else if (operators.includes(char)) {
        if (currentTokenType !== 'operator') {
          prevTokenType = currentTokenType
          currentTokenType = 'operator'
        }
      }else if (currentTokenType !== 'unknown') {
        prevTokenType = currentTokenType
        currentTokenType = 'unknown'
      }
    }

    if (i === text.length) {
      if (currentTokenType) {
        prevTokenType = currentTokenType
      }
      stringNotParsed = false
    }

    if (prevTokenType) {
      if (prevTokenType === "string") {
        highlightedCode.push(styleCode(token, "text-green-300"))
      }else if ( !isNaN(token * 0) ) {
        highlightedCode.push(styleCode(token, "text-orange-300"))
      }else if (keywords.includes(token)) {
        highlightedCode.push(styleCode(token, "text-purple-400"))
      }else if (keywordsValues.includes(token)) {
        highlightedCode.push(styleCode(token, "text-red-400"))
      }else if (prevTokenType === "operator" || operators.includes(token.trim())) {
        highlightedCode.push(styleCode(token, "text-amber-500"))
      }else if (prevTokenType === "delimiter") {
        if (token.trimStart()[0] === '(') {
          let lastIndex = highlightedCode.length - 1
          if (highlightedCode[lastIndex].classList.contains("text-white")) {
            highlightedCode[lastIndex].classList.replace("text-white", "text-sky-400")
          }
        }
        highlightedCode.push(styleCode(token, "text-zinc-200"))
      }else highlightedCode.push(styleCode(token, "text-white"))
      prevTokenType = null
      token = ""
    }
    token += char
    i++
  }
  return highlightedCode
}

function LineOfCode({addNewLine, lineNo, focused, initCaretOffset, moveCaret} : 
  {addNewLine: (num: number)=>void, lineNo: number, focused: boolean, initCaretOffset: number, moveCaret: (dir: string, num1: number, num2: number)=>void}) {
  useEffect(() => {
    if (focused && preElement.current) {
      preElement.current.focus()
      let textLength = preElement.current.textContent.length
      let initSelection = window.getSelection()
      const caretOffset = initCaretOffset > textLength ? textLength : initCaretOffset
      for (let i=0; i<caretOffset; i++) {
        initSelection.modify("move", "right", "character")
      }
    }
  }, [focused, initCaretOffset])
  
  const preElement = useRef<HTMLPreElement>(null)
  const currentCaretOffset = useRef(-1)
 

  function reformatInput(event) {
    let insertedText = ""
    if (event.type === "paste") {
      insertedText = event.clipboardData.getData("text")
    }else if (event.type === "keydown" && event.key === "Tab") {
      insertedText = '\t'
    }else {
      insertedText = event.data || ''
    }
    if (event.type !== "keyup") {
      event.key !== 'Enter' && event.preventDefault();
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
    currentCaretOffset.current = newCaretOffset
    for (let i=0; i<newCaretOffset; i++) {
      selection.modify("move", "right", "character")
    }  
  }

  function gotoNextLine(event) {
    if (event.key === "Tab") {
      reformatInput(event)
    }
    // if (event.key === "ArrowUp") {
    //   moveCaret("up", lineNo, currentCaretOffset.current)
    // }
    // if (event.key === "ArrowDown") {
    //   moveCaret("down", lineNo, currentCaretOffset.current)
    // }
    // if (event.key === "Enter") {
    //   event.preventDefault();
    //   addNewLine(lineNo)
    // }
  }

  function deleteText(event) {
    if (event.key === "Backspace") {
      reformatInput(event)
    }
  }

  return (
    <div className="flex bg-sky-800">
    <span className="text-gray-300 w-6 pl-2">{lineNo}</span>
     <pre contentEditable spellCheck="false" onKeyUp={deleteText} onKeyDown={gotoNextLine} onBeforeInput={reformatInput} onPaste={reformatInput}
     ref={preElement} className="text-white px-4 caret-amber-600 outline-none focus:bg-sky-900 flex-grow"></pre>
    </div>
   
  )
}


export default function Editor() {
  const [linesKeys, setLinesKeys] = useState([1])
  const freeKeys = useRef<number[]>([])
  const focusedLine = useRef({number: 0, caretOffset: 0})

  function addNewLine(num: number) {
    let newLineKeys = []
    if (freeKeys.current.length === 0) {
      let len = linesKeys.length
      newLineKeys = [...linesKeys.slice(0, num), linesKeys[len-1]+1, ...linesKeys.slice(num, linesKeys.length)]
    }else {
      newLineKeys = [...linesKeys.slice(0, num), freeKeys.current.pop() as number, ...linesKeys.slice(num, linesKeys.length)]
    }
    focusedLine.current.number = num+1
    setLinesKeys(newLineKeys)
  }

  function moveCaretToNewLine(direction: string, lineNum: number, caretOffset: number):void {
    if (direction === "up" && lineNum !== 1) {
      focusedLine.current.number = lineNum-1
      focusedLine.current.caretOffset = caretOffset
      setLinesKeys([...linesKeys])
    }else if (direction === "down" && lineNum !== linesKeys.length) {
      focusedLine.current.number = lineNum+1
      focusedLine.current.caretOffset = caretOffset
      setLinesKeys([...linesKeys])
    }
  }

  function generateLinesofCode() {
    const jsxList = Array(linesKeys.length)
    for (let i=0; i < linesKeys.length; i++) {
      let isFocused = (focusedLine.current.number === i+1) 
      jsxList[i] = <LineOfCode key={linesKeys[i]} lineNo={i+1} addNewLine={addNewLine} moveCaret={moveCaretToNewLine}
                    focused={isFocused} initCaretOffset={focusedLine.current.caretOffset}/>
    }
    return jsxList;
  }

  return (
    <section>
      {generateLinesofCode()}
    </section>
  )
}
