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

	let head: Node|null = null;
	let lastNode: Node|null = null;
	for (let i = 0; i < newLineTokens.length; i++) {
		if (newLineTokens[i].startsWith('<code')) {
			if (!lastNode){
				lastNode = {content: newLineTokens[i], type: "code span", closed: true, next: null, prev: null}	
				head = lastNode;
			}else {
				lastNode.next = {content: newLineTokens[i], type: "code span", closed: true, next: null, prev: lastNode}
				lastNode = lastNode.next
			}		
		}else {
			if (lastNode) {
				createLinkedListWith(lastNode, newLineTokens[i])
				lastNode.next && (lastNode = lastNode.next)
			}else {
				lastNode = createLinkedListWith(null, newLineTokens[i])
				head = lastNode;
			}
		}
	}

	if (!head) {
		return "";
	}
	parseLinksIfPresent(head);
	parseStrongAndEm(head);
	return convertLinkedListToText(head);
}

interface Node {
	content: string;
	type: string;
	closed: boolean;
	next: Node|null;
	prev: Node|null;
}

function createLinkedListWith(head: Node|null, text: string) {
	let currNode:Node|null;
	let subHead:Node|null;

	if (head) {
		currNode = head;
		subHead = head
	}else {
		currNode = {content: "", type: "", closed: true, next: null, prev: null} // can this lead to unintended behaviour? check later
		subHead = currNode;
	}
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
		}else if (text[i] === '*' || text[i] == '_') {
			if (currNode.type === "emphasis" && currNode.content === text[i]) {
				currNode.type = "strong";
				currNode.content += text[i]
			}else {
				currNode.next = {content: text[i], type: "emphasis", closed: false, next: null, prev: currNode};
				currNode = currNode.next;
			}
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
	return subHead;
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

function generateLinkNode(linkText: string, destination: string, linkTitle: string): Node {
	let linkNode = {content: "", type: "link", closed: true, next: null, prev: null};
	let uri = destination;
	if (uri[0] === '<' && uri[uri.length - 1] === '>') {
		uri = uri.slice(1, uri.length-1);
	}

	linkText = linkText.replaceAll('\n', ' ');
	if (linkTitle) { // link title
		linkNode.content = `<a href="${uri}" title=${linkTitle}>${linkText}</a>`;
	}else linkNode.content = `<a href="${uri}">${linkText}</a>`;
	return linkNode;
}

function parseLinksIfPresent(listHead: Node) {
	let openedLinkTextMarkers = []
	let currentNode = listHead

	while (true) {
		if (!currentNode) {
			return listHead;
		}
		if (currentNode.content === '[' && !currentNode.closed) {
			openedLinkTextMarkers.push(currentNode);
		}else if (openedLinkTextMarkers.length > 0) {
			if (currentNode.content === ']' && !currentNode.closed && currentNode.type === "marker") {
				let lastIndex = openedLinkTextMarkers.length - 1;
				currentNode.closed = true;
				openedLinkTextMarkers[lastIndex].closed = true
				if (currentNode.next && currentNode.next.content === '(' && currentNode.next.type === "marker") {
					let linkAttributes = getLinkAttributes(currentNode.next)
					if (!linkAttributes) {
						if (openedLinkTextMarkers.length > 1) {
							lastIndex--
						}
						currentNode = openedLinkTextMarkers[lastIndex];
						openedLinkTextMarkers.pop();
					}else {
						let linkText = "";
						if (openedLinkTextMarkers[lastIndex].next !== currentNode) { // prevents [] syntax scenarios
							linkText = convertToText(openedLinkTextMarkers[lastIndex].next as Node, currentNode.prev as Node)
						}
						let linkNode = generateLinkNode(linkText, linkAttributes.destination, linkAttributes.title)
						if (openedLinkTextMarkers[lastIndex].prev) {
							let nodeBeforeLink = openedLinkTextMarkers[lastIndex].prev as Node
							nodeBeforeLink.next = linkNode;
						}
						linkNode.next = linkAttributes.lastNodeWithAtrribute.next;
						openedLinkTextMarkers.forEach(markerNode => {markerNode.closed = true});
						openedLinkTextMarkers = [];
						currentNode = linkAttributes.lastNodeWithAtrribute
					}
				}else if (openedLinkTextMarkers.length === 1) { // this is the only unbalanced brackets so far
					openedLinkTextMarkers.pop();
				}
			}
		}
		currentNode = currentNode.next as Node;
	}
}

function getMatchingMarker(markerArray: Node[], targetMarker: Node) {
	if (markerArray.length == 0) {
		return -1;
	}
	for (let i=markerArray.length-1; i>=0; i--) {
		if (markerArray[i].type === targetMarker.type && markerArray[i].content == targetMarker.content) {
			return i;
		}
	}
	return -1;
}

function convertToInlineTextNode(startNode: Node, endNode: Node|null, contentType: string): Node {
	let newNode = {content: "", type: contentType, closed: true, next: null, prev: null};
	if (contentType === "inline content") {
		newNode.content += startNode.content;
	}
	let currentNode = startNode

	while (true) {
		currentNode = currentNode.next as Node;
		if (currentNode === endNode) {
			if (contentType === "strong") {
				newNode.content = `<strong>${newNode.content}</strong>`
			}else if (contentType === "emphasis") {
				newNode.content = `<em>${newNode.content}</em>`
			}
			return newNode;
		}else {
			newNode.content += currentNode.content
		}
	}
}

// very simple case, will be expanded later
function parseStrongAndEm(listHead: Node) {
	let parsedText = "";
	let openedMarkers:Node[] = []
	let currentNode:Node|null = listHead;

	while (true) {
		if (!currentNode) {
			return null
		}

		if ((["strong", "emphasis"]).includes(currentNode.type) && !currentNode.closed) {
			let matchingMarkerPos = getMatchingMarker(openedMarkers, currentNode);
			if (matchingMarkerPos > -1) {
				let nodeBefore = openedMarkers[matchingMarkerPos].prev;
				let nodeAfter: Node|null = currentNode.next;
				if (nodeBefore) {
					nodeBefore.next = convertToInlineTextNode(openedMarkers[matchingMarkerPos], currentNode, "strong");
					currentNode = nodeBefore.next;
					currentNode.next = nodeAfter;
					openedMarkers = openedMarkers.slice(0, matchingMarkerPos);
				}else {
					currentNode = convertToInlineTextNode(openedMarkers[matchingMarkerPos], currentNode, "strong");
					currentNode.next = nodeAfter;
				}
			}else openedMarkers.push(currentNode);
		}
		currentNode = currentNode.next;
	}
	return null
}

function convertLinkedListToText(listHead: Node): string {
	let parsedText = "";
	let currentNode:Node|null = listHead;

	while (true) {
		if (!currentNode) {
			return parsedText;
		}
		parsedText += currentNode.content;
		currentNode = currentNode.next;
	}
}

// INLINE NODES PARSING STRATEGY

// BACKSLASH
// Any ASCII punctuation character may be backslash-escaped:
// \!\"\#\$\%\&\'\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~
// <p>!&quot;#$%&amp;'()*+,-./:;&lt;=&gt;?@[\]^_`{|}~</p>
// Backslashes before other characters are treated as literal backslashes
// Backslash escapes do not work in code blocks, code spans, autolinks, or raw HTML but they work in all other contexts

/*
	EMPHASIS AND STRONG EMPHASIS PARSING ALGORITHM

define openedEmphasis as number
define openedStrongs as number

if textSegment is * and part of left flanking delimiter run
	openedEmphasis.push(textSegment)
else if textSegment is ** and part of left flanking delimiter run
	openedStrongs.push(textSegment)
else if textSegment is _
	if textSegment is left flanking && (!right flanking || right flanking preceeded by punctuation)
		openedEmphasis.push(textSegment)
else if textSegment is __
	if textSegment is left flanking && (!right flanking || right flanking preceeded by punctuation)
		openedStrongs.push(textSegment)
	else if textSegment is right flanking && (!left flanking || left flanking followed by a punctuation)
		if (openedStrongs)

*/
