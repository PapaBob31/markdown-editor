
// Checks if a character falls into a token category that's part of an html tag
export default function getHTMLTokenType(char: string, token: string, currTokenType: string|null) {
  let prevTokenType: any = null
  let endOfTag = false;

  if (currTokenType === "tag delimiter") { // token actually delimits a tag and not a plain text in token format
    if (token === '>' || token === '/>') { // token could be '/' which is not a complete delimiter yet
      endOfTag = true;
      prevTokenType = currTokenType
    }else if ((/\w|\d/).test(char)) { // character following '<' is alphanumeric as in the proper syntax for html tags
      if (token === '<' || token == '</') {
        prevTokenType = currTokenType
        currTokenType = "tag name"
      }
    }else if (char !== '/' || (char === '/' && token !== '<')) {
      endOfTag = true;
      currTokenType = "plain text"
    }
  }else if (currTokenType === "tag name" || currTokenType === "value") {
    if (char === ' ') {
      prevTokenType = currTokenType
      currTokenType = "attribute name"
    }
  }else if (currTokenType === "html attr assignment") {
    if (char !== '>') { // '>' can't be matched cause it could be part of the tag's delimiter
      prevTokenType = currTokenType
      currTokenType = "value"
    }
  }else if (currTokenType === "attribute name") {
    if (char === '=') {
      prevTokenType = currTokenType
      currTokenType = "html attr assignment"
    }
  }else { // The current character is not part of an html tag
    endOfTag = true
    prevTokenType = currTokenType
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
