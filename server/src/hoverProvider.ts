import { CancellationToken, DocumentSymbol, Hover, HoverParams, SymbolKind } from 'vscode-languageserver';
import { ClassNode, detectExpType, formatMarkdowndetail, FuncNode, searchNode } from './Lexer';
import { lexers, hoverCache, Maybe, ahkvars } from './server';

export async function hoverProvider(params: HoverParams, token: CancellationToken): Promise<Maybe<Hover>> {
	if (token.isCancellationRequested) return undefined;
	let uri = params.textDocument.uri.toLowerCase(), doc = lexers[uri];
	if (!doc || doc.instrorcomm(params.position)) return;
	let context = doc.buildContext(params.position), t: any, hover: any[] = [];
	if (context) {
		let word = context.text.toLowerCase(), kind: SymbolKind | SymbolKind[] = SymbolKind.Variable;
		let nodes: [{ node: DocumentSymbol, uri: string }] | undefined, node: DocumentSymbol | undefined, uri: string = '';
		if (context.pre === '#') {
			if ((t = hoverCache[1]) && (t = t[word = '#' + word]))
				return t[0];
			else return undefined;
		} else kind = context.kind;
		if (kind === SymbolKind.Variable)
			kind = [SymbolKind.Variable, SymbolKind.Class];
		if (word === '')
			return undefined;
		else if (!(nodes = searchNode(doc, word, context.range.end, kind)) && (kind == SymbolKind.Property || kind === SymbolKind.Method)) {
			let ts: any = {};
			nodes = <any>[], detectExpType(doc, word.replace(/\.[^.]+$/, m => {
				word = m.match(/^\.[^.]+$/) ? m : '';
				return '';
			}), params.position, ts);
			if (word && ts['#any'] === undefined)
				for (const tp in ts)
					searchNode(doc, tp + word, context.range.end, kind)?.map(it => {
						if (!nodes?.map(i => i.node).includes(it.node))
							nodes?.push(it);
					});
			if (!nodes?.length)
				nodes = undefined;
		}
		if (!nodes) {
			if (kind === SymbolKind.Method) {
			} else if (ahkvars[word])
				nodes = [{ node: ahkvars[word], uri: '' }];
			else if (kind === SymbolKind.Function) {
				if ((t = hoverCache[0]) && t[word])
					return t[word][0];
			} else if ((t = hoverCache[1]) && t[word])
				return t[word][0];
		}
		if (nodes) {
			if (nodes.length > 1) {
				nodes.map(it => {
					if ((<any>(it.node)).full)
						hover.push({ kind: 'ahk2', value: (<any>(it.node)).full })
				});
			} else {
				node = nodes[0].node, uri = nodes[0].uri;
				if (node.kind === SymbolKind.Function || node.kind === SymbolKind.Method || node.kind === SymbolKind.Property) {
					if ((<FuncNode>node).full)
						hover.push({ kind: 'ahk2', value: (<FuncNode>node).full });
				} else if (node.kind === SymbolKind.Class)
					hover.push({ kind: 'ahk2', value: 'class ' + ((<ClassNode>node).full || node.name) });
				if (node.detail)
					hover.push({ kind: 'markdown', value: formatMarkdowndetail(node.detail) });
			}
			if (hover.length)
				return {
					contents: {
						kind: 'markdown', value: hover.map(it => {
							if (it.kind === 'ahk2') {
								return '```ahk2\n' + it.value + '\n```';
							} else
								return it.value;
						}).join('\n\n')
					}
				};
		}
	}
	return undefined;
}