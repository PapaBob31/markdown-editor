
// js operators since it's the only supported language for now
const operators = ["...", "in", "new", '~', '+', '!', '?', '%', '-', '*', '^', '|', '&', '=', '<', '>']

// js operators since it's the only supported language for now
const delimiters = ":;,(){}[]\t"

/** Checks for the token category char parameter falls into
 * @param char: the current character in the text stream
 * @param prevChar: the character before char in the text stream
 * @param currentTokenType: the current token category
 **/
function checkForOtherTokenTypes(char: string, currentTokenType: string, prevChar: string) : string[] {
  let prevTokenType: any = null

  if (char === " ") {
  /* Whitespace should be classified as a part of other tokens. Useful in case of function calls where 
  arguments set may be seperated from function name by some white space */
    if (currentTokenType === "string") { // This is an exception because the string has been delimited
      prevTokenType = currentTokenType
      currentTokenType = 'delimiter' // has no effect on syntax highlighting
    }
  }else if (delimiters.includes(char)) {
    if (currentTokenType !== 'delimiter') {
    /* prevents grouping consecutive delimiter characters as seperate tokens rather than as a whole token
      which in turn reduces the number of tokens to be added back to the DOM during highlighting */

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
    /* prevents grouping consecutive operator characters as seperate tokens rather than as a whole token
      which in turn reduces the number of tokens to be added back to the DOM during highlighting */

      prevTokenType = currentTokenType
      currentTokenType = 'operator'
    }
  }else if (currentTokenType !== "unknown" || prevChar === ' ') {
    // non whitespace character after an "unknown" token having trailing whitespace begins a new token
    prevTokenType = currentTokenType
    currentTokenType = 'unknown'
  }
  return [prevTokenType, currentTokenType]
}


// Checks if a character is part of a 'container' token type (string, comments and regexes)
function checkForContainerTokenTypes(char: string, token: string, currTokenType: string): string[] {
  let prevTokenType:any = null

  if (char === '"' || char === "'") {
    prevTokenType = currTokenType // indicates the end of the current token
    currTokenType = "string"
  }else if (char === "`") { // start of a template literal
    if (token !== '\n' && currTokenType !== "string") {
      /* The condition above prevents seperating tokens that should other wise be one token
        because the combined token could be a potential code block delimiter */
      prevTokenType = currTokenType
    }
    currTokenType = "string";
  }else if (char === '/') { 
    prevTokenType = currTokenType // indicates the end of the current token
    if (currTokenType === "unknown" || token.trimEnd().endsWith(')') ) {
      /* current token could be a number, a variable, a compound expression or it could be part of a 
      function call. In both cases the '/' character following them is considered a valid operator. */
      currTokenType = "operator"
    }else { // The '/' character could start a regex literal or it's invalid synax
      currTokenType = "regex" // set as regex anyways
    }
  }else if (char === '.' && !(/^\d/).test(token) && currTokenType !== "delimiter") {
    // '.' character should be a delimiter since the current token type is not a number
    prevTokenType = currTokenType
    currTokenType = "delimiter"
  }else if (char === '\n') {
    prevTokenType = currTokenType
    currTokenType = "delimiter"
  }else {
    [prevTokenType, currTokenType] = checkForOtherTokenTypes(char, currTokenType as string, token[token.length - 1])
  }
  return [prevTokenType, currTokenType]
}


/* Returns a boolean indicating that the char parameter delimits 
a token that's like a container namely comments, strings and regex */
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

/** Checks for special characters like escape sequences and delimiters in strings and regexes token type.
 * @params containerType: Stores the state of original token (regex|string) when current token type changes to escape sequence
 **/
function checkForSpecialCharsInContainer(containerType: string, char: string, currentTokenType: string, token: string): any[] {
  let prevTokenType = null

  if (!(["string-type-1", "string-type-2", "string-type-3", "regex"]).includes(containerType)) {
    return [prevTokenType, currentTokenType, containerType]
  }

  // current token type isn't "escape sequence" or if it is; An escaped character has been added to the token
  if (currentTokenType !== "escape sequence" || token.length === 2) {
    if (char === '\\') {
      prevTokenType = currentTokenType
      currentTokenType = "escape sequence"
    }else if (char === '\n') {
      if (containerType === 'string-type-1' || containerType === "string-type-2" || containerType === "regex") {
        // Strings and regexes should not continue across new lines
        containerType = ""
      }else if (containerType === "string-type-3") {
        /* Split the template literal at a newline so we can easily check later for
         markdown code blocks delimiter since they are also delimited by backticks*/
        prevTokenType = currentTokenType
      }
    }else if (currentTokenType === "escape sequence") { // The previous character was escaped
      prevTokenType = currentTokenType  // indicates the end of the current token (escape sequence)
      if (containerType === "regex") {
        currentTokenType = "regex"
      }else currentTokenType = "string";
    }
  }
  return [prevTokenType, currentTokenType, containerType]
}

/** Tokenizes javascript source code
 * @param char: current character in text stream
 * @param openedContainer: is used to store state of token types (namely comments, strings and regexes)
 * that can contain other special characters and soemetimes escape sequences; hence the name 'openedContainer'
 **/
export function getJsTokenType(char: string, token: string, currentTokenType: string, openedContainer: string): any[] {
  let prevTokenType = null

  if (!char) {
    return [prevTokenType, currentTokenType, openedContainer]
  }

  if (openedContainer === "multi-line-comment" && token.slice(token.length-2, token.length) === "*/") {
    openedContainer = ""
  }else if (openedContainer === 'line-comment' && char === '\n') {
    openedContainer = ""
  }else if (!openedContainer) {
    if (token === '/') { // previous character before char in text stream is '/'
      if (char === '*') {
        currentTokenType = "comment"
        openedContainer = "multi-line-comment"
      }else if (char === '/'){
        currentTokenType = "comment"
        openedContainer = 'line-comment'
      }else if (currentTokenType === "regex") { // token type wasn't and can't be a comment
        openedContainer = "regex"
      }
    }else if (token[0] === "'") {
      openedContainer = "string-type-1"
    }else if (token[0] === '"') {
      openedContainer = "string-type-2"
    }else if (token[token.length-1] === '`') {
      openedContainer = "string-type-3"
    }
  }else if (charDelimitsContainer(openedContainer, token[token.length-1])) {
    if (currentTokenType !== "escape sequence") {
      openedContainer = ""
    }
  }
  [prevTokenType, currentTokenType, openedContainer] = checkForSpecialCharsInContainer(openedContainer, char, currentTokenType, token)

  if (!openedContainer) {
    [prevTokenType, currentTokenType, openedContainer] = checkForContainerTokenTypes(char, token, currentTokenType)
  }

  return [prevTokenType, currentTokenType, openedContainer]
}

// Tokenizes plain text
export function getPlainTextTokens(char: string, token: string, currTokenType: string) {
  let prevTokenType = null
  if (char === '\n') {
    prevTokenType = currTokenType
    currTokenType = "delimiter"
  }else if (currTokenType !== "plain text") {
    currTokenType = "plain text"
  }
  return [prevTokenType, currTokenType]
}
