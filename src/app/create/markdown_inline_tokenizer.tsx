import getHTMLTokenType from "./html_tokenizer"

// Checks if char (character) parameter indicates an inline html element
export default function getInlineElementTokenType(char: string, token: string, linkState: string | null, currTokenType: string | null, inHTML: boolean) {
  let prevTokenType = null;

  if (linkState === "closed link text" && char !== '(') {
    linkState = null
  }

  if (currTokenType === "value" && ("'\"").includes(token[0])) { // current token type is a quoted html attribute value
    if (token.length === 1 || (token[0] !== token[token.length-1])) { // it has been closed with the appropriate quote
      return [prevTokenType, currTokenType, linkState] // return early as char will always be part of the current token type
    }
  }else if (linkState === "opened link address") {
    if (char == ')') { // link delimiter token category was just found
      prevTokenType = currTokenType
      currTokenType = "link delimiter";
      linkState = null;
    }else if (currTokenType !== "link address") { // Prevents switching category from link address to link address
      prevTokenType = currTokenType
      currTokenType = "link address";
    }
    return [prevTokenType, currTokenType, linkState] 
  }

  /* change prevTokenType ahead in order to prevent repetition of code
   since there are multiple different conditions that will result in the code below */
  prevTokenType = currTokenType;

  let notInsideTag = true; // indicates if a character being parsed is not part of an html tag

  [prevTokenType, currTokenType, notInsideTag] = getHTMLTokenType(char, token, currTokenType)

  if (!inHTML && notInsideTag) {
    if (char === '!' && linkState !== "opened link text") { // char could be part of a markdown image link
      if (token === '!') {
        prevTokenType = "plain text" // prevents the highlighting of multiple '!' character
      }
      currTokenType = "link delimiter"
    }else if (char  === '[' && linkState !== "opened link text") {
      currTokenType = "link delimiter"
      if (token !== '\\') {
        linkState = "opened link text"
      }
    }else if (char === ']' && linkState === "opened link text") {
      currTokenType = "link delimiter"
      if (token !== '\\') {
        linkState = "closed link text"
      }
    }else if (char === '(' && linkState === "closed link text") {      
      linkState = "opened link address"
    }else if (char === "*" || char === "_") {
      currTokenType = "emphasis|strong"
    }else if (!('<\\').includes(char) && currTokenType !== "plain text") {
      currTokenType = "plain text"
    }
  }

  if (prevTokenType === currTokenType) {
    prevTokenType = null
  }

  if (notInsideTag) {
    if (char === '<') {
      if (token === '<') {
        prevTokenType = "plain text"
      }else prevTokenType = currTokenType;
      currTokenType = "tag delimiter"
    }else if (inHTML && currTokenType !== "plain text") {
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
    [prevTokenType, currTokenType] = checkIfCharIsInEscapeSequence(char, token, prevTokenType, currTokenType as string)
  }
  return [prevTokenType, currTokenType, linkState]
}

function checkIfCharIsInEscapeSequence(char: string, token: string, prevTokenType: any, currTokenType: string) {
  if (char === '\\' && token !== '\\') {
    prevTokenType = currTokenType
    currTokenType = "escape sequence"
  }else if (token === '\\') {
    prevTokenType = null
    if (currTokenType !== "plain text") {      
      currTokenType = "escape sequence"
    }
  }
  return [prevTokenType, currTokenType];
}
