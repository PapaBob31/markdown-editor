
// js operators since it's the only supported language for now
const operators = ["...", "in", "new", '~', '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>', "typeof", "void"]

// js keywords since it's the only supported language for now
const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', "do", 'async', "delete",
  'await', 'return', 'if', 'else', 'for', 'class', "=>", "while", "break", "continue", "default",
  "super", "extends", "instanceof", "switch", "case", "finally", "catch", "throw", "debugger", "yield"
]

// js keyWords since it's the only supported language for now
const keywordsValues = ['true', 'false', 'null', 'undefined', "this"]

// Creates a CODE HTML Element and applies the classStr parameter as a class name for styling
function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.append(document.createTextNode(token)) // might break;
  codeElement.className = classStr
  return codeElement;
}

function highlightedMarkDownToken(tokenType:string, token:string) {
  if (tokenType === "escape sequence") {
    return styleCode(token, "text-indigo-200")
  }else if (tokenType === "block list" || tokenType === "block list 1"){
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "ordered list item") {
    return styleCode(token, "text-amber-300")
  }else if (tokenType === "markdown delimiters"){
    return styleCode(token, "") // space and new line don't need styling
  }else if (tokenType === "link delimiter") {
    return styleCode(token, "text-cyan-300")
  }else if (tokenType === "link address") {
    return styleCode(token, "text-sky-600 underline")
  }else if (tokenType === "emphasis|strong") {
    return styleCode(token, "text-purple-400")
  }else if (tokenType === "tag delimiter") {
    return styleCode(token, "text-sky-200")
  }else if (tokenType === "html attr assignment") {
    return styleCode(token, "text-gray-200")
  }else if (tokenType === "value") {
    return styleCode(token, "text-emerald-400")
  }else if (tokenType === "tag name") {
    return styleCode(token, "text-red-400")
  }else if (tokenType === "inline code body") {
    return styleCode(token, "text-white bg-slate-600")
  }else if (tokenType === "code delimiter"){
    return styleCode(token, "text-slate-400")
  }else if (tokenType === "attribute name") {
    return styleCode(token, "text-purple-400")
  }
  return styleCode(token, "text-gray-100") // token is "plain-text"
}

function highlightedJsToken(tokenType:string, token:string) {
  let strippedToken = token.trimEnd()
  if (tokenType === "code type") {
    return styleCode(token, "text-purple-400")
  }else if (tokenType === "comment") {
    return styleCode(token, "text-gray-400")
  }else if (tokenType === "string") {
    return styleCode(token, "text-green-300")
  }else if (tokenType === "regex") {
    return styleCode(token, "text-lime-200")
  }else if (tokenType === "escape sequence") { 
    return styleCode(token, "text-amber-300")
  }else if (tokenType === "delimiter") {
    return styleCode(token, "text-zinc-200")
  }else if (keywords.includes(strippedToken)) {
    return styleCode(token, "text-fuchsia-400")
  }else if (keywordsValues.includes(strippedToken)) {
    return styleCode(token,"text-red-400" )
  }else if (tokenType === "operator" || operators.includes(token.trim())) {
    return styleCode(token, "text-orange-500 font-")
  }else if (tokenType === "possible function call" && !(/^[\d#]/).test(token)) {
    return styleCode(token, "text-sky-500")
  }else { // check if token is a javascript number type

    // All non-greedy matching n at the end of each regex is in case of the bigInt data type in js.
    if ((/^\d+(\.?\d+)?n?$/).test(strippedToken)) { // token is a decimal literal
      return styleCode(token, "text-orange-300")
    }else if ((/^\d+(\.\d+)?e|E\d+(\.\d+)?n?$/).test(strippedToken)) { // exponential literal
      return styleCode(token, "text-amber-300")
    }else if ((/^0o|O[0-7]+n?$/).test(strippedToken)) { // octal literal
      return styleCode(token, "text-yellow-300")
    }else if ((/^0(x|X)[0-9A-Fa-f]+n?$/).test(strippedToken)) { // hexadecimal literal
      return styleCode(token, "text-indigo-300")
    }else if ((/^0(b|B)[01]+$/).test(strippedToken)) { // binary literal
      return styleCode(token, "text-yellow-200")
    }
  }
  return styleCode(token, "text-gray-100")

}

// Generates a CODE HTML Element with a unique styling for a specific token type
export default function highlightedToken(tokenType:string, token:string, language: string) : HTMLElement {
  if (language === "js") {
    return highlightedJsToken(tokenType, token)
  }
  return highlightedMarkDownToken(tokenType, token)
}
