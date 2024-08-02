import type {HtmlNode} from "./page"
import {lineIsHorizontalRule} from "./utilities"

// human-friendly as well as browser-friendly html synatx generator
export function createInnerHtml(rootNode: HtmlNode, indentLevel: number):string {
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

export function parseInlineNodes(line: string): string {
	line = line.replaceAll(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
	line = line.replaceAll(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
	line = line.replaceAll(/(\*|_)(.+)?\1/g, '<em>$2</em>');
	line = line.replaceAll(/(\*|_)+(.+)?\1/g, '<strong>$2</strong>');
	line = line.replaceAll(/(`+)(.+)?\1/g, '<pre><code>$2</code></pre>');
	return line;
}