"use client"

import React, { useEffect, useState, useRef } from "react"
import { getCurrentCaretPosition, moveCaretToNewPosition } from "../utilities"

const operators = ["...", "in", "new", '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " :.;,(){}[]\n\t"
const numbers = "0123456789"
const lineComment = "//"
const multiLineCommentStart = "/*"
const multiLineCommentEnd = "*/"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>", "while"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']

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

// Creates a CODE HTML Element and applies the classStr parameter as a class name for styling
function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.append(document.createTextNode(token)) // might break;
  codeElement.className = classStr
  return codeElement;
}

// Generates a CODE HTML Element with a unique styling for a specific token type
function highlightedToken(tokenType:string, token:string) {
  console.log(tokenType, 78)
  if (tokenType === "block list" || tokenType === "block list 1"){
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "ordered list item" && (/^\d+\b\.$/).test(token)) {
    return styleCode(token, "text-amber-300")
  }else if (tokenType === "markdown delimiters" ){
    return styleCode(token, "")
  }else if (tokenType === "link delimiter") {
    return styleCode(token, "text-cyan-300")
  }else if (tokenType === "link address") {
    return styleCode(token, "text-sky-600 underline")
  }else if (tokenType === "emphasis|strong") {
    return styleCode(token, "text-purple-400")
  }else if (tokenType === "inline code body") {
    return styleCode(token, "text-white bg-slate-600")
  }else if (tokenType === "code delimiter"){
    return styleCode(token, "text-slate-400")
  }else if (tokenType === "plain text" || tokenType === "escaped char") {
    return styleCode(token, "text-white")
  }else if (tokenType === "code type") {
    return styleCode(token, "text-purple-300")
  }else if (tokenType === "comment") {
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


function getBlockElementType(char: string, currTokenType: string) {
  if (("-+#>=").includes(char)) {
    if (currTokenType !== 'block list') {
      return 'block list'
    }
  }else if (("0123456789.").includes(char)){
     if (currTokenType !== 'ordered list item') {
      return 'ordered list item'
    }
  }else if (char === '*') {
    if (currTokenType !== 'block list 1') {
      return 'block list 1'
    }
  }else if (char === " " || char === "\n"){
    if (currTokenType !== 'markdown delimiters') {
      return 'markdown delimiters'
    }
  }else {
    return null
  }
  return currTokenType
}

function getInlineElementTokenType(char: string, nextChar: string, linkState: string | null, currTokenType: string | null) {
  let prevTokenType = null;
  if (char === '!' && nextChar === '[' && linkState !== "opened link text") {
    prevTokenType = currTokenType
    currTokenType = "link delimiter"
  }else if (char  === '[' && linkState !== "opened link text") {
    if (currTokenType !== "link delimiter") {
      prevTokenType = currTokenType
      currTokenType = "link delimiter"
    }
    linkState = "opened link text"
  }else if (char === ']' && linkState === "opened link text") {
    prevTokenType = currTokenType
    currTokenType = "link delimiter"
    linkState = "closed link text"
  }else if (char === '(' && linkState === "closed link text") {
    prevTokenType = currTokenType
    currTokenType = "link delimiter"
    linkState = "opened link address"
  }else if (char === "*" || char === "_") {
    if (currTokenType !== "emphasis|strong") {
      prevTokenType = currTokenType
      currTokenType = "emphasis|strong"
    }
  }else if (char === '\\') {
    prevTokenType = currTokenType
    currTokenType = "escape sequence"
  }else if (currTokenType !== "plain text") {
    prevTokenType = currTokenType
    currTokenType = "plain text"
  }
  return [prevTokenType, currTokenType, linkState]
}

function getPythonTokenType() {

}

function getJsTokenType(char: string, token: string, currentTokenType: string | null) {
  let prevTokenType = null
  let parseOthers = true
  if (currentTokenType === "comment") {
    parseOthers = false
    if (token.slice(0, 2) === "/*" && token.slice(token.length-2, token.length) === "*/") {
      parseOthers = true
    }else if (token.slice(0, 2) === '//' && char === '\n') {
      parseOthers = true
    }
  }else {
    if (token[0] === '"' || token[0] === "'" || token[0] === "`") {
      parseOthers = false
      if (token.length > 1 && token[0] === token[token.length-1]){
        parseOthers = true      }
    }

    if (char === '\n' && (token[0] === '"' || token[0] === "'")) {
      parseOthers = true
    }
  }

  if (currentTokenType !== "comment" && currentTokenType !== "string") {
    if (token === '//' || token === '/*'){
      currentTokenType = "comment"
      parseOthers = false
    }else if (char === '"' || char === "'" || char === "`") {
      prevTokenType = currentTokenType
      currentTokenType = "string"
      parseOthers = false
    }else if ((char === '/' || char === '*') && token){
      if (token.length > 1 || token[0] !== '/') {
        prevTokenType = currentTokenType
      }
    }
  }
  if (parseOthers && char) {
    [prevTokenType, currentTokenType] = checkTokenType(char, currentTokenType as string)
  }
  return [prevTokenType, currentTokenType]
}

function getHtmlTokenType() {

}

function getCssTokenType() {

}

function getClangTokenType() {

}
    

// TODO:
// search for all keywords and operators
// HTML, CSS
// Tab key press as well as tab representation
// new line on highlighted text


function getCodeBlockBodyToken(char: string, currTokenType: string, openedBacktick: string) {
  let prevTokenType = null
  if (currTokenType !== "inline code body") {
    prevTokenType = currTokenType
    currTokenType = "inline code body"
  }else if (char === '\n') {
    if (openedBacktick === '`') {
      prevTokenType = currTokenType
      currTokenType = "plain text"
    }else {
      prevTokenType = "code type"
      currTokenType = "delimiter"
    }
  }
  return [prevTokenType, currTokenType]
}

function changePrevTokensHighlightColor(index: number, highlightedCode: HTMLElement[]) {
  while (index >= 0) {
    if ((" \n").includes((highlightedCode[index].textContent as string)[0])) {
      break;
    }
    if ((highlightedCode[index].textContent as string)[0] === "*") {
      highlightedCode[index].className = "text-purple-400"
    }else {
      highlightedCode[index].className = "text-white"
    }
    index--;
  }
}


function highlightMarkDown(text: string, newCaretOffset: number) : any {
  let token = "";
  let beginningOfLine = true
  let stringNotProcessed = true
  let highlightedCode = [];
  let i = 0;
  let caretOffset = 0;
  let caretElement = null;
  let currentTokenType = null;
  let prevTokenType = null;
  let openedBacktick = "";
  let codeHighlight = false;
  let lineNum = 1;
  let openedQuotesType = "" // stores the type of opened quotes (' or ") if any is encountered during the loop
  let commentType = ""
  let normalParsing = false;
  let linkState: string|null = null;
  let codeBlock = false;
  let codeBlockDelimiter: string|null = "";

  while (stringNotProcessed) {
    let char = ( i < text.length ? text[i] : "")

    let previousChar = i-1 >= 0 ? text[i-1] : "";

    if (beginningOfLine && char && !codeHighlight) {
      prevTokenType = currentTokenType
      currentTokenType = getBlockElementType(char, currentTokenType as string)
      if (!currentTokenType) {
        normalParsing = true
        currentTokenType = prevTokenType
        prevTokenType = null
      }

      if (currentTokenType === prevTokenType) {
        prevTokenType = null
      }
    }

    if (normalParsing && char) {
      if (!codeHighlight && linkState !== "opened link address") {
        if (linkState === "closed link text" && char !== '(') {
          linkState = null
        }
        // token length will always be less than 2 if currenTokenType = "escape sequence"
        if (currentTokenType !== "escape sequence" || token.length == 2) {
          if (char === '`') {
            prevTokenType = currentTokenType
            currentTokenType = "code delimiter"
            codeHighlight = true;
          }else {
            let nextChar = i+1<text.length ? text[i+1] : "";
            [prevTokenType, currentTokenType, linkState] = getInlineElementTokenType(char, nextChar, linkState, currentTokenType)
          }
        }  
      }else if (linkState === "opened link address") {
        if (token === "(") {
          prevTokenType = currentTokenType
          currentTokenType = "link address";
        }else if (char == ')') {
          prevTokenType = currentTokenType
          currentTokenType = "link delimiter";
          linkState = null;
        }
      }else if (codeHighlight && char) {
        if (codeBlock) {
          if (char === '\n') {
            codeBlockDelimiter = ''
          }else if (char === '`' && codeBlockDelimiter !== null) {
            if (token + char === openedBacktick) {
              currentTokenType = "code delimiter"
              codeBlock = false
              codeHighlight = false
              openedBacktick = ""
            }
          }else codeBlockDelimiter = null;
          if (codeBlock) {
            [prevTokenType, currentTokenType] = getJsTokenType(char, token, currentTokenType)
          } 
        }else if (char === '`') {
          if (currentTokenType === "inline code body") {
            if (previousChar !== '`'){
             prevTokenType = currentTokenType 
            } 
            if (char === openedBacktick || (token + char) === openedBacktick) { // at most 3 (```)
              currentTokenType = "code delimiter"
              codeHighlight = false
              openedBacktick = ""
            }
          }
        }else{
          if (char === '\n') {
            if (openedBacktick.length >= 2) {
              if (currentTokenType === "inline code body" && token[0] !== '`') {
                // only marks text like "```lang-name" as code type
                currentTokenType = "code type"
                codeBlock = true
              }else {
                // doesn't mark text like "```lang-name``" as code type
                prevTokenType = currentTokenType
                currentTokenType = "plain text"
                codeHighlight = false
              }
            }else {
              prevTokenType = currentTokenType
              currentTokenType = "plain text"
              codeHighlight = false
            }
          }else if (currentTokenType !== "inline code body"){
            prevTokenType = currentTokenType
            currentTokenType = "inline code body"
            openedBacktick = token
          }
        }
      }
    }

    if (char === '\n' && i !== text.length-1){ // there's sometimes a redundant new line at the end of text param
      if (!codeBlock) {
        beginningOfLine = true;
        normalParsing = false;
      }
      lineNum++
    }

    if (i === text.length) { // last iteration
      if (currentTokenType) {
        prevTokenType = currentTokenType
      }
      stringNotProcessed = false;
    }

    if (prevTokenType) {
      let lti = highlightedCode.length - 1 // lastTokenIndex

      if (prevTokenType === "delimiter") {
        // potential bug?
        if (token.trimStart()[0] === "(" && highlightedCode[lti].classList.contains("text-white")) { 
          highlightedCode[lti].classList.replace("text-white", "text-sky-500")
        }
      }else if (prevTokenType === "ordered list item" && !(/^\d+\b\.$/).test(token)) {
        prevTokenType = "unknown"
        normalParsing = true;
      }
      highlightedCode.push(highlightedToken(prevTokenType, token))

      if (normalParsing && beginningOfLine) {
        changePrevTokensHighlightColor(lti+1, highlightedCode)  
      }
      if (i >= newCaretOffset && !caretElement) {
        caretElement = highlightedCode[lti+1]
        caretOffset = caretElement.innerText.length - (i - newCaretOffset)
      }
      token = ""
      prevTokenType = null;
    }
    if (normalParsing && beginningOfLine) {
      beginningOfLine = false;
    }
    token += char 
    i++
  }
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
    <section className="overflow-x-auto bg-slate-700">
      <div className="flex">
      {/*<div className="text-gray-200 px-2 leading-tight">{generateNumForLines()}</div>*/}
       {/*pre element's content isn't stored in state because Component's with `contentEditable` can't contain `children` managed by React*/} 
       <pre contentEditable spellCheck="false" onInput={reStyleCode} ref={preElement} onKeyDown={interceptEnterKey}
        className="block leading-tight text-white pl-2 caret-amber-600 outline-none flex-grow">
       </pre>
      </div>
      <div className="w-full h-12"></div>
    </section>
  )
}
