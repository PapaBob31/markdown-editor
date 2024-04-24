"use client"

import React, { useEffect, useState, useRef } from "react"
import { getCurrentCaretPosition, moveCaretToNewPosition } from "../utilities"

const operators = ["...", "in", "new", '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,(){}[]\n\t"
const numbers = "0123456789"
const lineComment = "//"
const multiLineCommentStart = "/*"
const multiLineCommentEnd = "*/"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>", "while"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']

// TODO:
// search for all keywords and operators
// HTML, CSS
// Tab key press as well as tab representation

// checks if a String has a comment starting at a given index in the string
function checkForComment(text: string, index: number) {
  if (text.startsWith(lineComment, index)) {
    return lineComment
  }else if (text.startsWith(multiLineCommentStart, index))  {
    return multiLineCommentStart
  }
  return ""
}

/** checks for the end of a comment
 * @params {string} commentType: The type of comment e.g single line or multi-line
 * @params {string} char: Current Character that's about to marked as part of the comment
 * @params {string} token: The current comment body we have encountered so far.
 */
function endOfComment(commentType: string, char: string, token: string) {
  if (commentType === lineComment && char === '\n') {
    return true
  }else if (commentType === multiLineCommentStart && token.endsWith(multiLineCommentEnd)) { // optimise endsWith?
    return true
  }
  return false
}


/** Checks for the token category a particular character falls into
 * @params {string} char: the target character
 * @params {string} currentTokenType: the token category the previous set of [one or more] characters before it falls into
 **/
function checkTokenType(char: string, currentTokenType: string) {
  let prevTokenType = null

  if (delimiters.includes(char)) {
    if (currentTokenType !== 'delimiter') { // the characters before and the current character are of different token types
      prevTokenType = currentTokenType // indicates that the current token type have changed
      currentTokenType = 'delimiter'
    }
  }else if (operators.includes(char)) {
    if (currentTokenType !== 'operator') { // the characters before and the current character are of different token types
      prevTokenType = currentTokenType // indicates that the current token type have changed
      currentTokenType = 'operator'
    }
  }else if (currentTokenType !== 'unknown') { // the characters before and the current character are of different token types
    prevTokenType = currentTokenType // indicates that the current token type have changed
    currentTokenType = 'unknown' // We can't detect the token type yet
  }
  return [prevTokenType, currentTokenType]
}

// Creates a CODE HTML Element and applies the classStr paarmeter as a class name for styling
function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.append(document.createTextNode(token)) // might break;
  codeElement.className = classStr
  return codeElement;
}

// Generates a CODE HTML Element with a unique styling for a specific token type
function highlightedToken(tokenType:string, token:string) {
  if (tokenType === "comment") {
    return styleCode(token, "text-gray-300")
  }else if (tokenType === "string") {
    return styleCode(token, "text-green-300")
  }else if ( !isNaN(token * 0) && tokenType === 'unknown' ) { // todo: improve string is number check [2\\3 won't get parsed]
    return styleCode(token, "text-orange-300")
  }else if (keywords.includes(token)) {
    return styleCode(token, "text-purple-400")
  }else if (keywordsValues.includes(token)) {
    return styleCode(token,"text-red-400" )
  }else if (tokenType === "operator" || operators.includes(token.trim())) {
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "delimiter") {
    return styleCode(token, "text-zinc-200")
  }else return styleCode(token, "text-white")
}

function highlightCode(text: string, newCaretOffset: number) : any { // js only for now. Needs serious optimization
  let token = ""
  let openedQuotesType = "" // stores the type of opened quotes (' or ") if any is encountered during the loop
  let highlightedCode: HTMLElement[] = []
  let prevTokenType = null
  let currentTokenType = null
  let stringNotParsed = true
  let commentType = ""
  let lineNum = 1
  let i = 0;
  let caretOffset = 0
  let caretElement = null

  while (stringNotParsed) {
    let char = ( i < text.length ? text[i] : "")

    if (char === '\n' && i !== text.length-1){ // there's usually a redundant new line at the end of text param
      lineNum++
    }

    if (endOfComment(commentType, char, token)) {
      prevTokenType = currentTokenType
      commentType = ""
    }else {
      if (token.length > 1 && openedQuotesType === token[token.length-1]){
        openedQuotesType = ''
        prevTokenType = currentTokenType
      }

      if (char === '\n' && (openedQuotesType === '"' || openedQuotesType === "'")) {
        openedQuotesType = ''
        prevTokenType = currentTokenType
      }
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
    }
    
    if (i === text.length) { // last iteration
      if (currentTokenType) {
        prevTokenType = currentTokenType
      }
      stringNotParsed = false
    }
    
    if (prevTokenType) {
      let lti = highlightedCode.length - 1 // lastTokenIndex
      if (prevTokenType === "comment") {
        highlightedCode.push(highlightedToken(prevTokenType, token))
      }else if (prevTokenType === "delimiter") {
        if (token.trimStart()[0] === "(" && highlightedCode[lti].classList.contains("text-white")) {
          highlightedCode[lti].classList.replace("text-white", "text-sky-500")
        }
        highlightedCode.push(highlightedToken(prevTokenType, token))
      }else highlightedCode.push(highlightedToken(prevTokenType, token))
      if (i >= newCaretOffset && !caretElement) {
        caretElement = highlightedCode[lti+1]
        caretOffset = caretElement.innerText.length - (i - newCaretOffset)
      }
      prevTokenType = null
      token = ""
    }
    token += char
    i++
  }
  return [highlightedCode, lineNum, caretElement, caretOffset]
}

// TODO 1. syntax for ordered list
// fix caret is null error
function highlightMarkDown(text: string, newCaretOffset: number) : any {
  let token = "";
  let currentTokenType = "";
  let prevTokenType = "";
  let beginningOfLine = true
  let stringNotProcessed = true
  let highlightedCode = [];
  let openedBrackets = false;
  let openedLinkText = false;
  let openedCodeDelimiter = false;
  let i = 0;
  let caretOffset = 0;
  let caretElement = null;
  const tokenArray: string[] = [];
  let newToken = false
  let blockBodiesStart = []


/*
```heuheuh```
<tag>neuheuh</tag>
[link text](link)
**emphasis/strong**
_strong_
\ escape them all
\\ escape itself

*/

/* GENERAL PARSING ALGO NOW. EXPLOIT THE PATTERN

? WHAT IF THEY DON'T CLOSE THEIR TAGS, NONE OF MY GODDAMN BUSINESS
 - SIMPLICITY IS KEY

- WHAT CAN'T YOU NEST?
  - SQUARE BRACKETS INSIDE SQUARE BRACKETS
  - ANY TAG INSIDE CODE BLOCKS NOT EVEN CODE BLOCKS
  - TAGS CAN'T BE NESTED INSIDE LINK ADDRESS

- SOME RULES
  - '\n' COULD BE A DELIMITER DEPENDING ON THE SITUATION
  - '(' MUST BE PRECEEDED BY A '[' BEFORE IT GETS HIHLIGHTED
  - \ IS A SPECIAL CHARACTER
  - SPACE CHARACTER IS ALSO A DELIMITER ONLY AT THE BEGINING OF A LINE
 
- CODE ELEMENT
  - DO NORMAL FOR INLINE CODE
  - MULTILINE SHOULD CAUSE A BRANCH IN THE ALGORITHM INTO CODE HIGHLIGHTING FUNCTION
    - RETURN CARETOFFSET AND CARETELEMENT IF POSSIBLE


*/



  while (stringNotProcessed) {
    let char = ( i < text.length ? text[i] : "")

    if (beginningOfLine && char) {
      if (("-+*#>=").includes(char)) {
        if (currentTokenType !== "block elements") {
          currentTokenType = "block elements";
          newToken = true;
        }
      }else if (char === " " || char === "\n") {
        if (currentTokenType !== "beginning of line delimiters") {
          currentTokenType = "beginning of line delimiters"
          newToken = true;
        }
      }else if (char !== "\n") {
        beginningOfLine = false;
        blockBodiesStart.push(token)
      }
    }

    let previousChar = i-1 > 0 ? text[i-1] : "";

    if (previousChar !== '\\' ) {
      if (char === '[') {
        if (!openedBrackets) {
          if (previousChar === "!") {
            token = token.slice(0, token.length-1)
            char = '!['
          }
          newToken = true;
        }
      }else if (char === ']' && openedBrackets) {
        newToken = true;
        openedBrackets = false;
      }else if (char === "(" && token === '[') {
        newToken = true;
        currentTokenType = "link address"
      }else if (char === ')' && currentTokenType === "link address") {
        newToken = true;
      }else if (char === "*" || char === "_") {
        if (!("*_").includes(previousChar)) {
          newToken = true;
        }
      }else if (currentTokenType != "text") {
        newToken = true;
        currentTokenType = "text"
      }
    }

    if (char === '\n' && i !== text.length-1 && !openedLinkText) {
      beginningOfLine = true
    }

    if (i === text.length) { // last iteration
      newToken = true;
      stringNotProcessed = false;
    }

    if (newToken && token) {
      tokenArray.push(token)
      newToken = false;
      token = ""
    }
    token += char 
    i++
  }
  let newLine = true;
  let cummulativeStrLen = 0;


// don't know how to check the  end of beginning of a line
  for (let i=0; i<tokenArray.length; i++) {
    if (newLine) {
      if (tokenArray[i] === blockBodiesStart.shift()) {
        newLine = false;
      }
      if ((/^\d+\b\.$/).test(tokenArray[i])) {
        highlightedCode.push(styleCode(tokenArray[i], "text-amber-300"))
      }else {
        highlightedCode.push(styleCode(tokenArray[i], "text-amber-500"))
      }
    }else {
      if (tokenArray[i] === '![' || tokenArray[i] === "[" || tokenArray[i] === "(" || tokenArray[i] === ")") {
        highlightedCode.push(styleCode(tokenArray[i], "text-cyan-400"))
      }else if (tokenArray[i].includes("*") || tokenArray[i].includes("_")) {
        highlightedCode.push(styleCode(tokenArray[i], "text-purple-400"))
      }else if (i-1 >= 0 && tokenArray[i-1] === "(") {
        highlightedCode.push(styleCode(tokenArray[i], "text-sky-500 underline"))
      }else {
        highlightedCode.push(styleCode(tokenArray[i], "text-white"))
      }
    }
    let lti = highlightedCode.length-1
    cummulativeStrLen += tokenArray[i].length
    if (cummulativeStrLen >= newCaretOffset && !caretElement) {
      caretElement = highlightedCode[lti]
      caretOffset = caretElement.innerText.length - (cummulativeStrLen - newCaretOffset)
    }
  }
  let lineNum = 1
  return [highlightedCode, lineNum, caretElement, caretOffset]
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
        /*I don't use innertext because different browsers implement different behaviours with innerText. For example:
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
      let [htmlTextList, updatedNumber, caretElement, newCaretOffset] = highlightMarkDown(localValue.current, caretOffset)
      event.target.innerHTML = ""
      event.target.append(...htmlTextList)
      // setNumberOfLines(updatedNumber)
      moveCaretToNewPosition(newCaretOffset, caretElement.firstChild)
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
    let [htmlTextList, updatedNumber, caretElement, newCaretOffset] = highlightMarkDown(localValue.current, caretOffset)
    event.target.innerHTML = ""
    event.target.append(...htmlTextList)
    // setNumberOfLines(updatedNumber)
    moveCaretToNewPosition(newCaretOffset, caretElement.firstChild)
  }

  return (
    <div className="flex bg-slate-700">
    {/*<div className="text-gray-200 px-2 leading-tight">{generateNumForLines()}</div>*/}
     {/*pre element's content isn't stored in state because Component's with `contentEditable` can't contain `children` managed by React*/} 
     <pre contentEditable spellCheck="false" onInput={reStyleCode} ref={preElement} onKeyDown={interceptEnterKey}
      className="block leading-tight text-white pl-2 caret-amber-600 outline-none flex-grow">
     </pre>
    </div>
  )
}
