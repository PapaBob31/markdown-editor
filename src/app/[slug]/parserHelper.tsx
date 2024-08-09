import type {HtmlNode} from "./page"
import {lineIsHorizontalRule} from "./utilities"

// human-friendly as well as browser-friendly html syntax generator
export function createInnerHtml(rootNode: HtmlNode, indentLevel: number):string {
	let text = "";
	const whiteSpace = ' '.repeat(indentLevel);
	if (rootNode.nodeName === "paragraph" || (/h[1-6]/).test(rootNode.nodeName)) {
		rootNode.textContent = parseInlineNodes(rootNode.textContent as string);
	}
	if (rootNode.nodeName === "html block") {
		text = `${whiteSpace}${rootNode.textContent}\n`
	}else if (rootNode.nodeName === "paragraph") {
		text = `${whiteSpace}<p>${rootNode.textContent}</p>\n`
	}else if (rootNode.nodeName === "fenced code" || rootNode.nodeName === "indented code block") {
		text = `${whiteSpace}<pre class=${rootNode.infoString || ""}>\n${whiteSpace+'  '}<code>${rootNode.textContent}\n${whiteSpace+'  '}</code>\n${whiteSpace}</pre>\n`
	}else if (["hr"].includes(rootNode.nodeName)) {
		text = `${whiteSpace}<${rootNode.nodeName}>\n`	
	}else {
		if (rootNode.nodeName === "ol") {
			text = `${whiteSpace}<${rootNode.nodeName} start="${rootNode.startNo}">\n`	
		}else text = `${whiteSpace}<${rootNode.nodeName}>\n`;

		if (rootNode.nodeName === "li" && rootNode.children.length === 1) {
			let onlyChild = rootNode.children[rootNode.children.length-1];
			if (onlyChild.nodeName === "paragraph" && !(onlyChild.textContent as string).includes('\n')) {
				text += onlyChild.textContent;
			}else text += `${createInnerHtml(onlyChild, indentLevel+2)}`;
		}else if (rootNode.children.length >= 1){
			for (const childNode of rootNode.children) {
				text += `${createInnerHtml(childNode, indentLevel+2)}`;
			}
		}else if (!rootNode.children.length) text += rootNode.textContent;
		text += `${whiteSpace}</${rootNode.nodeName}>\n`
	}
	return text;
}

export function getBlockNodes(line: string): [string, number] {
	let nodeName;
	let markerPos = line.slice(0,4).indexOf('>');

	if (markerPos > -1) {
		nodeName = "blockquote"
	}else if ((/\s*#{1,6}\s/).test(line)) {
		markerPos = line.indexOf('#')
		nodeName = "header"
	}else if ((/^\s*`{3,}[^`]*$/).test(line)) {
		markerPos = line.indexOf('`');
		nodeName = "fenced code";
	}else if (lineIsHorizontalRule(line)){ // hr
		nodeName = "hr";
		markerPos = line.search(/\S/)
	}else if ((markerPos = line.search(/<\/?(?:\w|\d)./)) !== -1) {
		nodeName = "html block"; // possibly
	}else {
		let listMarkerDetails = (/^(\s*)(\d{1,9}(?:\.|\)))(\s+)/).exec(line) || (/^(\s*)(-|\+|\*)(\s+)/).exec(line);
		if (listMarkerDetails) {
			markerPos = listMarkerDetails[1].length;
			if (("+-*").includes(listMarkerDetails[2])) {
				nodeName = "ul-li"
			}else nodeName = "ol-li";
		}else {
			nodeName = "plain text";
			markerPos = line.search(/\S/);
		};
	}
	
	return [nodeName, markerPos];
}

export function parseInlineNodes(line: string): string {
	let newLineTokens:string[] = []

	let startIndex = 0;
	while (true) {
		let startToken = (/`+/).exec(line.slice(startIndex));
		let endToken: any;

		if (startToken) {
			let endPattern = new RegExp("(?<!`)"+startToken[0]+"(?!`)");
			endToken = endPattern.exec(line.slice(startIndex+startToken.index+startToken[0].length));
			if (!endToken){
				newLineTokens.push(line.slice(startIndex, startIndex+startToken.index+startToken[0].length))
				startIndex = startIndex+startToken.index+startToken[0].length;
				continue;
			}
		}else {
			newLineTokens.push(line.slice(startIndex))
			break;
		}
		if (startToken && endToken) {
			let tempStartIndex = startIndex+startToken.index+startToken[0].length;
			let codeSpan = line.slice(tempStartIndex, tempStartIndex + endToken.index)
			codeSpan = codeSpan.replaceAll(/(?:\n|\r\n)/g, " "); // as per gfm markdown spec
			if ((codeSpan[0] === codeSpan[codeSpan.length - 1]) && codeSpan[0] === ' ') {
				codeSpan = codeSpan.slice(1, codeSpan.length - 1).replaceAll('&', '&amp;');
			}
			newLineTokens.push(line.slice(startIndex, startIndex+startToken.index))
			newLineTokens.push(`<code>${codeSpan}</code>`)
			startIndex = tempStartIndex + endToken.index + endToken[0].length;
		}else continue; // execution should never reach here but allow
	}

	for (let i = 0; i < newLineTokens.length; i++) {
		if (!newLineTokens[i].startsWith('<code')) {
			const head = createLinkedListWith(newLineTokens[i])
			newLineTokens[i] = parseLinksIfPresent(head);
		}
	}
	return newLineTokens.join('');
}

interface Node {
	content: string;
	type: string;
	closed: boolean;
	next: Node|null;
	prev: Node|null;
}

function createLinkedListWith(text: string) {
	const head: Node = {content: "", type: "", closed: false, next: null, prev: null}
	let currNode: Node = {content: "", type: "", closed: false, next: null, prev: head}
	head.next = currNode;
	let charIsEscaped = false

	for (let i=0; i<text.length; i++) {
		if (charIsEscaped && ("[]()\\").includes(text[i])) {
			if (currNode.type !== "inline content") {
				currNode.next = {content: text[i], type: "inline content", closed: true, next: null, prev: currNode};
				currNode = currNode.next;
			}
			currNode.content += text[i];
			charIsEscaped = false;
		}else if (text[i] === '\\') {
			charIsEscaped = true
		}else if ((/\s/).test(text[i])) {
			if (currNode.type !== "white space") {
				currNode.next = {content: text[i], type: "white space", closed: true, next: null, prev: currNode};
				currNode = currNode.next;
			}else {
				currNode.content += text[i];
			}
		}else if (("[()]").includes(text[i])) {
			currNode.next = {content: text[i], type: "marker", closed: false, next: null, prev: currNode};
			currNode = currNode.next;
		}else if (currNode.type === "inline content") {
			currNode.content += text[i];
		}else {
			currNode.next = {content: text[i], type: "inline content", closed: true, next: null, prev: currNode};
			currNode = currNode.next;
		}
	}
	return head;
}

function proper(titleText: string) {
	let lastIndex = titleText.length - 1
	if (titleText.includes('\n\n')) {
		return false;
	}else if (titleText[0] === "'" && titleText[lastIndex] === "'")  {
		return true
	}else if (titleText[0] === '"' && titleText[lastIndex] === '"') {
		return true
	}else if (titleText[0] === '(' && titleText[lastIndex] === ')') {
		return true
	}
	return false;
}


function getLinkAttributes(startNode: Node) {
	let partBeingProcessed = "link destination";
	let linkDestination = "";
	let linkTitle = "";
	let unclosedParenthesis = 0
	let currentNode = startNode.next as Node;

	if (!currentNode) {
		return null
	}

	while (true) {
		if (partBeingProcessed === "link destination") {
			if (currentNode.type === "white space") {
				if (linkDestination && linkDestination[0] !== '<') {
					partBeingProcessed = "link title"
				}else if (linkDestination[0] === '<' && currentNode.content.includes('\n')) {
					return null
				}else if (!linkDestination && currentNode.next) {
					currentNode = currentNode.next;
					continue;
				}else if (!currentNode.next) {
					return null
				}
			}else if (currentNode.content === '(' && currentNode.type === "marker") {
				unclosedParenthesis++;
			}else if (currentNode.content === ')' && currentNode.type === "marker") {
				if (unclosedParenthesis > 0) {
					unclosedParenthesis--
				}else {
					return {destination: linkDestination, title: "", lastNodeWithAtrribute: currentNode}
				}
			}
			linkDestination += currentNode.content
		}else if (partBeingProcessed === "link title") {
			if (!linkTitle && currentNode.type === "white space") {
				if (currentNode.next) {
					currentNode = currentNode.next
					continue;
				}else {
					return null
				}
			}else if (!linkTitle && !("\"'(").includes(currentNode.content[0])) {
				return null
			}
			linkTitle += currentNode.content;
			if (proper(linkTitle)) {
				partBeingProcessed = "attributes delimiter"
			}
		}else {
			if (currentNode.content === ')' && currentNode.type === "marker") {
				return {destination: linkDestination, title: linkTitle, lastNodeWithAtrribute: currentNode}
			}else if (currentNode.type !== "white space") {
				return null
			}
		}
		if (!currentNode.next) {
			return null
		}
		currentNode = currentNode.next;
	}
}


function convertToText(startNode: Node, stopNode: Node) {
	let currentNode = startNode
	let text = ""

	while (true) {
		text += currentNode.content
		if (currentNode === stopNode) {
			break;
		}else currentNode = currentNode.next as Node;
	}
	return text;
}

function parseLinksIfPresent(listHead: Node) {
	let parsedText = "";
	let linkTextEndNode;
	let unBalancedBrackets = 0;
	let openedLinkTextMarkers = []
	let currentNode = listHead

	while (true) {
		if (!currentNode) {
			return parsedText
		}
		if (currentNode.content === '[' && !currentNode.closed) {
			openedLinkTextMarkers.push(currentNode);
		}

		if (openedLinkTextMarkers.length > 0) {
			if (currentNode.content === ']' && !currentNode.closed) {
				let lastIndex = openedLinkTextMarkers.length - 1;
				currentNode.closed = true;
				openedLinkTextMarkers[lastIndex].closed = true
				if (currentNode.next && currentNode.next.content === '(' && currentNode.type === "marker") {
					let linkAttributes = getLinkAttributes(currentNode.next)
					if (!linkAttributes) {
						if (openedLinkTextMarkers.length > 1) {
							lastIndex--
						}else parsedText += openedLinkTextMarkers[lastIndex].content; // so that it's content won't get omitted
						currentNode = openedLinkTextMarkers[lastIndex];
						openedLinkTextMarkers.pop();
					}else {
						let linkText = "";
						if (openedLinkTextMarkers[lastIndex].next !== currentNode) { // prevents [] syntax scenarios
							linkText = convertToText(openedLinkTextMarkers[lastIndex].next as Node, currentNode.prev as Node)
						}
						let textBefore = "";
						if (openedLinkTextMarkers.length > 1) {
							textBefore = convertToText(openedLinkTextMarkers[0], openedLinkTextMarkers[lastIndex].prev as Node);
						}
						openedLinkTextMarkers.forEach(markerNode => {markerNode.closed = true});
						openedLinkTextMarkers = [];
						parsedText += textBefore + generateLink(linkText, linkAttributes.destination, linkAttributes.title)
						currentNode = linkAttributes.lastNodeWithAtrribute
					}
				}else if (openedLinkTextMarkers.length === 1) { // this is the only unbalanced brackets so far
					let lastIndex = openedLinkTextMarkers.length - 1;
					parsedText += convertToText(openedLinkTextMarkers[lastIndex], currentNode)
					openedLinkTextMarkers.pop();
				}
			}
		}else {
			parsedText += currentNode.content;
		}
		currentNode = currentNode.next as Node;
	}
	return parsedText
}

function generateLink(linkText: string, destination: string, linkTitle: string): string {
	let uri = destination;
	if (uri[0] === '<' && uri[uri.length - 1] === '>') {
		uri = uri.slice(1, uri.length-1);
	}
	linkText = linkText.replaceAll('\n', ' ');
	if (linkTitle) { // link title
		return `<a href="${uri}" title=${linkTitle}>${linkText}</a>`
	}
	return `<a href="${uri}">${linkText}</a>`
}

// INLINE NODES PARSING STRATEGY

// BACKSLASH
// Any ASCII punctuation character may be backslash-escaped:
// \!\"\#\$\%\&\'\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~
// <p>!&quot;#$%&amp;'()*+,-./:;&lt;=&gt;?@[\]^_`{|}~</p>
// Backslashes before other characters are treated as literal backslashes
// Backslash escapes do not work in code blocks, code spans, autolinks, or raw HTML but they work in all other contexts
