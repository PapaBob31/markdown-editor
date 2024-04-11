"use client"

import { useEffect, useState, useRef } from "react"

const operators = ["...", "in", "new", '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,(){}[]\n"
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

function checkTokenStartsComment(token: string) : string {
  let commentType = '';
  if (token === lineComment) {
    commentType = lineComment
  }else if (token === multiLineComment) {
    commentType = multiLineComment
  }
  return commentType
}

function endOfComment(commentType: string, char: string, token: string) {
  if (commentType === '//' && char === '\n') {
    return true
  }else if (commentType === '/*' && token.endsWith('*/')) {
    return true
  }
  return false
}

// Checks if a character could potentially start a comment that has multiple characters as it's delimiter
function charCouldStartComment(i: number, text: string, char: string) {
  if (lineComment[0] === char || multiLineComment[0] === char) {
    if (i-1 >= 0 ) {
      let charBefore = text[i-1]
      if (!lineComment.includes(charBefore) && !multiLineComment.includes(charBefore)) {
        return true
      }
    }
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
  }else if ( !isNaN(token * 0) && prevTokenType === 'unknown' ) { // todo: improve string is number check
    return styleCode(token, "text-orange-300")
  }else if (keywords.includes(token)) {
    return styleCode(token, "text-purple-400")
  }else if (keywordsValues.includes(token)) {
    return styleCode(token, "text-red-400")
  }else if (prevTokenType === "operator" || operators.includes(token.trim())) {
    return styleCode(token, "text-amber-500")
  }else if (prevTokenType === "delimiter") {
    return styleCode(token, "text-zinc-200")
  }else return styleCode(token, "text-white")
}

function highlightCode(text: string) { // js only for now
  let token = ""
  let openedQuotesType = "" // stores the type of opened quotes (' or ") if any is encountered during the loop
  let highlightedCode = []
  let prevTokenType = null
  let currentTokenType = null
  let stringNotParsed = true
  let commentType = ""
  let lineNum = 1
  let i = 0;

  while (stringNotParsed) {
    let char = ( i < text.length ? text[i] : "")

    if (char === '\n'){
      // console.log(i, char === '\n')
      lineNum++
    } 

    if (!commentType && !openedQuotesType) {
      if (char === '"' || char === "'" || char === '`') {
        openedQuotesType = char
        prevTokenType = currentTokenType
        currentTokenType = "string"
      }else if (charCouldStartComment(i, text, char)) {
        prevTokenType = currentTokenType
      }else {
        commentType = checkTokenStartsComment(token)
        if (commentType) {
          currentTokenType = 'comment'
        }
      }
      if (char && !commentType && !openedQuotesType){
        [prevTokenType, currentTokenType] = checkTokenType(char, currentTokenType)
      }
    }else if (commentType) {
      if (endOfComment(commentType, char, token)) {
        prevTokenType = currentTokenType
      }
    }else if (char && (openedQuotesType === char || char === '\n')) {
      openedQuotesType = ''
      currentTokenType = "string"
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
        if (token.trimStart()[0] === '(') {
          let lastIndex = highlightedCode.length - 1
          if (highlightedCode.length && highlightedCode[lastIndex].classList.contains("text-white")) {
            highlightedCode[lastIndex].classList.replace("text-white", "text-sky-400")
          }
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


function getCurrentCaretPosition(focusedElement) {
  let selection = window.getSelection()
  let range = selection.getRangeAt(0)
  range.setStart(focusedElement, 0)
  selection.addRange(range)
  let caretOffset = selection.toString().replaceAll("\r","").length
  selection.collapseToEnd()
  range.collapse()
  return caretOffset
}

function generateStyledHTML(text: string, parentElement, caretOffset: number) {
  let selection = window.getSelection()
  let [htmlTextList, updatedNumber] = highlightCode(text)
  parentElement.innerHTML = ""
  parentElement.append(...htmlTextList)
  for (let i=0; i<caretOffset; i++) {
    selection.modify("move", "right", "character")
  }
  return updatedNumber
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
      let caretOffset = getCurrentCaretPosition(event.target)
      if (localValue.current === "") {
        localValue.current = '\n\n'
      }else {
        localValue.current = localValue.current.slice(0, caretOffset) + "\n" + localValue.current.slice(caretOffset, localValue.current.length)
      }
      caretOffset++
      if (caretOffset === localValue.current.length) {
        localValue.current += "\n"
      }
      let newText = localValue.current
      let number = generateStyledHTML(newText,  preElement.current, caretOffset)
      setNumberOfLines(number-1)
    }
  }

  function reStyleCode(event) {
    let caretOffset = getCurrentCaretPosition(event.target)
    let inputLen = event.target.innerText.length
    if (event.target.innerText[inputLen-1] === "\n") {
      localValue.current = event.target.innerText.slice(0, inputLen)
    }else {
      localValue.current = event.target.innerText
    }
    let number = generateStyledHTML(localValue.current, preElement.current, caretOffset)
    setNumberOfLines(number-1)
  }

  return (
    <div className="flex bg-sky-800">
    <div className="text-gray-200 px-2">{generateNumForLines()}</div>
     <pre contentEditable spellCheck="false" onInput={reStyleCode} ref={preElement} onKeyDown={interceptEnterKey}
      className="whitespace-pre-wrap block text-white pl-2 caret-amber-600 outline-none bg-sky-900 flex-grow">
      </pre>
    </div>
  )
}