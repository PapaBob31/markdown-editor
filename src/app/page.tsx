"use client"

import React, { useEffect, useState, useRef } from "react"

const operators = ["...", "in", "new", '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,(){}[]\n\t"
const numbers = "0123456789"
const lineComment = "//"
const multiLineComment = "/*"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>", "while"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']

// TODO:
// searh for all keywords and operators
// HTML, CSS
// escape chars e.g \t, \n, template literals

function checkForComment(text: string, index: number) {
  if (text.startsWith(lineComment, index)) {
    return lineComment
  }else if (text.startsWith(multiLineComment, index))  {
    return multiLineComment
  }
  return ""
}

function endOfComment(commentType: string, char: string, token: string) {
  if (commentType === '//' && char === '\n') {
    return true
  }else if (commentType === '/*' && token.endsWith('*/')) {
    return true
  }
  return false
}

function checkTokenType(char: string, currentTokenType: string) {
  let prevTokenType = null

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
  return [prevTokenType, currentTokenType]
}

function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.innerText = token
  codeElement.className = classStr
  return codeElement;
}


function highlightedToken(prevTokenType:string, token:string) {
  if (prevTokenType === "comment") {
    return styleCode(token, "text-gray-300")
  }else if (prevTokenType === "string") {
    return styleCode(token, "text-green-300")
  }else if (prevTokenType === "escapeChar") {
    return styleCode(token, "text-purple-300")
  }else if ( !isNaN(token * 0) && prevTokenType === 'unknown' ) { // todo: improve string is number check [2\\3 won't get parsed]
    return styleCode(token, "text-orange-300")
  }else if (keywords.includes(token)) {
    return styleCode(token, "text-purple-400")
  }else if (keywordsValues.includes(token)) {
    return styleCode(token,"text-red-400" )
  }else if (prevTokenType === "operator" || operators.includes(token.trim())) {
    return styleCode(token, "text-amber-500")
  }else if (prevTokenType === "delimiter") {
    return styleCode(token, "text-zinc-200")
  }else return styleCode(token, "text-white")
}

function highlightCode(text: string) : [HTMLElement[], number] { // js only for now
  let token = ""
  let openedQuotesType = "" // stores the type of opened quotes (' or ") if any is encountered during the loop
  let highlightedCode: HTMLElement[] = []
  let prevTokenType = null
  let currentTokenType = null
  let stringNotParsed = true
  let commentType = ""
  let lineNum = 1
  let i = 0;
  let escChar = false

  while (stringNotParsed) {
    let char = ( i < text.length ? text[i] : "")

    if (char === '\n'){
      lineNum++
    }

    if (!openedQuotesType && !commentType) {
      if(char === '"' || char === "'" || char === "`") {
        openedQuotesType = char
        prevTokenType = currentTokenType
        currentTokenType = "string"
      }else {
        commentType = checkForComment(text, i)
        if (commentType) {
          prevTokenType = currentTokenType
          currentTokenType = "comment"
        }
      }
      if (!commentType && !openedQuotesType) {
        if (char){
          [prevTokenType, currentTokenType] = checkTokenType(char, currentTokenType as string)
        }
      }
    }else if (openedQuotesType) {
      if (!escChar && openedQuotesType === char) {
        openedQuotesType = ''
      }
      if (escChar && token.length === 2) {
        prevTokenType = currentTokenType
        currentTokenType = "string"
        escChar = false
      }else if (char === '\\') {
        currentTokenType = "escapeChar"
        escChar = true
      }
    }else if (endOfComment(commentType, char, token)) {
      prevTokenType = currentTokenType
      currentTokenType = null
    }
    
    if (i === text.length) { // last iteration
      if (currentTokenType) {
        prevTokenType = currentTokenType
      }
      stringNotParsed = false
    }
    
    if (prevTokenType) {
      if (prevTokenType === "comment") {
        highlightedCode.push(highlightedToken(prevTokenType, token))
        commentType = ""
      }else if (prevTokenType === "delimiter") {
        let lti = highlightedCode.length - 1 // lastTokenIndex
        if (token.trimStart()[0] === "(" && highlightedCode[lti].classList.contains("text-white")) {
          highlightedCode[lti].classList.replace("text-white", "text-sky-400")
        }
        highlightedCode.push(highlightedToken(prevTokenType, token))
      }else highlightedCode.push(highlightedToken(prevTokenType, token))
      prevTokenType = null
      token = ""
    }
    token += char
    i++
  }
  return [highlightedCode, lineNum]
}


function getCurrentCaretPosition(focusedElement: HTMLElement) {
  let selection = window.getSelection() as any
  let range = selection.getRangeAt(0)
  range.setStart(focusedElement, 0)
  selection.addRange(range)
  let caretOffset = selection.toString().replaceAll("\r","").length
  selection.collapseToEnd()
  range.collapse()
  return caretOffset
}

function moveCaretToNewPosition(newCaretOffset: number) {
  let selection = window.getSelection()
  if (!selection) {
    return 
  }
  for (let i=0; i<newCaretOffset; i++) {
    selection.modify("move", "right", "character")
  }
}

function Number({number}:{number: string}) {
  return <div className="text-gray-400 text-right">{number}</div>
}

export default function CodeEditor() {
  const [numberOfLines, setNumberOfLines] = useState(1)
  const localValue = useRef("")
  const preElement = useRef<HTMLPreElement>(null)

  function generateNumForLines() {
    const numbersJSX = []
    for (let i=0; i<numberOfLines; i++) {
      numbersJSX.push(<Number key={i} number={(i+1).toString()}/>)
    }
    return numbersJSX
  }

  function interceptEnterKey(event: React.KeyboardEvent){
    if (event.key === "Enter") {
      event.preventDefault()
      let caretOffset = getCurrentCaretPosition(event.target as HTMLElement)
      if (localValue.current === "") {
        /*I don't use innertext because different browsers implement different behaviours with innerText. 
        getting innerText after Enter Key press on empty contentEditable Element return '\n\n\n' in chrome but '\n\n' in firefox*/
        localValue.current = '\n\n'
      }else {
        // Again, This is done cause of different browser behaviour concerning innerText when new line is encountered
        localValue.current = localValue.current.slice(0, caretOffset) + "\n" + localValue.current.slice(caretOffset, localValue.current.length)
      }
      caretOffset++
      if (caretOffset === localValue.current.length) {
        localValue.current += "\n"
      }
      let [htmlTextList, updatedNumber] = highlightCode(localValue.current)
      event.target.innerHTML = ""
      event.target.append(...htmlTextList)
      setNumberOfLines(updatedNumber-1)
      moveCaretToNewPosition(caretOffset)
    }
  }

  function reStyleCode(event) {
    let caretOffset = getCurrentCaretPosition(event.target)
    let inputLen = event.target.innerText.length
    if (event.target.innerText[inputLen-1] === "\n") {
      // some browsers [chrome] append unneeded newline char to their innerText attribute.
      // This leads to the display of a newline that wasn't there before reformating
      localValue.current = event.target.innerText.slice(0, inputLen)
    }else {
      localValue.current = event.target.innerText
    }
    let [htmlTextList, updatedNumber] = highlightCode(localValue.current)
    event.target.innerHTML = ""
    event.target.append(...htmlTextList)
    setNumberOfLines(updatedNumber-1)
    moveCaretToNewPosition(caretOffset)
  }

  return (
    <div className="flex bg-sky-800">
    <div className="text-gray-200 px-2">{generateNumForLines()}</div>
     {/*pre element's content isn't stored in state because Component's with `contentEditable` can't contain `children` managed by React*/} 
     <pre contentEditable spellCheck="false" onInput={reStyleCode} ref={preElement} onKeyDown={interceptEnterKey}
      className="whitespace-pre-wrap block text-white pl-2 caret-amber-600 outline-none bg-sky-900 flex-grow">
     </pre>
    </div>
  )
}