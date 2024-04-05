"use client"

import { useEffect, useState, useRef } from "react"

const operators = ["...", "in", '+', '?', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,:(){}[]\n`"
const numbers = "0123456789"
const lineComment = "//"
const multiLineComment = "/*"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']

function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.textContent = token
  codeElement.className = classStr
  // codeElement.contentEditable = editable
  return codeElement;
}


// TODO:
// HTML, CSS
// escape chars e.g \t, \n, template literals

function highlightCode(text: string) { // js only for now
  let token = ""
  let openedQuotesType = "" // stores the type of opened quotes (' or ") if any is encountered during the loop
  let highlightedCode = []
  let prevTokenType = null
  let currentTokenType = null
  let i = 0;
  let stringNotParsed = true
  let commentStartPos = -1
  let commentEndPos = -1
  let commentType = ""
  let newLine = false
  let lineCount = 0

  while (stringNotParsed) {
    let char = ( i < text.length ? text[i] : "")

    if (token === lineComment || token === multiLineComment) {
      commentType = token
      if (commentStartPos < 0) commentStartPos = i - (commentType.length)
    }

    if (commentStartPos >= 0) {
      if (commentType === '//' && char === '\n') {
        commentEndPos = i
        prevTokenType = "comment"
      }else if (commentType === '/*' && token.endsWith('*/')) {
        commentEndPos = i
        prevTokenType = "comment"
      } 
    }

    if (commentStartPos < 0 && (char === '"' || char === "'" || char === '`')) {
      if (openedQuotesType){ 
        if (openedQuotesType === char) {
          openedQuotesType = ''
        }
      }else {
        openedQuotesType = char
        prevTokenType = currentTokenType
        currentTokenType = "string"
      }
    }else if (!openedQuotesType && char && commentStartPos < 0) {
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
      if (commentStartPos >= 0) {
        commentEndPos = i
        prevTokenType = "comment"
      }
      stringNotParsed = false
    }

    if (token.endsWith('\n')) {
      prevTokenType = "hasNewLine"
      currentTokenType = null
    }

    if (prevTokenType) {
      if (prevTokenType === "comment") {
        token = text.slice(commentStartPos, commentEndPos)
        highlightedCode.push(styleCode(token, "text-gray-300")) 
        commentType = ""
        commentStartPos = commentEndPos = -1
      }else if (prevTokenType === "string") {
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

/*
if (prevTokenType === "hasNewLine") {
    highlightedCode.push(styleCode(token, "text-zinc-200"))
    lineCount++
    highlightedCode.push(styleCode(lineCount.toString(), "text-gray-300", 'false'))
  }else
*/

function CodeEditor({addNewLine, lineNo, focused} : {addNewLine: (num: number)=>void, lineNo: number, focused: boolean}) {
  const [codeContent, setCodeContent] = useState<React.ReactNode[]>([])

  useEffect(() => {
    if (focused && preElement.current) {
      preElement.current.focus()
    }
  }, [focused])
  
  const preElement = useRef<HTMLPreElement>(null)
  const currentCaretOffset = useRef(-1)
 
  function reformatInput(event) {
    let insertedText = ""
    if (event.type === "keydown") {
      if (event.key === "Enter") {
        insertedText = "\n"
      }
    }else {
      event.preventDefault();
      if (event.type === "paste") {
        insertedText = event.clipboardData.getData("text")
      }else if (event.type !== "keydown") {
        insertedText = event.data
      }
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

  function handleSpecialKeys(event) {
    if (event.key === "Backspace") {
      reformatInput(event)
    }else if (event.key === "Enter") {
      reformatInput(event)
    }
  }

  return (
    <div className="flex bg-sky-800">
     <pre contentEditable spellCheck="false" onKeyDown={handleSpecialKeys} onBeforeInput={reformatInput} onPaste={reformatInput}
     ref={preElement} className="text-white px-4 caret-amber-600 outline-none focus:bg-sky-900 flex-grow"></pre>
    </div>
  )
}


export default function Editor() {
  const [linesKeys, setLinesKeys] = useState([1])
  const freeKeys = useRef<number[]>([])
  const focusedLine = useRef(0)

  function addNewLine(num: number) {
    let newLineKeys = []
    if (freeKeys.current.length === 0) {
      let len = linesKeys.length
      newLineKeys = [...linesKeys.slice(0, num), linesKeys[len-1]+1, ...linesKeys.slice(num, linesKeys.length)]
    }else {
      newLineKeys = [...linesKeys.slice(0, num), freeKeys.current.pop() as number, ...linesKeys.slice(num, linesKeys.length)]
    }
    focusedLine.current = num+1
    setLinesKeys(newLineKeys)
  }

  function generateLinesofCode() {
    const jsxList = Array(linesKeys.length)
    for (let i=0; i < linesKeys.length; i++) {
      let isFocused = (focusedLine.current === i+1) 
      jsxList[i] = <CodeEditor key={linesKeys[i]} lineNo={i+1} addNewLine={addNewLine} focused={isFocused}/>
    }
    return jsxList;
  }

  return (
    <section>
      {generateLinesofCode()}
    </section>
  )
}
