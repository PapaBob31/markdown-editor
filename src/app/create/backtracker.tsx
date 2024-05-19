
export function changePrevTokensHighlightColor(index: number, highlightedCode: HTMLElement[]) {
  while (index >= 0) {
    if ((" \n").includes((highlightedCode[index].textContent as string)[0])) {
      break;
    }
    if ((highlightedCode[index].textContent as string)[0] === "*") {
      highlightedCode[index].className = "text-purple-400"
    }else {
      highlightedCode[index].className = "text-white"
    }
    index--;
  }
}

export function changeCurrentTokenType(token: string) {
  let currentTokenType = ""
  if (token[0] === "*") {
    currentTokenType = "emphasis|strong"
  }else currentTokenType = "plain text"
  return currentTokenType;
}

