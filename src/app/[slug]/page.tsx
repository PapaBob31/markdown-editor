"use client"

// Make it Work. Make it pretty. Make it fast
import { useRef, useEffect } from "react"

interface HtmlNode {
	parentNode: HtmlNode;
	nodeName: string;
	textContent?: string;
	closed?: boolean;
	children: HtmlNode[];
	indentLevel?: number;
	fenceLength?: number;
	infoString?: string;
	startNo?: string;
}

function getHtmlNode(htmlNode: HtmlNode) {
	let htmlEl: HTMLElement;
	if (htmlNode.nodeName === "fenced code block" || htmlNode.nodeName === "indented code block") {
		htmlEl = document.createElement("pre");
		htmlEl.textContent = htmlNode.textContent as string;
	}else if (htmlNode.nodeName === "paragraph") {
		htmlEl = document.createElement("p");
		htmlEl.textContent = htmlNode.textContent as string;
	}else {
		htmlEl = document.createElement(htmlNode.nodeName);
		htmlNode.children.forEach(node => {
			htmlEl.appendChild(getHtmlNode(node));
		})
	}
	return htmlEl;
}

function lineIsHorizontalRule(line: string) {
	const hrData = line.match(/^\s*(\*|-|_)(\s*\1\s*)*$/);
	let charCount = 0;
	if (!hrData) {
		return false
	}
	for (let char of line) {
		if (char === hrData[1]) {
			charCount++;
		}
		if (charCount === 3) return true;
	}

	return false
}

function getInnerHtml(rootNode: HtmlNode, indentLevel: number):string {
	let text = "";
	const whiteSpace = ' '.repeat(indentLevel);
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
			}else text += `${getInnerHtml(onlyChild, indentLevel+2)}`;
		}else if (rootNode.children.length >= 1){
			for (const childNode of rootNode.children) {
				text += `${getInnerHtml(childNode, indentLevel+2)}`;
			}
		}else if (!rootNode.children.length) text += rootNode.textContent;
		text += `${whiteSpace}</${rootNode.nodeName}>\n`
	}
	return text;
}

function getBlockNodes(line: string): [string, number] {
	let nodeName;
	let markerPos = line.slice(0,4).indexOf('>');

	if (markerPos > -1) {
		nodeName = "blockquote"
	}else if ((/\s*#{1,6}\s/).test(line)) {
		markerPos = line.indexOf('#')
		nodeName = "header"
	}else if ((/^\s*```/).test(line)) {
		markerPos = line.indexOf('`');
		nodeName = "fenced code";
	}else if (lineIsHorizontalRule(line)){ // hr
		nodeName = "hr";
		markerPos = line.search(/\S/)
	}else if ((markerPos = line.search(/<\/?(?:\w|\d)./)) !== -1) {
		nodeName = "html block"; // possibly
	}else {
		let listMarkerDetails = (/(\s*)(\d{1,9}(?:\.|\)))(\s+)/).exec(line) || (/(\s*)(-|\+|\*)(\s+)/).exec(line);
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

// get node's ancestor with the same level of indentation
function getValidOpenedAncestor(node: HtmlNode, indentLevel: number): HtmlNode {
	if (node.nodeName === "main" || (node.nodeName === "li" && indentLevel >= (node.indentLevel as number))) {
		return node;
	}else {
		return getValidOpenedAncestor(node.parentNode, indentLevel);
	}
}

// get node's list child with the same level of indentation as indentLevel
function validListChild(node: HtmlNode, indentLevel: number): HtmlNode|null {
	if (node.nodeName === "li" && indentLevel - (node.indentLevel as number) >= 0 ) {
		return node;
	}else if (node.children.length === 0) {
		return null
	}else {
		let lastChild = node.children[node.children.length - 1]; // cause only the last child can still be opened
		return validListChild(lastChild, indentLevel);
	}
}

function count(text:string, targetChar:string) {
	let count = 0;
	for (let char of text) {
		if (char === targetChar) {
			count++;
		}
	}
	return count;
}

function getInnerMostOpenContainer(node:HtmlNode):HtmlNode|null {
	if ((node.nodeName === "blockquote" || node.nodeName === "li") && !node.closed) {
		let lastChildNode = node.children[node.children.length - 1];
		if (lastChildNode && ["ul", "ol"].includes(lastChildNode.nodeName)){
			return getInnerMostOpenContainer(lastChildNode);
		}
		return node;
	}else if (node.nodeName === "ul" || node.nodeName === "ol" || node.nodeName === "main") {
		if (!node.children[node.children.length - 1]) {
			return null
		}
		return getInnerMostOpenContainer(node.children[node.children.length - 1]);
	}else return null;
}


function parseInlineNodes(line: string): string {
	line = line.replaceAll(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
	line = line.replaceAll(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
	line = line.replaceAll(/(\*|_)(.+)?\1/g, '<em>$2</em>');
	line = line.replaceAll(/(\*|_)+(.+)?\1/g, '<strong>$2</strong>');
	line = line.replaceAll(/(`+)(.+)?\1/g, '<pre><code>$2</code></pre>');
	return line;
}


// TODO: parse inlines, fix nested blockquotes bug, backlash escapes, proper tab to spaces conversion
function parseLine(line: string, lastOpenedNode: HtmlNode) {
	if (line.search(/\S/) === -1) {
		let lastOpenedContainer = getInnerMostOpenContainer(lastOpenedNode);
		if (!lastOpenedContainer) {
			lastOpenedContainer = lastOpenedNode;
		}
		if (lastOpenedContainer.nodeName === "blockquote") { // closing a blockquote closes all nested shi
			lastOpenedContainer.closed = true;
		}else {
			let lastOpenedChild = lastOpenedContainer.children[lastOpenedContainer.children.length - 1]
			if (!lastOpenedChild) {
				return lastOpenedNode;
			}else if (lastOpenedChild.nodeName === "paragraph" || lastOpenedChild.nodeName === "html block") {
				lastOpenedChild.closed = true;
			}else if (lastOpenedChild.nodeName === "li" && lastOpenedChild.children.length === 0) { // blank lines shouldn't be nested inside list items twice
				lastOpenedNode = lastOpenedNode.parentNode.parentNode; // Don't want to stop at the ordered/unorderd list parent
			}
		}
		if (lastOpenedNode.closed) { // blockquotes
			return lastOpenedNode.parentNode
		}else return lastOpenedNode;
	}

	let [nodeName, markerPos] = getBlockNodes(line);

	if (lastOpenedNode.nodeName === "li" && nodeName !== "plain text") {
		lastOpenedNode = getValidOpenedAncestor(lastOpenedNode, markerPos);
	}else if (lastOpenedNode.nodeName === "blockquote" && nodeName !== "plain text" ) {
		if (nodeName === "blockquote" && lastOpenedNode.indentLevel as number - markerPos < 0) {
		// i.e blockquotes nested inside a list won't get parsed together with ones immediately outside the list
			lastOpenedNode = parseLine(line, lastOpenedNode.parentNode);
			return lastOpenedNode;
		}else if (nodeName === "blockquote" && lastOpenedNode.parentNode !== null) {
			// let blockQuotesDetails = line.match(/(?:>\s{0,3})+/) as RegExpMatchArray;
			// indentLevel is set to zero && parentNode to null to make all nested nodes believe it's actually root
			let parentNode = {...lastOpenedNode, indentLevel: 0, parentNode: null as any}
			parseLine(line.slice(markerPos+1), parentNode);
			return lastOpenedNode; // we want to keep the parent blockquote as the last opened node so no further processing is required
		}else if (lastOpenedNode.parentNode === null) {
			if (markerPos > 1) {
				let tempParentNode = validListChild(lastOpenedNode, markerPos) as HtmlNode;
				if (tempParentNode) {
					parseLine(line, tempParentNode);
					return lastOpenedNode; // we want to keep the parent blockquote as the last opened node so no further processing is required
				}
			}
		}else {
			lastOpenedNode.closed = true;
			lastOpenedNode = getValidOpenedAncestor(lastOpenedNode, markerPos);
		}
	}

	if (nodeName === "hr") {
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, children: []})
	}

	if (nodeName === "header") {
		let headerDetails = line.match(/(\s*)(#+)\s/)
		if (headerDetails) {
			let ph = headerDetails[1].length;
			let hl = headerDetails[2].length;
			line = parseInlineNodes(line);
			lastOpenedNode.children.push( // TODO: content should be parsed incase of inlines first
				{parentNode: lastOpenedNode, nodeName: `h${hl}`, textContent: line.slice(hl + ph), children: []}
			)
		}
	}

	if (nodeName === "plain text") {
		let lastOpenedContainer = getInnerMostOpenContainer(lastOpenedNode) // incase lastOpenedNode is a blockquote
		if (!lastOpenedContainer) {
			lastOpenedContainer = lastOpenedNode
		}
		let lastChild = lastOpenedContainer.children[lastOpenedContainer.children.length - 1];
		if (lastChild && lastChild.nodeName === "paragraph" && !lastChild.closed) {
			line = parseInlineNodes(line);
			lastChild.textContent += line // paragraph continuation line
			return lastOpenedNode;
		}else if (lastOpenedNode.parentNode) {
			lastOpenedNode = getValidOpenedAncestor(lastOpenedNode, markerPos);
		}
	}

	let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
	if (lastChild && lastChild.nodeName === "fenced code" && !lastChild.closed) {
		nodeName = "fenced code"
	}else if (lastChild && lastChild.nodeName === "html block" && !lastChild.closed) {
		nodeName = "html block"
	}else if (markerPos - (lastOpenedNode.indentLevel as number) >= 4) {
		nodeName = "indented code block"
	}else if (nodeName === "plain text") {
		line = parseInlineNodes(line);
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "paragraph", closed: false, textContent: line, children: []})
	}

	if (nodeName === "blockquote") {
		lastOpenedNode.children.push(
			{parentNode: lastOpenedNode, nodeName: "blockquote", closed: false, indentLevel:lastOpenedNode.indentLevel, children: []}
		)
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		parseLine(line.slice(markerPos+1), lastOpenedNode);
	}

	if (nodeName === "ol-li" || nodeName === "ul-li") {
		let parentNodeName = ""; // list parent node name as in ordered or unordered
		if (nodeName === "ol-li") {
			parentNodeName = "ol"
		}else parentNodeName = "ul"

		let markerWidth;
		let listItemPattern = line.match(/(\s*)(\d{1,9}(\.|\)))(\s*)/) || line.match(/(\s*)(\*|\+|-)(\s*)/) as RegExpMatchArray;
		if (listItemPattern[3].length >= 4) {
			markerWidth = listItemPattern[2].length + 1;
		}else markerWidth = listItemPattern[2].length + listItemPattern[3].length;

		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		if (!lastChild || lastChild.nodeName !== parentNodeName) {
			let startNo = (parentNodeName === "ol" ? listItemPattern[2] : "");
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: parentNodeName, closed: false, startNo, children: []})
			lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
		// indent level should temporarily be zero for text on the same line as the list marker to prevent wrong indent usage
		lastChild.children.push({parentNode: lastChild, nodeName: "li", indentLevel: 0, closed: false, children: []})
		lastOpenedNode = lastChild.children[lastChild.children.length - 1];

		let openedNestedNode:HtmlNode = parseLine(line.slice(markerPos + markerWidth), lastOpenedNode);
		lastOpenedNode.indentLevel = markerPos + markerWidth; // actual indent level to be used for nested nodes
		if (lastOpenedNode !== openedNestedNode) {
			lastOpenedNode = openedNestedNode;
		}
	}

	if (nodeName === "fenced code") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		let fenceDetails = line.match(/(`+)(.+)?/) as RegExpMatchArray;

		if (fenceDetails) {
			let fenceLength = fenceDetails[1].length
			if (!lastChild || lastChild.nodeName !== nodeName) {
				let infoString = (fenceDetails[2] || "");
				lastOpenedNode.children.push(
					{parentNode: lastOpenedNode, nodeName: "fenced code", fenceLength, closed: false, infoString, children: []}
				)
			}else if (((lastChild.fenceLength as number) <= fenceLength) && !fenceDetails[2]) {
				lastChild.closed = true;
			}else lastChild.textContent += '\n' + line;
		}else {
			lastChild.textContent += '\n' + line;
		}
	}

	if (nodeName === "indented code block") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		if (lastChild.nodeName === "indented code block" && !lastChild.closed) {
			lastChild.textContent += '\n'+ line;
		}else{
			// TODO: should the initial indented code block line be sliced?
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, textContent:line, children: []})
		}
	}

	if (nodeName === "html block") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length-1];
		if (!lastChild || lastChild.nodeName !== "html block" || lastChild.closed) {
			lastOpenedNode.children.push(
				{parentNode: lastOpenedNode, nodeName: "html block", closed: false, textContent: line, children: []}
			)
		}else lastChild.textContent += '\n'+ line;
	}

	return lastOpenedNode;
}

export default function Page({ params }: {params: {slug: string}}) {
	// reference links aren't supported
	// find out ways to deal with tabs used for indentation
	const root:HtmlNode = {parentNode: null as any, nodeName: "main", indentLevel: 0, closed: false, children: []}
	const sampleText =
`
# header 1
## header 2
##oops not an header but a paragraph
- List item 1
- List item 2
  *****
- List item 3 with paragraph 
embedded in a list item
  1. nested ordered list item inside the list item with a nested paragraph
  2. I'm second sha. Incoming Blockquote

>>Blockquote of gfm markdown spec Which says 
>This line is part of the preceeding blockquote by virtue of the start symbol
And so is this line but by virtue of paragraph continuation
> - Nested unordered list item
>   *****
\`\`\`js
let fencedCode = true
console.log("Inside a fenced code block")
\`\`\`

And I'm just a stand alone paragraph 
that ends here

*****
![img_name](img_link)
\`normal code span na\`

<div>
html block without an actual delimiter

*emphasized text*
me too

who dey close am abeg

    and now for my final trick
    I don't know the programming language but 
    this feels like a lot of syntax errors
`;

	const lines = sampleText.split('\n');
	// I don't really know why I was able to cast null to any so come back to refactor
	let lastOpenedNode: HtmlNode = root; 

	for (let line of lines) {
		lastOpenedNode = parseLine(line, lastOpenedNode);
	}

	return (
		<section>
			{/*<section className="w-1/2"></section>*/}
			<pre className="w-100">{getInnerHtml(root, 0)}</pre>
		</section>
	)
}
