
// Make it Work. Make it pretty. Make it fast

interface HtmlNode {
	parentNode: HtmlNode;
	nodeName: string;
	textContent?: string;
	children: HtmlNode[];
	indentLevel?: number;
}


function getHtmlElementOf(node: HtmlNode) {
	let htmlEl = document.createElement(node.nodeName);
	if (node.textContent){
		htmlEl.textContent = node.textContent;
	}else if (node.children.length == 0) {
		return htmlEl;
	}else if (node.children.length > 0) {
		node.children.forEach((node) => htmlEl.append(getHtmlElementOf(node)))
	}
	return htmlEl;
}

function constructHtmlTree(htmlNodes: HtmlNode[]) {
	const main = document.createElement("main");
	for (let node of htmlNodes) {
		main.append(getHtmlElementOf(node));
	}
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
	}else if (line.startsWith("    ")) {
		nodeName = "indented code block";
		markerPos = -1; // this variable is irrelevant when the condition above is true
	}else if ((/^\s*```/).test(line)) {
		markerPos = line.indexOf('`');
		nodeName = "fenced code block";
	}else if (lineIsHorizontalRule(line)){ // hr
		nodeName = "hr";
	}else {
		let listMarkerDetails = (/(\s*)(\d\.)(\s+)/).exec(line) || (/(\s*)(-|\+|\*)(\s+)/).exec(line);
		if (listMarkerDetails && listMarkerDetails[1].length < 4 && listMarkerDetails[3].length <= 4) {
			markerPos = listMarkerDetails[1].length + listMarkerDetails[2].length - 1;
			if (("+-*").includes(listMarkerDetails[2])) {
				nodeName = "unordered list"
			}else nodeName = "ordered list";
		}else nodeName = "paragraph";
	}
	
	return [nodeName, markerPos];
}

function getClosestListItem(node: HtmlNode): HtmlNode|null {
	if (node.nodeName === "main") {
		return null
	}if (node.nodeName === "li") {
		return node;
	}else return getClosestListItem(node.parentNode)
}

function parseLine(line: string, lastOpenedNode: HtmlNode) {
	let [nodeName, markerPos] = getBlockNodes(line);
	if (markerPos >= 3 && nodeName !== "paragraph") {
		let nearestListItem:HtmlNode = getClosestListItem(lastOpenedNode) as HtmlNode;
		if ((nearestListItem.indentLevel as number) === markerPos && nodeName !== "indented code block") {
			lastOpenedNode = nearestListItem;
		}
	}

	if (nodeName === "indented code block") {
		if (lastOpenedNode.nodeName === "paragraph" || markerPos < 3) {
			nodeName = "paragraph";
		}else if (lastOpenedNode.nodeName === "indented code block"){
			lastOpenedNode.textContent += ('\n' + line)
		}else {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, textContent: line, children: []})
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
	}else if (nodeName === "hr") {
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, children: []})
	}else if (nodeName === "blockquote") {
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "blockquote", children: []})
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		parseLine(line.slice(markerPos as number, line.length), lastOpenedNode)
	}else if (nodeName === "fenced code block") { // work on this guy first then work on the output code next
		lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, indentLevel: markerPos, children: []})
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
	}else if (nodeName === "ordered list" || nodeName === "unordered list") {
		let spacesAfterMarker = line.slice(markerPos, line.length).match(/(\s*)/);
		if (spacesAfterMarker && spacesAfterMarker.length < 4) {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, indentLevel: markerPos + spacesAfterMarker.length, children: []})
		}else if (spacesAfterMarker && spacesAfterMarker.length === 4){
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName, indentLevel: markerPos + 1, children: []})
		}
		lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		parseLine(line.slice(markerPos as number, line.length), lastOpenedNode)
	}

	if (nodeName === "paragraph") {
		if (lastOpenedNode.nodeName === "paragraph") {
			lastOpenedNode.textContent += ('\n' + line)
		}else {
			lastOpenedNode.children.push({parentNode: lastOpenedNode, nodeName: "paragraph", textContent: line, children: []})
			lastOpenedNode = lastOpenedNode.children[lastOpenedNode.children.length - 1];
		}
	}

	return lastOpenedNode;
}

export default function Page({ params }: {params: {slug: string}}) {
	// reference links aren't supported
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
	`

	const lines = sampleText.split('\n');
	// I don't really know why I was able to cast null to any so come back to refactor
	const root:HtmlNode = {parentNode: null as any, nodeName: "paragraph", children: []}
	let lastOpenedNode: HtmlNode|null = root; 

	for (let line of lines) {
		parseLine(line, lastOpenedNode);
		
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
	return <></>
}

