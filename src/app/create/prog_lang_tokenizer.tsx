const operators = ["...", "in", "new", '~', '+', '!', '?', '%', '-', '*', '^', '|', '&', '=', '<', '>']
const delimiters = ":;,(){}[]\t"

/** Checks for the token category a particular character falls into
 * @params {string} char: the target character
 * @params {string} currentTokenType: the token category the previous set of [one or more] characters before it falls into
 **/
function checkTokenType(char: string, currentTokenType: string, charBefore: string) {
  let prevTokenType = null

  if (delimiters.includes(char)) {
    if (currentTokenType !== 'delimiter') {
      if (char === '(' && currentTokenType === "unknown") {
        prevTokenType = "possible function call"
        currentTokenType = 'delimiter'
      }else {
        prevTokenType = currentTokenType;
        currentTokenType = 'delimiter'
      }
    }
  }else if (operators.includes(char)) {
    if (currentTokenType !== 'operator') {
      prevTokenType = currentTokenType
      currentTokenType = 'operator'
    }
  }else if (currentTokenType !== "unknown" || (char !== ' ' && charBefore === ' ')) {
    prevTokenType = currentTokenType
    currentTokenType = 'unknown'
  }
  return [prevTokenType, currentTokenType]
}

function charDelimitsContainer(containerType: string, char: string) {
  switch (containerType) {
    case "string-type-1":
      return char === "'";
    case "string-type-2":
      return char === '"';
    case "string-type-3":
      return char === '`';
    case "regex":
      return char === "/";
    default:
      return false;
  }
}

export function getJsTokenType(char: string, token: string, currentTokenType: string | null, state: any) {
  let prevTokenType = null

  if (!char) {
    return [prevTokenType, currentTokenType, state]
  }
  if (state.openedContainer === "multi-line-comment" && token.slice(token.length-2, token.length) === "*/") {
    state.openedContainer = ""
  }else if (state.openedContainer === 'line-comment' && char === '\n') {
    state.openedContainer = ""
  }else if ((["string-type-1", "string-type-2", "string-type-3", "regex"]).includes(state.openedContainer)) {
    if (currentTokenType !== "escape sequence") {
      if (char === '\\') {
        prevTokenType = currentTokenType
        currentTokenType = "escape sequence"
      }else if (charDelimitsContainer(state.openedContainer, token[token.length-1])) {
        state.openedContainer = ""
      }
    }else if (currentTokenType === "escape sequence" && token.length === 2) {
      prevTokenType = currentTokenType
      if (state.openedContainer === "regex") {
        currentTokenType = "regex"
      }else currentTokenType = "string";
    }
    if (char === '\n' && (state.openedContainer === 'string-type-1' || state.openedContainer === "string-type-2")) {
      state.openedContainer = ""
    }
  }else {
    if (token === "'") {
      state.openedContainer = "string-type-1"
    }else if (token === '"') {
      state.openedContainer = "string-type-2"
    }else if (token[token.length-1] === '`') {
      state.openedContainer = "string-type-3"
    }
  }

  if (!state.openedContainer) {
    if (token === '/*') {
      currentTokenType = "comment"
      state.openedContainer = "multi-line-comment"
    }else if (token === '//') {
      currentTokenType = "comment"
      state.openedContainer = 'line-comment'
    }else if (currentTokenType === "regex" && token === '/') {
      state.openedContainer = "regex"
    }else if (char === '"' || char === "'") {
      prevTokenType = currentTokenType
      currentTokenType = "string"
    }else if (char === "`") {
      if (currentTokenType !== "string" && token !== '\n') {
        prevTokenType = currentTokenType
      }
      currentTokenType = "string";
    }else if (char === '/') {
      if (currentTokenType === "delimiter" || currentTokenType === "operator") {
        prevTokenType = currentTokenType
        currentTokenType = "regex"
      }else if ((token.length === 1 && token[0] !== '/') || token.length > 1) {
        prevTokenType = currentTokenType
        currentTokenType = "operator"
      }
    }else if (char === '.' && !(/^\d/).test(token)) {
      if (currentTokenType !== "delimiter") {
        prevTokenType = currentTokenType
        currentTokenType = "delimiter"
      }
    }else if (char === '\n') {
      prevTokenType = currentTokenType
      currentTokenType = "delimiter"
    }else if (char !== ' ') {
      [prevTokenType, currentTokenType] = checkTokenType(char, currentTokenType as string, token[token.length - 1])
    }
  }

  return [prevTokenType, currentTokenType, state]
}

export function getPlainText(char: string, token: string, currTokenType: string) {
  let prevTokenType = null
  if (char === '\n') {
    prevTokenType = currTokenType
    currTokenType = "delimiter"
  }else if (currTokenType !== "plain text") {
    currTokenType = "plain text"
  }
  return [prevTokenType, currTokenType]
}
