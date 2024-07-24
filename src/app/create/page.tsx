"use client"

import React, { useState, useRef } from "react"
import { getCurrentCaretPosition, moveCaretToNewPosition } from "../utilities"
import changeInvalidHighlightColor from "./backtracker"
import getCodeBlockTokenTypes from "./embedded_sourcecode_tokenizer"
import highlightedToken from "./token_highlighter"
import getTokenTypeIfBlockElement from "./markdown_block_tokenizer"
import { getOpenedHTMLTagsInfo } from "./html_tokenizer"
import getInlineElementTokenType from "./markdown_inline_tokenizer"
const TAB_TO_SPACES = 2

/* TODO: 
- Add horizontal rule support
- Add link title support

/** Tokenizes a markdown text stream and returns an array containing A nested array of highlighted tokens, number
 * of lines in the text stream and 2 other useful items related to the caret offset
 * NOTE: An highlighted token is an html CODE element containing a token and it's styled depending on the token it contains
 * @param text: the markdown text stream to be highlighted
 * @param newCaretOffset: the caret offset relative to the text stream
 **/
function highlightMarkDown(text: string, newCaretOffset: number) : any[] {
  let token = ""; // stores a lexical token
  let beginningOfLine = true
  let highlightedCode: HTMLElement[] = []; // stores each highlighted token in the order it was found in the text strem
  let i = 0;
  let caretElement = null; // highlighted token containing the specific character before the caret offset
  let caretOffset = 0; // caret offset relative to the content of caretElement
  let currentTokenType = null; // category of the current token
  let prevTokenType = null; // previous token category when a new token category is encountered
  let lineNum = 1; // number of lines in the text stream
  let normalParsing = false;
  let linkState: string|null = null;
  let openedTags: string[] = []; // stores the name of all opened tags when html is used in markdown.
  let openTagDelimiter = ""
  let codeBlockState: any = {language: "", openedContainer: "", delimiter: "", embeddedType: ""} // stores state when tokenizing embedded code blocks

  while (i <= text.length) {
    // iterate through the text stream 'text.length + 1' times. The last iteration is needed by the algorithm
    let char = ( i < text.length ? text[i] : "");
    if (char === '\t') char = (' ').repeat(TAB_TO_SPACES);

    if (beginningOfLine && char) {
      // special characters indicating html code blocks are only valid at the beginning of a line
      [prevTokenType, currentTokenType, normalParsing] = getTokenTypeIfBlockElement(char, token, currentTokenType as string)
    }

    if (normalParsing) { // non block indicating character was discovered at the beginning of a line
      if (beginningOfLine) {
        currentTokenType = changeInvalidHighlightColor(token, currentTokenType, highlightedCode.length-1, highlightedCode)
        beginningOfLine = false // prevents changing the 'invalid' highlight color of tokens at every iteration.
      }

      if (linkState !== "opened link address") { // backticks won't be special characters when present in a link address
        [prevTokenType, currentTokenType, codeBlockState] = getCodeBlockTokenTypes(char, token, currentTokenType, codeBlockState)
      }
      if (!codeBlockState.embeddedType && char) { // All markdown special characters shouldn't be special inside a code block
        [prevTokenType, currentTokenType, linkState] = getInlineElementTokenType(char, token, linkState, currentTokenType, Boolean(openedTags.length))
        if (prevTokenType === "tag name") {
          openedTags = getOpenedHTMLTagsInfo(openTagDelimiter, token, openedTags);  
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

    if (currentTokenType && !char) { // We are done iterating through the text
      prevTokenType = currentTokenType // allows the last token found to be highlighted
    }

    if (prevTokenType) { // Proceed to highlight a token
      highlightedCode.push(highlightedToken(prevTokenType, token, codeBlockState.language))

      let lti = highlightedCode.length - 1 // lastTokenIndex
      if (i >= newCaretOffset && !caretElement) { // the character before the new caret offset is in the last highlighted token
        caretElement = highlightedCode[lti]
        caretOffset = caretElement.innerText.length - (i - newCaretOffset)
      }
      openTagDelimiter = (prevTokenType === "tag delimiter" ? token : openTagDelimiter);
      token = "" // token's content should be cleared after highlighting to seperate it from other new tokens found
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

function modifyText(textStream: string, event: React.KeyboardEvent) : [string, number]|[] {
  let caretOffset, selectedTextLength;
  if (event.key === "Enter") {
    event.preventDefault();
    [caretOffset, selectedTextLength] = getCurrentCaretPosition(event.target as HTMLElement)
    if (textStream === "") {
      /*I don't use innertext because different browsers implement different behaviours with innerText. For example:
      getting innerText after Enter Key press on empty contentEditable Element return '\n\n\n' in chrome but '\n\n' in firefox*/
      textStream = '\n\n'
    }else {
      // Again, This is done cause of different browser behaviour concerning innerText when new line is encountered
      let stl = selectedTextLength
      textStream = textStream.slice(0, caretOffset) + "\n" + textStream.slice(caretOffset+stl, textStream.length)
    }
    caretOffset++
    if (caretOffset === textStream.length) {
      textStream += "\n"
    }
  }else if (event.key === "Tab") {
    event.preventDefault();
    [caretOffset, selectedTextLength] = getCurrentCaretPosition(event.target as HTMLElement)
    let stl = selectedTextLength
    textStream = textStream.slice(0, caretOffset) + (" ").repeat(TAB_TO_SPACES) + textStream.slice(caretOffset+stl, textStream.length)
    caretOffset+=TAB_TO_SPACES
  }else return [];
  return [textStream, caretOffset];
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
    let modifiedData = modifyText(localValue.current, event)
    let caretOffset;
    if (modifiedData.length === 2) {
      [localValue.current, caretOffset] = modifiedData;
    }else return;

    let [htmlTextList, updatedNumber, caretElement, newCaretOffset] = highlightMarkDown(localValue.current, caretOffset);
    (event.target as HTMLElement).innerHTML = "";
    (event.target as HTMLElement).append(...htmlTextList)
    setNumberOfLines(updatedNumber)
    moveCaretToNewPosition(newCaretOffset, caretElement.firstChild)
  }

  function reStyleCode(event: any) {
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
        className="block leading-tight text-white pl-2 caret-amber-600 outline-none flex-grow"></pre>
      </div>
      <div className="w-full h-12"></div>
    </section>
  )
}
