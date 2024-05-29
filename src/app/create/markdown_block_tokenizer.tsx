
// Checks if char (character) parameter indicates an html block element
export default function getTokenTypeIfBlockElement(char: string, token: string, currTokenType: string) {

  /* change prevTokenType ahead in order to prevent repetition of code
   since there are multiple different conditions that might result in the code below */
  let prevTokenType: any = currTokenType;

  let normalParsing = false; // indicates non special beginning of line character has been found

  if (currTokenType === "escape sequence" && token.length === 2) { 
    normalParsing = true;
    return [prevTokenType, currTokenType, normalParsing]
  }

  if (("-+#>=").includes(char)) { // char could be a list or header indicator
    currTokenType = 'block list'
  }else if (("0123456789.").includes(char)) { // char could be part of an html ordered list indicator (1.)
    if (currTokenType === "ordered list item" && !(/^\d+\.?$/).test(token)) { 
      normalParsing = true;
    }
    currTokenType = "ordered list item"
  }else if (char === '*') {
    currTokenType = 'block list 1'
  }else if (char === " " || char === "\n"){
    currTokenType = 'markdown delimiters'
  }else if (char === '\\') {
    currTokenType = "escape sequence"
  }else {
    normalParsing = true;
  }
  if (prevTokenType === "ordered list item" && currTokenType !== prevTokenType) { // token type was just changed from "ordered list item"
    if (!(/^\d+\.$/).test(token)) { // token is not in format '1.'
      normalParsing = true;
    }
  }else if (prevTokenType === "escape sequence" && currTokenType !== prevTokenType) { // token type changed from "escape sequence" to a special character
    /* This allows for the highlighting of the special character as part of an
     escape sequence by changing it's token type back to "escape sequence" */
    currTokenType = "escape sequence"
  }

  /* This allows for consecutive characters that are part of the same token category to be highlighted 
   as part of a single code block rather than individual characters per code block */
  prevTokenType = (prevTokenType === currTokenType) ? null : prevTokenType;

  return [prevTokenType, currTokenType, normalParsing]
}
