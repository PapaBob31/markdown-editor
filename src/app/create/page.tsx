"use client"

import React, { useEffect, useState, useRef } from "react"
import { getCurrentCaretPosition, moveCaretToNewPosition } from "../utilities"

const operators = ["...", "in", "new", '~', '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = ":.;,(){}[]\n\t"
const numbers = "0123456789"
const lineComment = "//"
const multiLineCommentStart = "/*"
const multiLineCommentEnd = "*/"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>", "while"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']

/** Checks for the token category a particular character falls into
 * @params {string} char: the target character
 * @params {string} currentTokenType: the token category the previous set of [one or more] characters before it falls into
 **/
function checkTokenType(char: string, currentTokenType: string) {
  let prevTokenType = null

  if (delimiters.includes(char)) {
    if (currentTokenType !== 'delimiter') { // the characters before and the current character are of different token types
      if (char === '(' && currentTokenType === "unknown") {
        prevTokenType = "possible function call"
      }else prevTokenType = currentTokenType // indicates that the current token type have changed
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
  if (tokenType === "escape sequence") {
    return styleCode(token, "text-pink-300")
  }else if (tokenType === "block list" || tokenType === "block list 1"){
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "ordered list item") {
    return styleCode(token, "text-amber-300")
  }else if (tokenType === "markdown delimiters" ){
    return styleCode(token, "")
  }else if (tokenType === "link delimiter") {
    return styleCode(token, "text-cyan-300")
  }else if (tokenType === "link address") {
    return styleCode(token, "text-sky-600 underline")
  }else if (tokenType === "emphasis|strong") {
    return styleCode(token, "text-purple-400")
  }else if (tokenType === "tag delimiter") {
    return styleCode(token, "text-sky-200")
  }else if (tokenType === "html attr assignment") {
    return styleCode(token, "text-gray-200")
  }else if (tokenType === "tag name") {
    return styleCode(token, "text-red-400")
  }else if (tokenType === "inline code body") {
    return styleCode(token, "text-white bg-slate-600")
  }else if (tokenType === "code delimiter start" || tokenType === "code delimiter end"){
    return styleCode(token, "text-slate-400")
  }else if (tokenType === "plain text") {
    return styleCode(token, "text-white")
  }else if (tokenType === "code type" || tokenType === "attribute name") {
    return styleCode(token, "text-purple-400")
  }else if (tokenType === "comment") {
    return styleCode(token, "text-gray-300")
  }else if (tokenType === "string" || tokenType === "value") {
    return styleCode(token, "text-green-400")
  }else if ( !isNaN(token * 0) && tokenType === 'unknown' ) { // todo: improve string is number check [2\\3 won't get parsed]
    return styleCode(token, "text-orange-300")
  }else if (keywords.includes(token.trimRight())) {
    return styleCode(token, "text-purple-400")
  }else if (keywordsValues.includes(token.trimRight())) {
    return styleCode(token,"text-red-400" )
  }else if (tokenType === "operator" || operators.includes(token.trim())) {
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "delimiter") {
    return styleCode(token, "text-zinc-200")
  }else if (tokenType === "possible function call" && !(/^[\d#]/).test(token)) {
    return styleCode(token, "text-sky-500")
  }else return styleCode(token, "text-white")
}

// Checks if char parameter indicates an html block element
// Returns current token type
function getTokenTypeIfBlockElement(char: string, token: string, currTokenType: string) {
  let prevTokenType: any = currTokenType;
  let normalParsing = false;

  if (token.length === 2 && prevTokenType === 'escape sequence') {
    normalParsing = true
    return [prevTokenType, currTokenType, normalParsing]
  }else if (("-+#>=").includes(char)) {
    if (currTokenType !== 'block list') {
      currTokenType = 'block list'
    }
  }else if (("0123456789.").includes(char)) {
    if (char === '.' && !(/^\d+$/).test(token)) {
      normalParsing = true;
    }else if (char !== '.') {
      if (currTokenType !== 'ordered list item') {
        currTokenType = 'ordered list item'
      }else if ((/^\d+\.$/).test(token)) {
        normalParsing = true;
      }
    }
  }else if (char === '*') {
    if (currTokenType !== 'block list 1') {
      currTokenType = 'block list 1'
    }
  }else if (char === " " || char === "\n"){
    if (currTokenType !== 'markdown delimiters') {
      currTokenType = 'markdown delimiters'
    }
  }else {
    normalParsing = true;
  }
  prevTokenType = (prevTokenType === currTokenType) ? null : prevTokenType;

  if (char === '\\' && token !== '\\') {
    prevTokenType = currTokenType
    currTokenType = "escape sequence"
    normalParsing = false
  }else if (token === '\\') {
    if (!normalParsing) {
      prevTokenType = null
      currTokenType = "escape sequence"
    }
  }
  return [prevTokenType, currTokenType, normalParsing]
}

function getHTMLTokenType(char: string, token: string, currTokenType: string|null) {
  let prevTokenType: any = null
  let endOfTag = false;

  if (currTokenType === "tag delimiter") {
    if (token === '>' || token === '/>') {
      endOfTag = true;
      prevTokenType = currTokenType
    }else if ((/\w|\d/).test(char)) {
      if (token === '<' || token == '</') {
        prevTokenType = currTokenType
        currTokenType = "tag name"
      }
    }else if (char !== '/' || (char === '/' && token !== '<')) {
      endOfTag = true;
      currTokenType = "plain text"
    }
  }else if (currTokenType === "tag name" || currTokenType === "value") {
    if (char === ' ') {
      prevTokenType = currTokenType
      currTokenType = "attribute name"
    }
  }else if (currTokenType === "html attr assignment") {
    if (char !== '/' && char !== '>') { // currTokenType and PrevTokenType will still be modified if char is '/' or '>'
      prevTokenType = currTokenType
      currTokenType = "value"
    }
  }else if (currTokenType === "attribute name") {
    if (char === '=') {
      prevTokenType = currTokenType
      currTokenType = "html attr assignment"
    }
  }else {
    endOfTag = true
    prevTokenType = currTokenType
  }
  return [prevTokenType, currTokenType, endOfTag];
}


function getInlineElementTokenType(char: string, token: string, linkState: string | null, currTokenType: string | null, inHTML: boolean) {
  if (linkState === "closed link text" && char !== '(') {
    linkState = null
  }
  let prevTokenType = null;
  if (currTokenType === "value" && ("'\"").includes(token[0])) {
    if (token.length === 1 || (token[0] !== token[token.length-1])) {
      return [prevTokenType, currTokenType, linkState]
    }
  }

  prevTokenType = currTokenType;
  let endOfTag = true;
  
  [prevTokenType, currTokenType, endOfTag] = getHTMLTokenType(char, token, currTokenType)

  if (!inHTML && endOfTag) {
    if (char === '!' && linkState !== "opened link text") {
      if (token === '!') {
        prevTokenType = "plain text"
      }
      currTokenType = "link delimiter"
    }else if (char  === '[' && linkState !== "opened link text") {
      if (currTokenType !== "link delimiter") {
        currTokenType = "link delimiter"
      }
      linkState = "opened link text"
    }else if (char === ']' && linkState === "opened link text") {
      currTokenType = "link delimiter"
      linkState = "closed link text"
    }else if (char === '(' && linkState === "closed link text") {      
      linkState = "opened link address"
    }else if (char === "*" || char === "_") {
      if (currTokenType !== "emphasis|strong") {
        currTokenType = "emphasis|strong"
      }
    }else if (!('<\\').includes(char) && currTokenType !== "plain text") {
      currTokenType = "plain text"
    }
  }

  if (prevTokenType === currTokenType) {
    prevTokenType = null
  }

  if (endOfTag) {
    if (char === '<') { // won't highlight if followed by a '\n'. valid behaviour
      if (token === '<') {
        prevTokenType = "plain text"
      }else prevTokenType = currTokenType;
      currTokenType = "tag delimiter"
    }else if (currTokenType === "tag delimiter") {
      prevTokenType = currTokenType
      currTokenType = "plain text"
    }
  }else { // single tag entity hasn't been closed by an appropriate delimiter
    if (char === '/' && currTokenType !== "tag delimiter"){ // so it doesn't interfere with "</" types
      prevTokenType = currTokenType
      currTokenType = "attribute name"
    }else if (char === '>') {
      if (token !== '/') {
        prevTokenType = currTokenType
      }
      currTokenType = "tag delimiter"
    }
  }

  if (!inHTML) {
    if (char === '\\' && token !== '\\') {
      prevTokenType = currTokenType
      currTokenType = "escape sequence"
    }else if (token === '\\') {
      prevTokenType = null
      if (currTokenType !== "plain text") {      
        currTokenType = "escape sequence"
        linkState = null; // just in case
      }
    }
  }
  return [prevTokenType, currTokenType, linkState]
}

function getJsTokenType(char: string, token: string, currentTokenType: string | null, state: any) {
  let prevTokenType = null

  if (currentTokenType === "escape sequence" && token.length < 2) {
    return [prevTokenType, currentTokenType, state]
  }else if (currentTokenType === "escape sequence" && token.length === 2) {
    prevTokenType = currentTokenType
    currentTokenType = "string"
  }

  if (currentTokenType === "comment") {
    if (state.openedComment === "/*" && token.slice(token.length-2, token.length) === "*/") {
      state.openedComment = ""
    }else if (state.openedComment === '//' && char === '\n') {
      state.openedComment = ""
    }
  }else if (currentTokenType === "string") {
    if (token.length === 1 && !state.openedStringDelimiter) {
      state.openedStringDelimiter = token
    }else if (token[token.length - 1] === state.openedStringDelimiter) {
      if (!prevTokenType) { // so we can escape string literal marks=ers
        state.openedStringDelimiter = ""
      } 
    }

    if (char === '\\') {
      prevTokenType = currentTokenType
      currentTokenType = "escape sequence"
    }

    if (char === '\n' && (state.openedStringDelimiter === '"' || state.openedStringDelimiter === "'")) {
      state.openedStringDelimiter = ""
    }
  }

  if (!state.openedComment && !state.openedStringDelimiter) {
    if (token === '//' || token === '/*'){
      currentTokenType = "comment"
      state.openedComment = token
    }else if (char === '"' || char === "'" || char === "`") {
      prevTokenType = currentTokenType
      currentTokenType = "string"
    }else if ((char === '/' || char === '*') && token){
      if (token.length > 1 || token[0] !== '/') {
        prevTokenType = currentTokenType
      }
    }else {
      [prevTokenType, currentTokenType] = checkTokenType(char, currentTokenType as string)
    }
  } 

  if (char !== " " && token[token.length-1] === " ") {
    if (currentTokenType === "unknown") {
      prevTokenType = currentTokenType
    }
  }
  return [prevTokenType, currentTokenType, state]
}

function getCodeEndDelimiterTokenType(char: string, openedBacktick: string, token: string, currentTokenType: string) {
  let prevTokenType = null
  if (char === '`') {
    if (token[token.length - 1] !== '`') {
     prevTokenType = currentTokenType 
    }
    if (char === openedBacktick || (token + char) === openedBacktick) {
      currentTokenType = "code delimiter end"
    }
  }else if (char === '\n') {
    prevTokenType = "code type"
    currentTokenType = "delimiter"
  }
  return [prevTokenType, currentTokenType]
}

function getCodeStartDelimiterTokenType(char: string, token: string, currentTokenType: string) {
  let prevTokenType = null
  if (char !== '`') {
    prevTokenType = currentTokenType
    if (char !== '\n') {
      currentTokenType = "inline code body"
    }else if (token.length > 2) {
      currentTokenType = "delimiter"
    }else {
      prevTokenType = "plain text"
    }
  }else if (currentTokenType !== "code delimiter start") {
    prevTokenType = currentTokenType
    currentTokenType = "code delimiter start"
  }
  return [prevTokenType, currentTokenType]
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

function changeCurrentTokenType(token: string) {
  let currentTokenType = ""
  if (token[0] === "*") {
    currentTokenType = "emphasis|strong"
  }else if (token[0] === '\\'){
    currentTokenType = "escape sequence"
  }else currentTokenType = "plain text"
  return currentTokenType;
}

function getHTMLState(lastToken: string, token: string, currTokenType: string, prevTokenType: string, openedTags: string[]) {
  let inHTML: boolean = openedTags.length > 0 

  if (prevTokenType === "tag name") {
    if (lastToken === '<') {
      openedTags.push(token)
    }else if (lastToken === '</') {
      if (openedTags[openedTags.length - 1] === token.toLowerCase()) {
        openedTags.pop()
      }
    }
  }else if (token === "/>" && currTokenType === "tag delimiter") {
    openedTags.pop()
  }

  if (openedTags.length === 0) {
    inHTML = false
  }
  return inHTML
}

function highlightMarkDown(text: string, newCaretOffset: number) : any {

  // variable storing a stream of consecutive characters from text that's a specific token type
  let token = "";
  let beginningOfLine = true
  /* Array that will be used to store all the tokens found in text parameter.
  Each token would be nested in a code element that would be styled */
  let highlightedCode = [];
  let i = 0; // index for each character in text parameter
  let caretOffset = 0;
  let caretElement = null;
  let currentTokenType = null; // token type of the current token
  let prevTokenType = null; // come back to comment
  let openedBacktick = "";
  let codeHighlight = false;
  let lineNum = 1;
  let normalParsing = false;
  let linkState: string|null = null;
  let codeBlock = false;
  let openedTags: string[] = [];
  let codeBlockState: any = {openedComment: "", openedStringDelimiter: ""}

  while (i <= text.length) {
    let char = ( i < text.length ? text[i] : "");

    if (beginningOfLine && char){
      [prevTokenType, currentTokenType, normalParsing] = getTokenTypeIfBlockElement(char, token, currentTokenType as string)
    }

    if (normalParsing && char) {
      if (beginningOfLine){
        currentTokenType = changeCurrentTokenType(token);
        changePrevTokensHighlightColor(highlightedCode.length-1, highlightedCode);
        beginningOfLine = false
      }
      if (char === '`' && !codeHighlight) {
        codeHighlight = true
      }
      if (!codeHighlight && linkState !== "opened link address") {
        [prevTokenType, currentTokenType, linkState] = getInlineElementTokenType(char, token, linkState, currentTokenType, openedTags.length)
        const tokenBefore = highlightedCode.length > 0 ? highlightedCode[highlightedCode.length - 1].textContent : ""
        getHTMLState(tokenBefore, token, currentTokenType, prevTokenType, openedTags);
      }else if (linkState === "opened link address") {
        if (char == ')') {
          prevTokenType = currentTokenType
          currentTokenType = "link delimiter";
          linkState = null;
        }else if (currentTokenType !== "link address") {
          prevTokenType = currentTokenType
          currentTokenType = "link address";
        }
      }else if (codeHighlight) {
        if (codeBlock) {
          [prevTokenType, currentTokenType, codeBlockState] = getJsTokenType(char, token, currentTokenType, codeBlockState)
        }else if (currentTokenType === "inline code body") {
          [prevTokenType, currentTokenType] = getCodeEndDelimiterTokenType(char, openedBacktick, token, currentTokenType)
        }else {
          [prevTokenType, currentTokenType] = getCodeStartDelimiterTokenType(char, token, currentTokenType as any)
        }
        if (currentTokenType === "code delimiter end" || prevTokenType === "plain text") {
          codeHighlight = false
          openedBacktick = ""
        }else if (currentTokenType === "delimiter") {
          codeBlock = true
        }
      }
    }

    if (char === '\n' && i !== text.length-1) { // there's sometimes a redundant new line at the end of text param
      if (!codeHighlight && openedTags.length === 0) {
        beginningOfLine = true;
        normalParsing = false;
      }
      lineNum++
    }

    if (currentTokenType && !char) {
      prevTokenType = currentTokenType
    }

    if (prevTokenType) {
      highlightedCode.push(highlightedToken(prevTokenType, token))
      let lti = highlightedCode.length - 1 // lastTokenIndex
      if (i >= newCaretOffset && !caretElement) {
        caretElement = highlightedCode[lti]
        caretOffset = caretElement.innerText.length - (i - newCaretOffset)
      }
      token = ""
      prevTokenType = null;
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
      let [caretOffset, selectedTextLength] = getCurrentCaretPosition(event.target as HTMLElement)
      if (localValue.current === "") {
        /*I don't use innertext because different browsers implement different behaviours with innerText. For example:
        getting innerText after Enter Key press on empty contentEditable Element return '\n\n\n' in chrome but '\n\n' in firefox*/
        localValue.current = '\n\n'
      }else {
        // Again, This is done cause of different browser behaviour concerning innerText when new line is encountered
        let stl = selectedTextLength
        localValue.current = localValue.current.slice(0, caretOffset) + "\n" + localValue.current.slice(caretOffset+stl, localValue.current.length)
      }
      caretOffset++
      if (caretOffset === localValue.current.length) {
        localValue.current += "\n"
      }
      let [htmlTextList, updatedNumber, caretElement, newCaretOffset] = highlightMarkDown(localValue.current, caretOffset)
      event.target.innerHTML = ""
      event.target.append(...htmlTextList)
      setNumberOfLines(updatedNumber)
      moveCaretToNewPosition(newCaretOffset, caretElement.firstChild)
    }
  }

  function reStyleCode(event) {
    let [caretOffset, selectedTextLength] = getCurrentCaretPosition(event.target)
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
    setNumberOfLines(updatedNumber)
    moveCaretToNewPosition(newCaretOffset, caretElement.firstChild)
  }

  return (
    <section className="overflow-x-auto bg-slate-700">
      <div className="flex">
      <div className="text-gray-200 px-2 leading-tight">{generateNumForLines()}</div>
       {/*pre element's content isn't stored in state because Component's with `contentEditable` can't contain `children` managed by React*/} 
       <pre contentEditable spellCheck="false" onInput={reStyleCode} ref={preElement} onKeyDown={interceptEnterKey}
        className="block leading-tight text-white pl-2 caret-amber-600 outline-none flex-grow">
       </pre>
      </div>
      <div className="w-full h-12"></div>
    </section>
  )
}
