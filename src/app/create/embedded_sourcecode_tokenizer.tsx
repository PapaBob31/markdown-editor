import { getJsTokenType, getPlainText } from "./prog_lang_tokenizer"
const acceptedLanguages = ["js"]

export default function experimental(char: string, token: string, currentTokenType: string, codeBlockState: any) {
  let prevTokenType: any = null

  if (token === codeBlockState.delimiter) {
    if (codeBlockState.embeddedType !== "code block") {
      codeBlockState = {language: "", openedComment: "", openedStringDelimiter: "", delimiter: "", embeddedType: ""}
    }else if (char === '\n') {
      codeBlockState = {language: "", openedComment: "", openedStringDelimiter: "", delimiter: "", embeddedType: ""}
      currentTokenType = "code delimiter"
    }
  }

  if (!codeBlockState.embeddedType) {
    if (char === '`') {
      if (token[token.length - 1] === '\n' || token === "") { //beginning of line check for second check
        codeBlockState.embeddedType = "code block"
      }else codeBlockState.embeddedType = "code span";
      prevTokenType = currentTokenType
      currentTokenType = "code delimiter"
    }
  }

  if (codeBlockState.embeddedType) {
    if (codeBlockState.delimiter && !codeBlockState.language) {
      if (char === '`' && token[token.length-1] !== '`') {
        prevTokenType = currentTokenType
      }else if (char === '\n' && codeBlockState.embeddedType === "code block") {
        if (acceptedLanguages.includes(token)) {
          currentTokenType = "code type"
          codeBlockState.language = token
        }else{
          currentTokenType = "plain text"
          codeBlockState.language = "text"
        }
      }else if (char === '\n' && codeBlockState.embeddedType !== "code block") {
        codeBlockState = {language: "", openedComment: "", openedStringDelimiter: "", delimiter: "", embeddedType: ""}
      }
    }else if (!codeBlockState.delimiter) {
      if (char !== '`' && char) {
        codeBlockState.delimiter = token
        if (token.length <= 2 && char === '\n') {
          codeBlockState = {language: "", openedComment: "", openedStringDelimiter: "", delimiter: "", embeddedType: ""}  
        }else if (char !== '\n'){
          prevTokenType = currentTokenType
          currentTokenType = "inline code body"
        }else if (char === '\n' && codeBlockState.embeddedType === "code block"){
          codeBlockState.language = "text"
        }
      }
    }

    if (codeBlockState.language === "js") {
      [prevTokenType, currentTokenType, codeBlockState] = getJsTokenType(char, token, currentTokenType, codeBlockState)
    }else if (codeBlockState.language === "text") {
      [prevTokenType, currentTokenType] = getPlainText(char, token, currentTokenType)
    }
  }
  return [prevTokenType, currentTokenType, codeBlockState]
}
