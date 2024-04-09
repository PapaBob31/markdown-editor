"use client"

import { useEffect, useState, useRef } from "react"

const operators = ["...", "in", '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,:(){}[]\n"
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
    return styleCode(token, "text-gray-400")
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


function Number({number}:{number: string}) {
  return <div className="text-gray-400 text-right">{number}</div>
}

export default function CodeEditor() {
  const [numberOfLines, setNumberOfLines] = useState(1)
  
  const preElement = useRef<HTMLPreElement>(null)

  function reformatInput(event: React.SyntheticEvent) {
    if (!preElement.current) { // this will never happen 
      return // typescript can rest now
    }
    let newText = preElement.current.innerText as string
    let selection:any = window.getSelection()
    let range = selection.getRangeAt(0)
    range.setStart(preElement.current, 0)
    selection.addRange(range)

    /* strip all '\r' out cause Firefox adds it along with '\n' in a selection on Windows. Chrome and probably other webkit browsers 
    dont't, idk. I haven't checked. However this increases the length of the selection by 1 making caretOffset to increase by 1 too.
    This is bad cause the '\r\n' combo will be rendered as '\n' I think. This sha fixes the caretOffset bug. DON'T TOUCH!*/
    let caretOffset = selection.toString().replaceAll("\r", "").length

    /* If the enter key is pressed at any caret position in a contentEditable element, 
    chrome adds double '\n' characters at that position when you get it's innerText if it's adjacent characters are '\n' characters too,
    the code below strips such redundant '\n' characters out as they would becomne a problem later on*/
    let textAfterCaret = newText.slice(caretOffset, newText.length)
    if (textAfterCaret.length > 1 && ('\n\n\n\n\n\n\n').includes(textAfterCaret)) {
      newText = newText.slice(0, newText.length-1)
    }

    selection.collapseToEnd()
    range.collapse()
    preElement.current.innerHTML = ""
    let [htmlTextList, updatedNumber] = highlightCode(newText)
    // setNumberOfLines(updatedNumber)
    preElement.current.append(...htmlTextList)
    for (let i=0; i<caretOffset; i++) {
      selection.modify("move", "right", "character")
    }
  }


  function generateNumForLines() {
    const numbersJSX = []
    for (let i=0; i<numberOfLines; i++) {
      numbersJSX.push(<Number key={i} number={(i+1).toString()}/>)
    }
    return numbersJSX
  }

  return (
    <div className="flex bg-sky-800">
    {/*<div className="text-gray-200 px-2">{generateNumForLines()}</div>*/}
     <pre contentEditable spellCheck="false" onInput={reformatInput} ref={preElement}
      className="whitespace-pre-wrap block text-white pl-2 caret-amber-600 outline-none bg-sky-900 flex-grow">
      </pre>
    </div>
  )
}