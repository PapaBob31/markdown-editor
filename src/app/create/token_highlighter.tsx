
const operators = ["...", "in", "new", '~', '+', '!', '?', '%', '-', '/', '*', '^', '|', '&', '=', '<', '>', "typeof", "void"]

const keywords = [
  'let', 'const', 'var', 'from', 'import', 'export', 'default', 'function', "do", 'async', "delete",
  'await', 'return', 'if', 'else', 'for', 'class', "=>", "while", "break", "continue", "default",
  "super", "extends", "instanceof", "switch", "case", "finally", "catch", "throw", "debugger"
]
const keywordsValues = ['true', 'false', 'null', 'undefined', "this"]



// Creates a CODE HTML Element and applies the classStr parameter as a class name for styling
function styleCode(token: string, classStr: string) {
  let codeElement = document.createElement("code")
  codeElement.append(document.createTextNode(token)) // might break;
  codeElement.className = classStr
  return codeElement;
}

// Generates a CODE HTML Element with a unique styling for a specific token type
export default function highlightedToken(tokenType:string, token:string) {
  let tokenPrime = token.trimEnd()
  if (tokenType === "escape sequence") {
    return styleCode(token, "text-pink-300")
  }else if (tokenType === "block list" || tokenType === "block list 1"){
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "ordered list item") {
    return styleCode(token, "text-amber-300")
  }else if (tokenType === "markdown delimiters" ){
    return styleCode(token, "")
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
  }else if (tokenType === "tag name") {
    return styleCode(token, "text-red-400")
  }else if (tokenType === "inline code body") {
    return styleCode(token, "text-white bg-slate-600")
  }else if (tokenType === "code delimiter"){
    return styleCode(token, "text-slate-400")
  }else if (tokenType === "plain text") {
    return styleCode(token, "text-white")
  }else if (tokenType === "code type" || tokenType === "attribute name") {
    return styleCode(token, "text-purple-400")
  }else if (tokenType === "comment") {
    return styleCode(token, "text-gray-400")
  }else if (tokenType === "string" || tokenType === "value") {
    return styleCode(token, "text-green-400")
  }else if (keywords.includes(tokenPrime)) {
    return styleCode(token, "text-purple-400")
  }else if (keywordsValues.includes(tokenPrime)) {
    return styleCode(token,"text-red-400" )
  }else if (tokenType === "operator" || operators.includes(token.trim())) {
    return styleCode(token, "text-amber-500")
  }else if (tokenType === "delimiter") {
    return styleCode(token, "text-zinc-200")
  }else if (tokenType === "possible function call" && !(/^[\d#]/).test(token)) {
    return styleCode(token, "text-sky-500")
  }else if (tokenType === "regex") {
    return styleCode(token, "text-green-300")
  }else if ((/^\d+(\.?\d+)?n?$/).test(tokenPrime)) { // token is a decimal literal
    return styleCode(token, "text-orange-300")
  }else if ((/^\d+(\.\d+)?e|E\d+(\.\d+)?n?$/).test(tokenPrime)) { // token is an exponential literal
    return styleCode(token, "text-amber-300")
  }else if ((/^0o|O[0-7]+n?$/).test(tokenPrime)) { // token is an octal literal
    return styleCode(token, "text-yellow-300")
  }else if ((/^0(x|X)[0-9A-Fa-f]+n?$/).test(tokenPrime)) { // token is an hexadecimal literal
    return styleCode(token, "text-indigo-300")
  }else if ((/^0(b|B)[01]+$/).test(tokenPrime)) { // binary
    return styleCode(token, "text-yellow-200")
  }
  return styleCode(token, "text-white")
}
