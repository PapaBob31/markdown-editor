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
	totalNested?: number; // for blockquotes
	infoString?: string;
	delimiter?: string;
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
	const hrData = line.match(/^\s{0,3}(\*|-|_)(\s*\1\s*)*$/);
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
	if (rootNode.nodeName === "paragraph") {
		text = `${whiteSpace}<p>${rootNode.textContent}</p>\n`
	}else if (rootNode.nodeName === "fenced code" || rootNode.nodeName === "indented code block") {
		text = `${whiteSpace}<pre class=${rootNode.infoString || ""}>\n${whiteSpace+'  '}<code>${rootNode.textContent}\n${whiteSpace+'  '}</code>\n${whiteSpace}</pre>\n`
	}else {
		if (rootNode.nodeName === "ol") {
			text = `${whiteSpace}<${rootNode.nodeName} start="${rootNode.startNo}">\n`	
		}else text = `${whiteSpace}<${rootNode.nodeName}>\n`;

		if (rootNode.nodeName === "li" && rootNode.children.length === 1) {
			let onlyChild = rootNode.children[rootNode.children.length-1];
			if (onlyChild.nodeName === "paragraph" && !(onlyChild.textContent as string).includes('\n')) {
				text += onlyChild.textContent;
			}else text += `${getInnerHtml(onlyChild, indentLevel+2)}`;
		}else {
			for (const childNode of rootNode.children) {
				text += `${getInnerHtml(childNode, indentLevel+2)}`;
			}
		}
		text += `${whiteSpace}</${rootNode.nodeName}>\n`
	}
	return text;
}

function getBlockNodes(line: string): [string, number] {
	let nodeName;
	let markerPos = line.slice(0,4).indexOf('>');

	if (markerPos > -1) {
		nodeName = "blockquote"
	}else if ((/^\s*```/).test(line)) {
		markerPos = line.indexOf('`');
		nodeName = "code fence";
	}else if (lineIsHorizontalRule(line)){ // hr
		nodeName = "hr";
		markerPos = line.search(/\S/)
	}else if ((markerPos = line.search(/<\/?(?:\w|\d)./)) !== -1) {
		nodeName = "html block"; // possibly
	}else {
		let listMarkerDetails = (/(\s*)(\d{1,9}(?:\.|\)))(\s+)/).exec(line) || (/(\s*)(-|\+|\*)(\s+)/).exec(line);
		if (listMarkerDetails) {
			markerPos = listMarkerDetails[1].length > 0 ? listMarkerDetails[1].length - 1 : listMarkerDetails[1].length;
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
	if (node.nodeName === "main" || node.nodeName === "blockquote" ||
			(node.nodeName === "li" && indentLevel >= (node.indentLevel as number))) {
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
	}else if (node.nodeName === "ul" || node.nodeName === "ol") {
		return getInnerMostOpenContainer(node.children[node.children.length - 1]);
	}else return null;
}

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

	if (lastOpenedNode.nodeName === "li") {
		let nearestValidAncestor = getValidOpenedAncestor(lastOpenedNode, markerPos)
		lastOpenedNode = nearestValidAncestor;		
	}else if (lastOpenedNode.nodeName === "blockquote") {
		if (nodeName === "blockquote" && lastOpenedNode.indentLevel as number - markerPos < 0) {
		// i.e blockquotes nested inside a list won't get parsed together with ones immediately outside the list
			lastOpenedNode = parseLine(line, lastOpenedNode.parentNode);
			return lastOpenedNode;
		}else if (nodeName === "blockquote") {
			let blockQuotesDetails = line.match(/(?:>\s{0,3})+/) as RegExpMatchArray;
			parseLine(line.slice(markerPos+blockQuotesDetails[0].length, line.length), lastOpenedNode);
			return lastOpenedNode;
		}else if (nodeName !== "plain text" && markerPos > 1) {
			let tempParentNode = validListChild(lastOpenedNode, markerPos) as HtmlNode;
			if (tempParentNode) {
				parseLine(line, tempParentNode);
				return lastOpenedNode; // we want to keep the parent blockquote as the last opened node so no further processing is required
			}
		}
	}

	// blockquotes should have their own indent level too inherited from their parents like main and list item
	let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
	if (lastChild && lastChild.nodeName === "html block" && !lastChild.closed) {
		nodeName = "html block" // incase it was list item or plaintext or whatever
	}else if (lastChild && lastChild.nodeName === "fenced code" && !lastChild.closed) {
		nodeName = "fenced code content";
	}else if (markerPos - (lastOpenedNode.indentLevel as number) >= 4) {
		nodeName = "indented code block"
	}

	if (nodeName === "blockquote") {
		let blockQuotesDetails = line.match(/(?:>\s{0,3})+/) as RegExpMatchArray;
		lastOpenedNode.children.push(
			{parentNode: lastOpenedNode, nodeName: "blockquote", closed: false, indentLevel:lastOpenedNode.indentLevel, totalNested: count(blockQuotesDetails[0], '>'), children: []}
		)
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		parseLine(line.slice(markerPos+blockQuotesDetails[0].length, line.length), lastOpenedNode);
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
		lastChild.children.push({parentNode: lastOpenedNode, nodeName: "li", indentLevel: 0, closed: false, children: []})
		lastOpenedNode = lastChild.children[lastChild.children.length - 1];
		let openedNestedNode:HtmlNode = parseLine(line.slice(markerPos + markerWidth), lastOpenedNode);
		lastOpenedNode.indentLevel = markerPos + markerWidth; // actual indent level to be used for nested nodes
		if (lastOpenedNode !== openedNestedNode) {
			lastOpenedNode = openedNestedNode;
		}
	}

	if (nodeName === "code fence" || nodeName === "fenced code content") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		let fenceDetails = line.match(/(`+)(.+)?/) as RegExpMatchArray;
		let fenceLength = fenceDetails[1].length

		if (!lastChild || lastChild.nodeName !== nodeName) {
			let infoString = (fenceDetails[2] || "");
			lastOpenedNode.children.push(
				{parentNode: lastOpenedNode, nodeName: "code fence", fenceLength, closed: false, infoString, children: []}
			)
		}else if (lastChild.nodeName === nodeName && fenceLength === lastChild.fenceLength && !fenceDetails[2]) {
			lastChild.closed = true;
		}else {
			lastChild.textContent += line;
		}
	}

	if (nodeName === "indented code block") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		if (lastChild.nodeName === "indented code block" && !lastChild.closed) {
			lastChild.textContent += line;
		}else if (lastChild.nodeName !== "paragraph" || (lastChild.nodeName === "paragraph" && lastChild.closed)) {
			// TODO: should the initial indented code block line be sliced?
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, textContent:line, children: []})
		}else nodeName = "paragraph";
	}

	if (nodeName === "html block") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length-1];
		if (lastChild.nodeName === "paragraph" && !lastChild.closed) {
			nodeName = "plain text"
		}else if (!lastChild || lastChild.nodeName !== "html block" || lastChild.closed) {
			lastOpenedNode.children.push(
				{parentNode: lastOpenedNode, nodeName: "htmlblock", closed: false, textContent: line, children: []}
			)
		}else lastChild.textContent += '\n'+ line;
	}

	if (nodeName === "plain text"){
		let lastOpenedContainer = getInnerMostOpenContainer(lastOpenedNode);
		if (!lastOpenedContainer) {
			lastOpenedContainer = lastOpenedNode;
		}
		let lastChild = lastOpenedContainer.children[lastOpenedContainer.children.length - 1]
		if (lastChild && lastChild.nodeName === "paragraph" && !lastChild.closed) {
			lastChild.textContent += line
		}else if (!lastChild || lastChild.nodeName !== "paragraph" || lastChild.closed) {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "paragraph", closed: false, textContent: line, children: []})
		}
	}
	return lastOpenedNode;
}

export default function Page({ params }: {params: {slug: string}}) {
	// reference links aren't supported
	const root:HtmlNode = {parentNode: null as any, nodeName: "main", indentLevel: 0, closed: false, children: []}
	const sampleText =
`
- List item 1
- List item 2
- List item 3 with paragraph
embedded in a list item
	1. nested ordered list item inside the list item with a nested paragraph
	2. I'm second sha. Incoming Blockquote

>Blockquote of gfm markdown spec Which says 
>This line is part of the preceeding blockquote by virtue of the start symbol
And so is this line but by virtue of paragraph continuation

And I'm just a stand alone paragraph
`;

	const lines = sampleText.split('\n');
	// I don't really know why I was able to cast null to any so come back to refactor
	let lastOpenedNode: HtmlNode = root; 

	for (let line of lines) {
		lastOpenedNode = parseLine(line, lastOpenedNode);
	}
	
	/* inputStr = "I am a paragraph\n\nSo am I\nNot me Though\n\n#Iwish!\n\n\nI am a paragraph";
	let output:string;
	output = sampleText.replaceAll(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
	output = output.replaceAll(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
	output = output.replaceAll(/\s*?(#+)(.*|\s)?/g, generateHeaders);*/
	// output = output.replaceAll(/\*+(.*?|\s)\*/g, "<b>$1</b>")
	// output = output.replaceAll(/_+(.*?|\s)_/g, "<em>$1</em>")

	function generateHeaders(match:string, headerStr: string, headerBody: string) {
		if (headerStr.length > 6) {
			return `<h6>${headerBody}</h6>`;
		}else if (headerBody) {
			return `<h${headerStr.length}>${headerBody}</h${headerStr.length}>`
		}else return `<h${headerStr.length}></h${headerStr.length}>`
	}
	return (
		<section>
			{/*<section className="w-1/2"></section>*/}
			<pre className="w-100">{getInnerHtml(root, 0)}</pre>
		</section>
	)
}
