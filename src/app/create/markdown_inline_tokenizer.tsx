import getHTMLTokenType from "./html_tokenizer"

export default function getInlineElementTokenType(char: string, token: string, linkState: string | null, currTokenType: string | null, inHTML: boolean) {
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
