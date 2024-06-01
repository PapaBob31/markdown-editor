import getHTMLTokenType from "./html_tokenizer"

/* Checks if a character is part of a link address or html quoted value.
  Mostly prevents special characters from being highlighted as special. */
function getIfCharInUndelimitedTokenType(char: string, token: string, linkState: string | null, currTokenType: string | null) {
  let prevTokenType = null;

  if (currTokenType === "value" && ("'\"").includes(token[0])) { // current token type is a quoted html attribute value
    if (token.length === 1 || (token[0] !== token[token.length-1])) { // it hasn't been closed with the appropriate quote
      // return early as char will always be part of the current token type
      return [prevTokenType, currTokenType, linkState]
    }
  }else if (linkState === "opened link address") {
    if (char == ')') { // end of "link address"
      prevTokenType = currTokenType
      currTokenType = "link delimiter";
      linkState = null;
    }else if (currTokenType !== "link address") { // Prevents switching category from link address to link address
      prevTokenType = currTokenType
      currTokenType = "link address";
    }
    return [prevTokenType, currTokenType, linkState] 
  }
  return []
}

/* Checks and updates token category if character starts a html tag 
  provided the char itself is not enclosed in or part of an html tag*/
function getTagStartingCharacters(char: string, currTokenType: string, inHTML: boolean) {
  let prevTokenType = null;

  if (char === '<') {
    prevTokenType = currTokenType;
    currTokenType = "tag delimiter"
  }else if (inHTML && currTokenType !== "plain text") {
  // char is enclosed inside html tags. checking if token category prevents highlighting consecutive plaintext characters as seperate
    prevTokenType = currTokenType
    currTokenType = "plain text" // 
  }

  return [prevTokenType, currTokenType]
}

/* Checks and updates token category if a character ends or is part of a token that ends an html tag */
function getTagEndingCharacters(char: string, token: string, currTokenType: string) {
  let prevTokenType = null;

  if (char === '/' && currTokenType !== "tag delimiter"){ // so it doesn't interfere with potential "</" token
    prevTokenType = currTokenType // results in a '/' token so we can easily check for closing tag like '/>' later
  }else if (char === '>') {
    if (token !== '/') {
      prevTokenType = currTokenType
    }
    currTokenType = "tag delimiter"
  }

  return [prevTokenType, currTokenType]
}

// Checks if char (character) parameter indicates an inline html element
export default function getInlineElementTokenType(char: string, token: string, linkState: string | null, currTokenType: string | null, inHTML: boolean) {
  let prevTokenType = null;

  if (linkState === "closed link text" && char !== '(') {
    linkState = null
  }

  const stateValues = getIfCharInUndelimitedTokenType(char, token, linkState, currTokenType)
  if (stateValues.length === 3) {
    return stateValues
  }

  /* change prevTokenType ahead in order to prevent repetition of code
   since there are multiple different conditions that might result in the code below */
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

  if (!prevTokenType) { // current character's token category hasn't been determined yet
    if (notInsideTag){
      [prevTokenType, currTokenType] = getTagStartingCharacters(char, currTokenType as string, inHTML)
    }else { // single tag entity hasn't been closed by an appropriate delimiter
      [prevTokenType, currTokenType] = getTagEndingCharacters(char, token, currTokenType as string)
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
    if (currTokenType !== "plain text") { // char is a special character     
      currTokenType = "escape sequence" // highlight char as escaped
    }
  }
  return [prevTokenType, currTokenType];
}
