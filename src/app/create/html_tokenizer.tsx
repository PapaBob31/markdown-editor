export default function getHTMLTokenType(char: string, token: string, currTokenType: string|null) {
  let prevTokenType: any = null
  let endOfTag = false;

  if (currTokenType === "tag delimiter") {
    if (token === '>' || token === '/>') {
      endOfTag = true;
      prevTokenType = currTokenType
    }else if ((/\w|\d/).test(char)) {
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
    if (char !== '/' && char !== '>') { // currTokenType and PrevTokenType will still be modified if char is '/' or '>'
      prevTokenType = currTokenType
      currTokenType = "value"
    }
  }else if (currTokenType === "attribute name") {
    if (char === '=') {
      prevTokenType = currTokenType
      currTokenType = "html attr assignment"
    }
  }else {
    endOfTag = true
    prevTokenType = currTokenType
  }
  return [prevTokenType, currTokenType, endOfTag];
}

// updates the state of openedTags
export function getOpenedHTMLTagsInfo(tagDelimiter: string, token: string, prevTokenType: string, openedTags: string[]) {
  if (prevTokenType === "tag name") {
    if (tagDelimiter === '<') { // token is an opened html tag name
      openedTags.push(token.toLowerCase()) // so we can easily detect later if the tag has been closed
    }else if (tagDelimiter === '</') {
      if (openedTags[openedTags.length - 1] === token.toLowerCase()) { // tag names are case insesitive
        openedTags.pop() // removes the opened tag from the array
      }
    }
  }else if (tagDelimiter === "/>") {
    openedTags.pop() // removes the last void tag that was classified as an opened tag 
  }

  return openedTags
}
