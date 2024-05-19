const operators = ["...", "in", "new", '~', '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>']
const delimiters = ":.;,(){}[]\n\t"

/** Checks for the token category a particular character falls into
 * @params {string} char: the target character
 * @params {string} currentTokenType: the token category the previous set of [one or more] characters before it falls into
 **/
function checkTokenType(char: string, currentTokenType: string) {
  let prevTokenType = null

  if (delimiters.includes(char)) {
    if (currentTokenType !== 'delimiter') {
      if (char === '(' && currentTokenType === "unknown") {
        prevTokenType = "possible function call"
        currentTokenType = 'delimiter'
      }else if (char === "." && currentTokenType !== "possible number") { 
        prevTokenType = currentTokenType;
        currentTokenType = 'delimiter'
      }else if (char !== '.' && char !== '(') {
        prevTokenType = currentTokenType;
        currentTokenType = 'delimiter'
      }
    }
  }else if (operators.includes(char)) {
    if (currentTokenType !== 'operator') {
      prevTokenType = currentTokenType
      currentTokenType = 'operator'
    }
  }else if (("0123456789").includes(char)) {
    if (currentTokenType !== 'possible number') {
      prevTokenType = currentTokenType
      currentTokenType = 'possible number'
    }
  }else if (currentTokenType !== 'unknown') {
    if (currentTokenType !== 'possible number' || !("ABCDEFoObBxXn").includes(char)) {
      prevTokenType = currentTokenType
      currentTokenType = 'unknown'
    }
  }
  return [prevTokenType, currentTokenType]
}

export function getJsTokenType(char: string, token: string, currentTokenType: string | null, state: any) {
  let prevTokenType = null

  if (!char) {
    return [prevTokenType, currentTokenType, state]
  }

  if (currentTokenType === "escape sequence" && token.length < 2) {
    return [prevTokenType, currentTokenType, state]
  }else if (currentTokenType === "escape sequence" && token.length === 2) {
    prevTokenType = currentTokenType
    currentTokenType = "string"
  }

  if (currentTokenType === "comment") {
    if (state.openedComment === "/*" && token.slice(token.length-2, token.length) === "*/") {
      state.openedComment = ""
    }else if (state.openedComment === '//' && char === '\n') {
      state.openedComment = ""
    }
  }else if (currentTokenType === "string") {
    if (token.length === 1 && !state.openedStringDelimiter) {
      state.openedStringDelimiter = token
    }else if (token[token.length - 1] === state.openedStringDelimiter) {
      if (!prevTokenType) { // so we can escape string literal marks=ers
        state.openedStringDelimiter = ""
      } 
    }

    if (char === '\\') {
      prevTokenType = currentTokenType
      currentTokenType = "escape sequence"
    }

    if (char === '\n' && (state.openedStringDelimiter === '"' || state.openedStringDelimiter === "'")) {
      state.openedStringDelimiter = ""
    }
  }

  if (!state.openedComment && !state.openedStringDelimiter) {
    if (token === '//' || token === '/*'){
      currentTokenType = "comment"
      state.openedComment = token
    }else if (char === '"' || char === "'" || char === "`") {
      prevTokenType = currentTokenType
      currentTokenType = "string"
    }else if ((char === '/' || char === '*') && token){
      if (token.length > 1 || token[0] !== '/') {
        prevTokenType = currentTokenType
      }
    }else {
      [prevTokenType, currentTokenType] = checkTokenType(char, currentTokenType as string)
    }
  } 

  if (char !== " " && token[token.length-1] === " ") {
    if (currentTokenType === "unknown") {
      prevTokenType = currentTokenType
    }
  }
  return [prevTokenType, currentTokenType, state]
}

export function getPlainText(char: string, token: string, currTokenType: string) {
  let prevTokenType = null
  if (char === '`') {
    if (currTokenType === "delimiter") {
      prevTokenType = currTokenType
      currTokenType = "plain text"
    }
  }else {
    if (char === '\n' && currTokenType !== "delimiter") {
      prevTokenType = currTokenType
      currTokenType = "delimiter"
    }else if (currTokenType !== "plain text") {
      prevTokenType = currTokenType
      currTokenType = "plain text"
    }
  }
  return [prevTokenType, currTokenType]
}
