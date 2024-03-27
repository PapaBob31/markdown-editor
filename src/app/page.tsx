"use client"

import { useEffect, useState, useRef } from "react"

let seperators = "()+-*&&||[]{};,''`` "
// on each input change
// if you find a ()
// - color the word before it to show function calls

// if you encounter a space
// check if word before is a keyword
// check if character after it is a () indicating a fn call

// if you encounter any of the operators style em
// if you encounter quotes style everybody so far it isn't closed
// else do nothing

export default function Editor() {
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
    let caretOffset = selection.anchorOffset
    let word = ""
    let newInput = []
    let codeObj = document.createElement("code")
    let openedQuotes = false
    let newText = ""
    let length = event.target.textContent.length

    if (caretOffset === event.target.textContent.length) {
      newText = event.target.textContent + event.data
    }else {
      newText = event.target.textContent.slice(0, caretOffset) + event.data + event.target.textContent.slice(caretOffset, length)
    }
    let newCaretOffset = caretOffset + event.data.length
    const range =  document.createRange()

    for (let i=0; i<newText.length; i++) {
      word += newText[i]
      if (newText[i] === "'" || newText[i] === '"') {
        if (openedQuotes) {
          openedQuotes = false
          codeObj.textContent = word
          codeObj.className = "text-green-500"
          newInput.push(codeObj.cloneNode(true))
          word = ""
        }else {
          openedQuotes = true
        }
      }
      if (openedQuotes) {
        continue
      }
      if (newText[i] === " " || newText[i] === "\t" ) {
        if ("let while for const var continue break if else".includes(word)) {
          codeObj.textContent = word
          codeObj.className = "text-purple-600"
          newInput.push(codeObj.cloneNode(true))
          word = ""
          continue
        }
      }
      if ("+-*&%|<>=".includes(newText[i]) || "0123456789".includes(newText[i])) {
        codeObj.textContent = word.slice(0, word.length-1)
        newInput.push(codeObj.cloneNode(true))

        codeObj.textContent = word[word.length - 1]
        codeObj.className = "text-orange-500"
        newInput.push(codeObj.cloneNode(true))
        word = ""
      }
   }
   if (word) {
    codeObj.textContent = word
    newInput.push(codeObj.cloneNode(true))
   }
   preElement.current.innerHTML = ''
   preElement.current.append(...newInput)
   // console.log(newCaretOffset)
   // range.setStart(preElement.current., newCaretOffset)
   // range.setEnd(preElement.current, newCaretOffset)
   // selection.addRange(range)
  }

  return (
    <pre id="fat" contentEditable onBeforeInput={reformatInput} ref={preElement} className="text-white bg-blue-900 px-4"></pre>
  )
}