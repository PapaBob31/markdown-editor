"use client"

import React, { useState, useRef } from "react"
import { getCurrentCaretPosition, moveCaretToNewPosition } from "../utilities"
import { changePrevTokensHighlightColor, changeCurrentTokenType } from "./backtracker"
import experimental from "./embedded_sourcecode_tokenizer"
import highlightedToken from "./token_highlighter"
import getTokenTypeIfBlockElement from "./markdown_block_tokenizer"
import { getOpenedHTMLTagsInfo } from "./html_tokenizer"
import getInlineElementTokenType from "./markdown_inline_tokenizer"
const TAB_TO_SPACES = 2

function highlightMarkDown(text: string, newCaretOffset: number) : any {
  let token = ""; // stores a lexical token
  let beginningOfLine = true // some tokens fall into a specific category when found at the beginning of a line
  let highlightedCode = [];
  let i = 0;
  let caretOffset = 0;
  let caretElement = null;
  let currentTokenType = null; // category of the current token

  /* Used to indicate a switch in current token category. It does this by storing
    the previous token category once a new token category is found */
  let prevTokenType = null;

  let lineNum = 1;
  let normalParsing = false;
  let linkState: string|null = null;
  let openedTags: string[] = []; // stores the name of all opened tags when html is used in markdown.
  let openTagDelimiter = ""
  let codeBlockState: any = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}

  while (i <= text.length) {
    // i would be greater than text.length on last iteration of the loop
    let char = ( i < text.length ? text[i] : "");
    if (char === '\t') char = (' ').repeat(TAB_TO_SPACES);

    if (beginningOfLine && char) {
      [prevTokenType, currentTokenType, normalParsing] = getTokenTypeIfBlockElement(char, token, currentTokenType as string)
    }

    if (normalParsing) {
      if (beginningOfLine){
        if (token[0] !== ' ' && token[0] !== '\n') {
          changePrevTokensHighlightColor(highlightedCode.length-1, highlightedCode);
        }
        if (currentTokenType !== "escape sequence") {
          currentTokenType = changeCurrentTokenType(token);
        }
        beginningOfLine = false
      }

      if (linkState !== "opened link address") {
        if (linkState === "closed link text" && char !== '(') {
          linkState = null
        }
        [prevTokenType, currentTokenType, codeBlockState] = experimental(char, token, currentTokenType, codeBlockState)
        if (!codeBlockState.embeddedType && char) {
          [prevTokenType, currentTokenType, linkState] = getInlineElementTokenType(char, token, linkState, currentTokenType, openedTags.length)
          openedTags = getOpenedHTMLTagsInfo(openTagDelimiter, token, prevTokenType, openedTags);
        }
      }else if (linkState === "opened link address") { // link address token category has been found
        // every character including special characters and excluding ')' should be considered part of the category

        if (char == ')') { // link delimiter token category was just found
          prevTokenType = currentTokenType
          currentTokenType = "link delimiter";
          linkState = null;
        }else if (currentTokenType !== "link address") { // Prevents switching category from link address to link address
          prevTokenType = currentTokenType
          currentTokenType = "link address";
        }
      } 
    }

    /* The last index of text was checked cause there's sometimes a 
     redundant new line at the end of text param*/
    if (char === '\n' && i !== text.length-1) {
      if (!codeBlockState.embeddedType && openedTags.length === 0) {
        beginningOfLine = true;
        normalParsing = false;
      }
      lineNum++
    }

    if (currentTokenType && !char) { // we are done iterating through the text
      // Stores currentTokenType's content so the current token can be highlighted 
      prevTokenType = currentTokenType
    }

    if (prevTokenType) { // The start of a new token was just found.

      // highlights the token and stores the result in highlightedCode
      highlightedCode.push(highlightedToken(prevTokenType, token))

      let lti = highlightedCode.length - 1 // lastTokenIndex
      if (i >= newCaretOffset && !caretElement) {
        caretElement = highlightedCode[lti]
        caretOffset = caretElement.innerText.length - (i - newCaretOffset)
      }
      openTagDelimiter = (prevTokenType === "tag delimiter" ? token : openTagDelimiter);
      token = "" // since a new token was just found, content is no longer needed after highlighting
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

  function interceptKey(event: React.KeyboardEvent){
    let caretOffset, selectedTextLength;
    if (event.key === "Enter") {
      event.preventDefault();
      [caretOffset, selectedTextLength] = getCurrentCaretPosition(event.target as HTMLElement)
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
    }else if (event.key === "Tab") {
      event.preventDefault();
      [caretOffset, selectedTextLength] = getCurrentCaretPosition(event.target as HTMLElement)
      let stl = selectedTextLength
      localValue.current = localValue.current.slice(0, caretOffset) + (" ").repeat(TAB_TO_SPACES) + localValue.current.slice(caretOffset+stl, localValue.current.length)
      caretOffset+=TAB_TO_SPACES
    }else return;

    let [htmlTextList, updatedNumber, caretElement, newCaretOffset] = highlightMarkDown(localValue.current, caretOffset)
    event.target.innerHTML = ""
    event.target.append(...htmlTextList)
    setNumberOfLines(updatedNumber)
    moveCaretToNewPosition(newCaretOffset, caretElement.firstChild)
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
       <pre contentEditable spellCheck="false" onInput={reStyleCode} ref={preElement} onKeyDown={interceptKey}
        className="block leading-tight text-white pl-2 caret-amber-600 outline-none flex-grow">
       </pre>
      </div>
      <div className="w-full h-12"></div>
    </section>
  )
}
