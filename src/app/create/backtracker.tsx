
/* Changes the highlight color of already highlighted tokens. It starts from 
  a specific token and backtracks until it reaches a token containing whitespace or newlines*/
export function changePrevTokensHighlightColor(index: number, highlightedCode: HTMLElement[]) {
  while (index >= 0) {
    if ((" \n").includes((highlightedCode[index].textContent as string)[0])) { // token contains either whitespace(s) or newline(s)
      break;
    }
    if ((highlightedCode[index].textContent as string)[0] === "*") { // token consists of one or more '*' characters
      highlightedCode[index].className = "text-purple-400"
    }else { // token consists of characters that aren't considered special in the context this fn will be called.
      highlightedCode[index].className = "text-white"
    }
    index--;
  }
}

export function getNewTokenType(token: string) {
  let currentTokenType = ""
  if (token[0] === "*") {
    currentTokenType = "emphasis|strong"
  }else currentTokenType = "plain text"
  return currentTokenType;
}

/* Changes the highlight color of tokens that have already been highlighted */
export default function changeInvalidHighlightColor(token: string, index: number, highlightedCode: HTMLElement[]) {
  if (token[0] !== ' ' && token[0] !== '\n') {
    changePrevTokensHighlightColor(index, highlightedCode);
  }
  return getNewTokenType(token)
}
