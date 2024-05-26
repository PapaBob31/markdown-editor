
// Checks if char (character) parameter indicates an html block element
// Returns current token type
export default function getTokenTypeIfBlockElement(char: string, token: string, currTokenType: string) {
  let prevTokenType: any = currTokenType;
  let normalParsing = false;

  if (currTokenType === "escape sequence" && token.length === 2) {
    normalParsing = true;
    return [prevTokenType, currTokenType, normalParsing]
  }

  if (("-+#>=").includes(char)) {
    if (currTokenType !== 'block list') {
      currTokenType = 'block list'
    }
  }else if (("0123456789.").includes(char)) {
    if (currTokenType !== "ordered list item") {
      currTokenType = "ordered list item"
    }else if (!(/^\d+\.?$/).test(token)) {
      normalParsing = true;
    }
  }else if (char === '*') {
    if (currTokenType !== 'block list 1') {
      currTokenType = 'block list 1'
    }
  }else if (char === " " || char === "\n"){
    if (currTokenType !== 'markdown delimiters') {
      currTokenType = 'markdown delimiters'
    }
  }else if (char === '\\') {
    if (currTokenType !== "escape sequence") {
      currTokenType = "escape sequence"
    }
  }else {
    normalParsing = true;
  }
  if (prevTokenType === "ordered list item" && currTokenType !== prevTokenType) { // tokentype was just chnaged from "ordered list item"
    if (!(/^\d+\.$/).test(token)) { // token is not in format '1.' 
      normalParsing = true;
    }
  }else if (prevTokenType === "escape sequence" && currTokenType !== prevTokenType) {
    currTokenType = "escape sequence"
  }
  prevTokenType = (prevTokenType === currTokenType) ? null : prevTokenType;

  return [prevTokenType, currTokenType, normalParsing]
}
