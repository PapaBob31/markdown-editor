
// Checks if a character falls into a token category that's part of an html tag
export default function getHTMLTokenType(char: string, token: string, currTokenType: string|null) {
  let prevTokenType: any = null
  const htmlTokenTypes = [
    "tag delimiter", "value", "html whitespace", "attribute name", "tag name", "html attr assignment", "invalid html"]

  if (!htmlTokenTypes.includes(currTokenType as string)) { // character that's about to be parsed is not part of an html tag
    return [prevTokenType, currTokenType, true]
  }
  let endOfTag = false;

  if (currTokenType === "tag delimiter") { // token actually delimits a tag and not a plain text in token format
    if (token === '>' || token === '/>') { // token could be '/' which is not a complete delimiter yet
      endOfTag = true;
      prevTokenType = currTokenType
    }else if ((/\w|\d/).test(char)) { // character following '<' is alphanumeric as in the proper syntax for html tags
      if (token === '<' || token === '</') {
        prevTokenType = currTokenType
        currTokenType = "tag name"
      }
    }else if (char !== '/' || (char === '/' && token !== '<')) {
      endOfTag = true;
      currTokenType = "plain text"
    }
  }else if ((" \n").includes(char)) {
    if (currTokenType !== 'html whitespace') {
      prevTokenType = currTokenType
      currTokenType = "html whitespace"
    }
  }else if (currTokenType === "attribute name") {
    if (char === '=') {
      prevTokenType = currTokenType
      currTokenType = "html attr assignment"
    }
  }else if (currTokenType === "html attr assignment") {
    if (char !== '>') { // '>' can't be matched cause it could be part of the tag's delimiter
      prevTokenType = currTokenType
      currTokenType = "value"
    }
  }else if (currTokenType === "html whitespace" || 
    ( currTokenType === "value" && ("\"'").includes(token[0]) ) ||
    currTokenType === "invalid html") {
    if (!("\"'=>").includes(char)) {
      prevTokenType = currTokenType
      currTokenType = "attribute name"
    }else if (currTokenType !== "invalid html" && char !== '>') {
      prevTokenType = currTokenType
      currTokenType = "invalid html"
    }
  }
  return [prevTokenType, currTokenType, endOfTag];
}
  

/**
* Updates unclosed html tags
* @param tagDelimiter - last tag delimiter that was found
* @param token - represents a tag name
* @param openedTags - Array containing the list of all unclosed html tags
*/
export function getOpenedHTMLTagsInfo(tagDelimiter: string, token: string, openedTags: string[]) {
  const VOID_ELEMENTS = ["area", "base", "br", "col", "embed", "hr", "img",
                         "input", "link", "meta", "source", "track", "wbr"]

  const lastIndex = openedTags.length - 1
  if (tagDelimiter === '<') { // token is an opened html tag name
    let element = token.toLowerCase()
    if (!VOID_ELEMENTS.includes(element)) {
      openedTags.push(element); // so we can easily detect later if the tag has been closed
    }
  }else if (tagDelimiter === '</') {
    if (openedTags[lastIndex] === token.toLowerCase()) { // tag names are case insesitive
      openedTags.pop() // removes the opened tag from the array
    }
  }
  return openedTags
}
