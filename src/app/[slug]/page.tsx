"use client"

// Make it Work. Make it pretty. Make it fast
import { useRef, useEffect } from "react"

interface HtmlNode {
	parentNode: HtmlNode;
	nodeName: string;
	textContent?: string;
	children: HtmlNode[];
	indentLevel?: number;
	fenceLength?: number;
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
		let listMarkerDetails = (/(\s*)(\d{1,9}\.)(\s+)/).exec(line) || (/(\s*)(-|\+|\*)(\s+)/).exec(line);
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

function getValidAncestorWithSameIndentLevel(node: HtmlNode, indentLevel: number): HtmlNode{
	const listNode = getNearestAncestor(node, "li") // cause only list items are supposed to have indentation
	if (!listNode) {
		return getNearestAncestor(node, "main") as HtmlNode;
	}else if ((indentLevel - listNode.indentLevel) < 3) {
		return listNode.parentNode;	
	}else {
		return getValidAncestorWithSameIndentLevel(listNode, indentLevel);
	}
}

function parseLine(line: string, lastOpenedNode: HtmlNode) {
	let nodeName, markerPos = -1;
	[nodeName, markerPos] = getBlockNodes(line);
	let parentNodeName:string = "";

	if (nodeName === "ol-li" || nodeName === "ul-li") {
		if (nodeName === "ol-li") {
			parentNodeName = "ol"
		}else parentNodeName = "ul"
	}

	if (markerPos > 0) {
		let validAncestor = getValidAncestorWithSameIndentLevel(lastOpenedNode, markerPos);
		if (validAncestor.nodeName === "main" && markerPos <= 2) {
			if (parentNodeName && validAncestor.children[validAncestor.children.length - 1].nodeName !== parentNodeName){
				validAncestor.children.push({parentNode: validAncestor, nodeName: parentNodeName, children: []})
				lastOpenedNode = validAncestor.children[validAncestor.children.length - 1];
			}else lastOpenedNode = validAncestor;
			console.log(validAncestor.children, 9, nodeName);
		}else if (validAncestor.nodeName === "main" && markerPos > 2) {
			if (markerPos >= 4 && lastOpenedNode.nodeName !== "paragraph") {
				nodeName = "indented code block";
			}else nodeName = "paragraph";
			lastOpenedNode = validAncestor;
		}else if (validAncestor.nodeName == "li") {
			let lastIndex = validAncestor.children.length - 1;
			if (nodeName !== "ol-li" && nodeName !== "ul-li") {
				lastOpenedNode = validAncestor;
			}else if (lastIndex < 0 || validAncestor.children[lastIndex].nodeName !== parentNodeName) {
				validAncestor.children.push({parentNode: validAncestor, nodeName: parentNodeName, children: []})
			}
			lastOpenedNode = validAncestor.children[validAncestor.children.length - 1]	
		}
	}else {
		if (parentNodeName && lastOpenedNode.children.length > 0) {

		}
		if (lastOpenedNode.children.length === 0 && parentNode){
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: parentNodeName, children: []})
		}
		if (parentNodeName && lastOpenedNode.children[lastOpenedNode.children.length - 1].nodeName !== parentNodeName){
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
	}
	
	if (lastOpenedNode.nodeName === "fenced code block") {
		if (nodeName === "fenced code block") {
			let lineDetails = (/^\s*(`+)\s*$/).exec(line);
			if (lineDetails && lineDetails[0].length >= (lastOpenedNode.fenceLength as any)
				&& (markerPos - (lastOpenedNode.indentLevel as number) <= 2)) {
				lastOpenedNode = lastOpenedNode.parentNode;
			}
		}	
		return lastOpenedNode;
	}else if (lastOpenedNode.nodeName === "indented code block") {
		if (markerPos < (lastOpenedNode.indentLevel as number)) {
			lastOpenedNode = lastOpenedNode.parentNode;
		}else lastOpenedNode.textContent += ('\n' + line);
	}

	// indented code blocks algos should be checked for possible bugs
	if (nodeName === "indented code block") {
		if (lastOpenedNode.nodeName === "paragraph") { // indented code blocks can't interrupt paragraphs
			nodeName = "paragraph";
		}else {
			let fenceDetails = (/(`+)/).exec(line);
			lastOpenedNode.children.push(
				{parentNode: lastOpenedNode, nodeName, indentLevel: markerPos, fenceLength: (fenceDetails as any[1]).length, children: []}
			)
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
	}else if (nodeName === "hr") {
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, children: []})
	}else if (nodeName === "blockquote") {
		if (lastOpenedNode.nodeName === "paragraph" && lastOpenedNode.parentNode.nodeName === "blockquote") {
			nodeName = "paragraph";
		}else {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "blockquote", children: []})
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
			lastOpenedNode = parseLine(line.slice(markerPos as number+1, line.length), lastOpenedNode)
		}
	}else if (nodeName === "fenced code block") {		
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, indentLevel: markerPos, children: []})
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
	}else if (nodeName === "ol-li" || nodeName === "ul-li" ) { // list item TODO: lists nested inside blockquotes won' have proper indent details e.g > -
		let fullWidth = line.match(/(\s*)(\S+)(\s*)/);
		// TODO: properly calculate indent level by walking upwards through the tree looking for list ancestors to add their own indent leve;
		if (fullWidth && fullWidth[2].length < 4) {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "li", indentLevel: markerPos + fullWidth[2].length, children: []})
		}else if (fullWidth && fullWidth[2].length >= 4){
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "li", indentLevel: markerPos + 1, children: []})
		}
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		// console.log(line, nodeName, markerPos, fullWidth[1]);
		lastOpenedNode = parseLine(line.slice(markerPos + fullWidth[2].length as number, line.length), lastOpenedNode);
	}

	if (nodeName === "paragraph") {
		if (line.search(/\S/) == -1) {
			if (lastOpenedNode.nodeName == "paragraph") {
				lastOpenedNode = lastOpenedNode.parentNode;
			}
		}else {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "paragraph", textContent: line, children: []})
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
	}

	return lastOpenedNode;
}

export default function Page({ params }: {params: {slug: string}}) {
	// reference links aren't supported
	const rootRef = useRef(null);
	const preRef = useRef(null);
	const root:HtmlNode = {parentNode: null as any, nodeName: "main", children: []}
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

