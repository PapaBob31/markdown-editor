"use client"

// Make it Work. Make it pretty. Make it fast
import { useRef, useEffect } from "react"
import parse from "./parser"
import { createInnerHtml } from "./parserHelper"


export interface HtmlNode {
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


export default function Page({ params }: {params: {slug: string}}) {
	// reference links aren't supported
	const sampleText =
`
# header 1
## header 20, 
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
*which is why u can't be empahasized text*

*emphasized text*
me too

who dey close am abeg

    and now for my final trick
    I don't know the programming language but 
    this feels like a lot of syntax errors

- 

  45
`;

	const root:HtmlNode = {parentNode: null as any, nodeName: "main", indentLevel: 0, closed: false, children: []}
	// I don't really know why I was able to cast null to any so check typescript docs later
	let lastOpenedNode: HtmlNode = root; 
	parse(sampleText, root);

	return (
		<section>
			{/*<section className="w-1/2"></section>*/}
			<pre className="w-100">{createInnerHtml(root, 0)}</pre>
		</section>
	)
}
