
// Checks if char parameter indicates an html block element
// Returns current token type
export default function getTokenTypeIfBlockElement(char: string, token: string, currTokenType: string) {
  let prevTokenType: any = currTokenType;
  let normalParsing = false;

  if (("-+#>=").includes(char)) {
    if (currTokenType !== 'block list') {
      currTokenType = 'block list'
    }
  }else if (("0123456789.").includes(char)) {
    if (char === '.' && !(/^\d+$/).test(token)) {
      normalParsing = true;
    }else if (char !== '.') {
      if (currTokenType !== 'ordered list item') {
        currTokenType = 'ordered list item'
      }else if ((/^\d+\.$/).test(token)) {
        normalParsing = true;
      }
    }
  }else if (char === '*') {
    if (currTokenType !== 'block list 1') {
      currTokenType = 'block list 1'
    }
  }else if (char === " " || char === "\n"){
    if (currTokenType !== 'markdown delimiters') {
      currTokenType = 'markdown delimiters'
    }
  }else {
    normalParsing = true;
  }
  prevTokenType = (prevTokenType === currTokenType) ? null : prevTokenType;

  return [prevTokenType, currTokenType, normalParsing]
}
