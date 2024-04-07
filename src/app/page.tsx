"use client"

import { useEffect, useState, useRef } from "react"

const operators = ["...", "in", '+', '?', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = " .;,:(){}[]`\n"
const numbers = "0123456789"
const lineComment = "//"
const multiLineComment = "/*"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'void', 'return', 'if', 'else', 'for', 'class', "=>"
]
const keywordsValues = ['true', 'false', 'null', 'undefined']
// TODO:
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

function charDelimitsStringOrComment(token: string, char: string, openedQuotes: string, commentType: string, currentTokenType: string) {
  if (commentType === '//' && char === '\n') {
    return currentTokenType
  }else if (commentType === '/*' && token.endsWith('*/')) {
    return currentTokenType
  }else if (!commentType && (char === '"' || char === "'" || char === '`')) { // no  opened comments was found and opened string
    if (openedQuotes){ 
      if (openedQuotes === char) {
        return currentTokenType
      }
    }else {
      return char
    }
  }
  return null
}

function tokenIsOthers(char: string, currentTokenType: string) {
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
  codeElement.textContent = token
  codeElement.className = classStr
  return codeElement;
}

function highlightedToken(prevTokenType:string, token:string) {
  if (prevTokenType === "comment") {
    return styleCode(token, "text-gray-300")
  }else if (prevTokenType === "string") {
    return styleCode(token, "text-green-300")
  }else if ( !isNaN(token * 0) && prevTokenType === 'unknown' ) {
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
  let i = 0;

  while (stringNotParsed) {
    let char = ( i < text.length ? text[i] : "")

    if (!commentType && !openedQuotesType) { // no opened comment and no opened string
      if (lineComment.includes(char) || multiLineComment.includes(char)) { // checks if character could be part of a comment token
        if (!lineComment.includes(text[i-1]) && !multiLineComment.includes(text[i-1])) {
          prevTokenType = currentTokenType // parse whatever token type found so far
        }  
      }
      commentType = checkTokenStartsComment(token)
      if (commentType) {
        currentTokenType = 'comment'
      }
    }

    let tokenType = charDelimitsStringOrComment(token, char, openedQuotesType, commentType, currentTokenType)
    if (tokenType) {
      prevTokenType = currentTokenType
      openedQuotesType = ''
      if (tokenType === char) {
        openedQuotesType = char
        currentTokenType = "string"
      }
    }else if (!openedQuotesType && char && !commentType) { // no opened comment, not the last iteration and no opened string
      [prevTokenType, currentTokenType] = tokenIsOthers(char, currentTokenType)
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
  return highlightedCode
}


function CodeEditor({addNewLine, lineNo, focused} : {addNewLine: (num: number)=>void, lineNo: number, focused: boolean}) {
  const [codeContent, setCodeContent] = useState<React.ReactNode[]>([])

  useEffect(() => {
    if (focused && preElement.current) {
      preElement.current.focus()
    }
  }, [focused])
  
  const preElement = useRef<HTMLPreElement>(null)
 
  function reformatInput(event) {
    if (!preElement.current) { // this will never happen 
      return // typescript can rest now
    }
    let newText = preElement.current.textContent as string
    let selection:any = window.getSelection()
    let range = selection.getRangeAt(0)
    range.setStart(preElement.current, 0)
    let caretOffset = range.toString().length
    preElement.current.innerHTML = ""
    let htmlTextList = highlightCode(newText)
    preElement.current.append(...htmlTextList)
    for (let i=0; i<caretOffset; i++) {
      selection.modify("move", "right", "character")
    }  
  }

  return (
    <div className="flex bg-sky-800">
     <pre contentEditable spellCheck="false" onInput={reformatInput} ref={preElement}
      className="text-white px-4 caret-amber-600 outline-none focus:bg-sky-900 flex-grow"></pre>
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
