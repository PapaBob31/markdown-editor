"use client"

import { useEffect, useState, useRef } from "react"

const operators = "+-/*^|&=<>"
const delimiters = " .;,:(){}[]'`\""
const numbers = "0123456789"
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', 'async', 
  'await', 'true', 'false', 'null', 'undefined', 'void', 'return', 'if', 'else'
]

function LineOfCode({addNewLine, lineNo, focused} : {addNewLine: (num: number)=>void, lineNo: number, focused: boolean}) {
  useEffect(() => {
    if (focused && preElement.current) {
      preElement.current.focus()
    }
  }, [focused])
  
  const preElement = useRef<HTMLPreElement>(null)

  function reformatInput(event) { // for testing arbitrary insertion and deletion in input
    event.preventDefault();
    if (!preElement.current) { // this will never happen 
      return // typescript can rest now
    }
    let selection:any = window.getSelection()
    let range = selection.getRangeAt(0)
    range.setStart(preElement.current, 0)
    let caretOffset = range.toString().length
    let insertedText = ""
    if (event.type === "paste") {
      insertedText = event.clipboardData.getData("text")
    }else {
      insertedText = event.data
    }
    let length = event.target.textContent.length

    let newText = event.target.textContent.slice(0, caretOffset) + insertedText + event.target.textContent.slice(caretOffset, length)
    let codeTag =  document.createElement("code")
    let htmlTextList = newText.split(' ').map((word, index) => {
      codeTag.textContent = word.toUpperCase()
      return codeTag.cloneNode(true)
    })
    preElement.current.innerHTML = ""
    preElement.current.append(...htmlTextList)
    let newCaretOffset = caretOffset + insertedText.length
    for (let i=0; i<newCaretOffset; i++) {
      selection.modify("move", "right", "character")
    }  
  }

  function gotoNextLine(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addNewLine(lineNo)
    }
  }
  return (
    <div className="flex bg-sky-800">
    <span className="text-gray-300 font-semibold w-6 pl-2">{lineNo}</span>
     <pre id="fat" contentEditable spellCheck="false" onKeyDown={gotoNextLine} onBeforeInput={reformatInput} onPaste={reformatInput}
     ref={preElement} className="text-white px-4 caret-amber-600 focus:outline-0 focus:outline-transparent focus:bg-sky-900 flex-grow"></pre>
    </div>
   
  )
}

export default function Editor() {
  const [linesKeys, setLinesKeys] = useState([1])
  const freeKeys = useRef<number[]>([])
  const newLineNum = useRef(-1)

  function addNewLine(num: number) {
    let newLineKeys = []
    if (freeKeys.current.length === 0) {
      let len = linesKeys.length
      newLineKeys = [...linesKeys.slice(0, num), linesKeys[len-1]+1, ...linesKeys.slice(num, linesKeys.length)]
    }else {
      newLineKeys = [...linesKeys.slice(0, num), freeKeys.current.pop() as number, ...linesKeys.slice(num, linesKeys.length)]
    }
    newLineNum.current = num+1
    setLinesKeys(newLineKeys)
  }

  function generateLinesofCode() {
    const jsxList = Array(linesKeys.length)
    for (let i=0; i < linesKeys.length; i++) {
      let isFocused = (newLineNum.current === i+1) 
      jsxList[i] = <LineOfCode key={linesKeys[i]} lineNo={i+1} addNewLine={addNewLine} focused={isFocused}/>
    }
    return jsxList;
  }

  return (
    <section>
      {generateLinesofCode()}
    </section>
  )
}





/*export default function Editor() {
  useEffect(() => {
    document.addEventListener("keydown", (event)=>{
    })
  })
  const [formattedInput, setFormattedInput] = useState([])
  const prevValue = useRef("")
  const preElement = useRef(null)

  function reformatInput(event: any) {
    event.preventDefault()
    let selection:any = window.getSelection()
    let range = document.createRange()
    let firstNode = preElement.current.querySelector("code")
    let caretOffset = 0

    if (firstNode) {
      range.setStart(firstNode, 0)
      range.setEnd(selection.getRangeAt(0).startContainer, 0)
      caretOffset = range.toString().length + selection.getRangeAt(0).startOffset
    }

    let word = ""
    let newInput = []
    let codeObj = document.createElement("code")
    let openedQuotes = false
    let newText = ""
    let insertedText = ""
    if (event.type === "paste") {
      insertedText = event.clipboardData.getData("text")
    }else {
      insertedText = event.data
    }

    let length = event.target.textContent.length
    if (caretOffset === event.target.textContent.length) {
      newText = event.target.textContent + insertedText
    }else {
      newText = event.target.textContent.slice(0, caretOffset) + insertedText + event.target.textContent.slice(caretOffset, length)
    }
    let nodeIndex = null
    function styleCode(word, colorClass, i) {
      if (word.length+i > caretOffset+insertedText.length) {
        let index = (word.length+i) - (caretOffset+insertedText.length)
        let word1 = word.slice(0, index+1)
        let word2 = word.slice(index+1, word.length)
        codeObj.className = colorClass
        codeObj.textContent = word1
        newInput.push(codeObj.cloneNode(true))
        codeObj.textContent = word2
        nodeIndex = newInput.push(codeObj.cloneNode(true))
      }
      codeObj.textContent = word
      codeObj.className = colorClass
      newInput.push(codeObj.cloneNode(true))
    }

    for (let i=0; i<newText.length; i++) {
      let char = newText[i]
      if (newText[i] === '/' && newText[i+1] === '/') {
        styleCode(newText.slice(i, newText.length), "text-gray-400", i)
        break
      }

      if (openedQuotes) {
        word += char
        continue
      }
      // todo: fn calls, spread operator
      if (delimiters.includes(char) || operators.includes(char) || i===newText.length-1) {
        if (char === '"' || char === "'") {
          openedQuotes = !openedQuotes
          if (!openedQuotes) {
            styleCode(word, "text-green-300", i)
          }
        }else if (keywords.includes(word)) {
          styleCode(word, "text-violet-500", i)
        }else if (!isNaN(parseFloat(word))){ // word string represents a number
          styleCode(word, "text-amber-500", i)
        }else {
          styleCode(word, "text-gray-200", i)
        }
        if (delimiters.includes(char)) {
          char !== '"' && styleCode(char, "text-gray-400", i)
        }else styleCode(char, "text-orange-500", i)
        word = ""
        continue
      }
      word += char
    }
    if (word) {
      codeObj.textContent = word
      newInput.push(codeObj.cloneNode(true))
    }
    preElement.current.innerHTML = ''
    // const fragment = new DocumentFragment()
    preElement.current.append(...newInput)
    console.log(newInput[nodeIndex], nodeIndex)
    if (firstNode) {
      range.setStart(newInput[nodeIndex], 0)
      range.setEnd(newInput[nodeIndex], 0)
      selection.addRange(range)
    }else selection.collapseToEnd()
  }

  return (
    <pre id="fat" contentEditable spellCheck="false" onBeforeInput={reformatInput} onPaste={reformatInput}
     ref={preElement} className="text-white bg-sky-800 px-4 caret-amber-600"></pre>
  )
}*/


//let i = 0; i++