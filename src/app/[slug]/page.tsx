"use client"

// Make it Work. Make it pretty. Make it fast
import { useRef, useEffect } from "react"

interface HtmlNode {
	parentNode: HtmlNode;
	nodeName: string;
	textContent?: string;
	closed: boolean;
	children: HtmlNode[];
	indentLevel?: number;
	fenceLength?: number;
	totalNested?: number; // for blockquotes
	infoString?: string;
	delimiter?: string;
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

function getBlockNodes(line: string): [string, number] {
	let nodeName;
	let markerPos = line.slice(0,4).indexOf('>');

	if (markerPos > -1) {
		nodeName = "blockquote"
	}else if ((/^\s{4,}\S/).test(line)) {
		nodeName = "indented code block";
		markerPos = line.search(/\S/)
	}else if ((/^\s*```/).test(line)) {
		markerPos = line.indexOf('`');
		nodeName = "fenced code block";
	}else if (lineIsHorizontalRule(line)){ // hr
		nodeName = "hr";
		markerPos = line.search(/\S/)
	}else {
		let listMarkerDetails = (/(\s*)(\d{1,9}(?:\.|\)))(\s+)/).exec(line) || (/(\s*)(-|\+|\*)(\s+)/).exec(line);
		if (listMarkerDetails && listMarkerDetails[1].length < 4) {
			markerPos = listMarkerDetails[1].length > 0 ? listMarkerDetails[1].length - 1 : listMarkerDetails[1].length;
			if (("+-*").includes(listMarkerDetails[2])) {
				nodeName = "ul-li"
			}else nodeName = "ol-li";
		}else nodeName = "paragraph";
	}
	
	return [nodeName, markerPos];
}

function getNearestAncestor(node: HtmlNode, ancestorNodeName: string): HtmlNode|null {
	if (!node.parentNode) {
		return null
	}else if (node.parentNode.nodeName === ancestorNodeName) {
		return node.parentNode;
	}else return getNearestAncestor(node.parentNode, ancestorNodeName)
}


// get node's ancestor with the same level of indentation
function getValidOpenedAncestor(node: HtmlNode, indentLevel: number): HtmlNode {
	if (node.nodeName === "main" ||
			node.nodeName === "li" && indentLevel >= (node.indentLevel as number)) {
		return node;
	}else {
		return getValidOpenedAncestor(node.parentNode, indentLevel);
	}
}

// get node's list child with the same level of indentation as indentLevel
function validListChild(node: HtmlNode, indentLevel: number): HtmlNode|null {
	if (node.nodeName === "li" && node.indentLevel === indentLevel) {
		return node;
	}else if (node.nodeName === "li" && node.children.length === 0) {
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

function parseLine(line: string, lastOpenedNode: HtmlNode) {

	let nodeName, markerPos = -1;
	[nodeName, markerPos] = getBlockNodes(line);

	if (lastOpenedNode.nodeName === "li" && nodeName !== "paragraph") {
		let nearestValidAncestor = getValidOpenedAncestor(lastOpenedNode, markerPos)
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		if (lastOpenedNode !== nearestValidAncestor && nearestValidAncestor.nodeName === "main") {
			lastOpenedNode.closed = true
		}
		if (nodeName !== "indented code block" && markerPos >= 4) nodeName = "indented code block";
		lastOpenedNode = nearestValidAncestor;
	}

	if (nodeName === "ol-li" || nodeName === "ul-li") {
		let parentNodeName = ""; // list parent node name as in ordered or unordered
		if (nodeName === "ol-li") {
			parentNodeName = "ol"
		}else parentNodeName = "ul"
		let fullWidth = line.match(/(\s*)(\d{1,9}(?:\.|\)))(\s*)/) || line.match(/(\s*)(\*|\+|-)(\s*)/) as RegExpMatchArray;
		let originLastOpenedNode = lastOpenedNode;
		lastOpenedNode = originLastOpenedNode.children.length > 0 ? 
										originLastOpenedNode.children[originLastOpenedNode.children.length - 1] : 
										originLastOpenedNode;
		
		if (lastOpenedNode.nodeName === "blockquote") {
			if (markerPos > 2) {
				let listItemAncestor = validListChild(lastOpenedNode, markerPos) as HtmlNode;
				if (!listItemAncestor) {
					nodeName = "indented code block"
				}else lastOpenedNode = listItemAncestor;
			}
		}
		if (nodeName !== "indented code block") {
			if (!lastOpenedNode || lastOpenedNode.nodeName !== parentNodeName) {
				lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: parentNodeName, closed: false, children: []})
				lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
			}
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "li", indentLevel: markerPos + fullWidth[2].length,closed: false, children: []})
			lastOpenedNode = parseLine(line.slice(markerPos + fullWidth[2].length), lastOpenedNode.children[lastOpenedNode.children.length - 1]);
			if (originLastOpenedNode.nodeName === "blockquote") {
				lastOpenedNode = originLastOpenedNode;
			}
		}
	}

	/*if (nodeName === "fenced code block") {
	}*/

	if (nodeName === "indented code block") {
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		if (lastChild.nodeName === "indented code block" && !lastChild.closed) {
			lastChild.textContent += line;
		}else if (lastChild.nodeName !== "paragraph"|| lastChild.nodeName === "paragraph" && lastChild.closed) {
			// TODO: should the initial indented code block line be sliced?
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, closed: false, textContent:line, children: []})
		}
	}

	if (nodeName === "blockquote") {
		let blockQuotesDetails = line.match(/(?:>\s{0,3})+/) as RegExpMatchArray;
		if (lastOpenedNode.nodeName !== "blockquote") {
			lastOpenedNode.children.push(
				{parentNode: lastOpenedNode, nodeName: "blockquote", closed: false, totalNested: count(blockQuotesDetails[0], '>'), children: []}
			)
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
		parseLine(line.slice(markerPos+blockQuotesDetails[0].length, line.length), lastOpenedNode);
	}

	if (nodeName === "paragraph"){
		let lastChild = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		if (line.search(/\S/) == -1) {
			if (lastOpenedNode.nodeName === "blockquote") {
				lastOpenedNode.closed = true;
				lastOpenedNode = lastOpenedNode.parentNode; 
			}
			if (lastChild && lastChild.nodeName === "paragraph") {
				lastChild.closed = true;
				lastOpenedNode.closed = true;
				lastOpenedNode = lastOpenedNode.parentNode; 
			}
		}else if (lastChild && lastChild.nodeName === "paragraph" && !lastChild.closed) {
			lastChild.textContent += line
		}else if (!lastChild || lastChild.nodeName !== "paragraph" || lastChild.closed) {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "paragraph", closed: false, textContent: line, children: []})
		}
	}

	return lastOpenedNode;
}

export default function Page({ params }: {params: {slug: string}}) {
	// reference links aren't supported
	const rootRef = useRef(null);
	const preRef = useRef(null);
	const root:HtmlNode = {parentNode: null as any, nodeName: "main", closed: false, children: []}
	useEffect(() => {
		rootRef.current.appendChild(getHtmlNode(root));
		preRef.current.textContent = rootRef.current.innerHTML;
		console.log(root);
	}, [])
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
		<section className="flex w-100">
			<section className="w-1/2" ref={rootRef}></section>
			<pre className="w-1/2" ref={preRef}></pre>
		</section>
	)
}

