import { getJsTokenType, getPlainTextTokens } from "./prog_lang_tokenizer"
const acceptedLanguages = ["js"]

// Gets the token type of embedded code blocks token inside markdown
export default function getCodeBlockTokenTypes(char: string, token: string, currentTokenType: string, codeBlockState: any) {
  let prevTokenType: any = null
  
  if (codeBlockState.embeddedType === "code span") {
    if (token === codeBlockState.delimiter) {
      codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}
      currentTokenType = "code delimiter"
    }
  }else if (token[0] === '\n') { // token is the first token on a new line as indicated by the token's first character
    if ((token.slice(1, token.length) === codeBlockState.delimiter) && char === '\n') {
    // rest of the token is equal to codeBlockState.delimiter and it's the only token on a new line
      codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}
      currentTokenType = "code delimiter"
    }
  }

  if (!codeBlockState.embeddedType) {
    if (char === '`') {
      if (token[token.length - 1] === '\n' || token === "") { // char was found at the beginning of a line
        codeBlockState.embeddedType = "code block" // indicates a possible block of code
      }else codeBlockState.embeddedType = "code span"; // indicates a span of code
      prevTokenType = currentTokenType
      currentTokenType = "code delimiter"
    }
  }

  if (codeBlockState.embeddedType) {
    if (codeBlockState.delimiter && !codeBlockState.language) { // codeBlockState.language stores the language of the code block
      if (char === '`' && token[token.length-1] !== '`') { // '`' could be part of a token that's a potential delimiter
        prevTokenType = currentTokenType // leads to the eventual highlighting of the token we have so far
      }else if (char === '\n' && codeBlockState.embeddedType === "code block") {
        // current token type is "inline code body" but will be changed below
        if (acceptedLanguages.includes(token)) { 
          currentTokenType = "code type"
          codeBlockState.language = token
        }else{
          currentTokenType = "plain text"
          codeBlockState.language = "text"
        }
      }else if (char === '\n' && codeBlockState.embeddedType !== "code block") { // code span can also be delimited by a new line character
        codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}
      }
    }else if (!codeBlockState.delimiter) {
      if (char !== '`' && char) { // first non '`' character was found marking the end of a code block/span opening delimiter
        codeBlockState.delimiter = token
        if (token.length <= 2 && char === '\n') { // code span can also be delimited by a new line character
          codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}  
        }else if (char !== '\n'){
          prevTokenType = currentTokenType
          if (token.length <= 2) {

            // incase it was set as a code block before.
            codeBlockState.embeddedType = "code span" // backticks making up a code block delimiter must be at least 3
          }
          currentTokenType = "inline code body"
        }else if (char === '\n' && codeBlockState.embeddedType === "code block"){
          codeBlockState.language = "text" // language defaults to text since no input was given
        }
      }
    }

    if (codeBlockState.language === "js") {
      [prevTokenType, currentTokenType, codeBlockState.openedContainer] = getJsTokenType(char, token, currentTokenType, codeBlockState.openedContainer)
    }else if (codeBlockState.language === "text") {
      [prevTokenType, currentTokenType] = getPlainText(char, token, currentTokenType)
    }
  }
  return [prevTokenType, currentTokenType, codeBlockState]
}
