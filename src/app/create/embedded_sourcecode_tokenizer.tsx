import { getJsTokenType, getPlainText } from "./prog_lang_tokenizer"
const acceptedLanguages = ["js"]

// Used to get the token type which will be used to highlight embedded code blocks inside markdown
export default function getCodeBlockTokenTypes(char: string, token: string, currentTokenType: string, codeBlockState: any) {
  let prevTokenType: any = null
  
  if (codeBlockState.embeddedType === "code span") {
    if (token === codeBlockState.delimiter) {
      codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}
      currentTokenType = "code delimiter"
    }
  }else if (token[0] === '\n') {
    if ((token.slice(1, token.length) === codeBlockState.delimiter) && char === '\n') {
      codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}
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
        codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}
      }
    }else if (!codeBlockState.delimiter) {
      if (char !== '`' && char) {
        codeBlockState.delimiter = token
        if (token.length <= 2 && char === '\n') {
          codeBlockState = {language: "", openedContainer: "", delimiter: "", embeddedType: ""}  
        }else if (char !== '\n'){
          prevTokenType = currentTokenType
          if (token.length <= 2) {
            codeBlockState.embeddedType = "code span"
          }
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
