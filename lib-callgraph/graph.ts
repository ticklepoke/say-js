import { LinkedList } from '@lib-calllgraph/linkedList';
import { Vertex } from '@lib-calllgraph/vertex';
import { ExtendedNode } from '@lib-frontend/astTypes';
import { panic } from '@utils/macros';
import { TSFixMe } from '@utils/types';
import * as O from 'fp-ts/lib/Option';

class BaseGraph {
	_pred: { [key: string]: LinkedList<string> };
	_succ: { [key: string]: LinkedList<string> };

	constructor() {
		this._pred = {};
		this._succ = {};
	}

	addNode(node: string) {
		this._pred[node] = this.pred(node);
		this._succ[node] = this.succ(node);
	}

	removeNode(node: string) {
		if (this._pred[node]) {
			for (const pre of this._pred[node]) {
				if (O.isSome(pre)) {
					this._succ[pre.value].remove(node);
				}
			}
			delete this._pred[node];
		}
		if (this._succ[node]) {
			for (const succ of this._succ[node]) {
				if (O.isSome(succ)) {
					this._pred[succ.value].remove(node);
				}
			}
			delete this._succ[node];
		}
	}

	pred(node: string) {
		return this._pred[node] ?? new LinkedList();
	}

	succ(node: string) {
		return this._succ[node] ?? new LinkedList();
	}

	addEdge(u: string, v: string) {
		this.addNode(u);
		this.addNode(v);
		this._pred[u].add(v);
		this._succ[v].add(u);
	}

	// Remove any edge going from u to v
	removeEdge(u: string, v: string) {
		if (this._succ[u]) {
			this._succ[u].remove(v);
		}
		if (this._pred[v]) {
			this._pred[v].remove(u);
		}
	}

	nodes() {
		return Object.keys(this._pred);
	}

	serialize() {
		const serialized = {
			nodes: this.nodes().map((id) => ({ id: id })),
			links: [] as Array<{ source: string; target: string }>,
		};

		serialized.nodes.forEach((node) => {
			const source = node.id;
			for (const target of this._succ[source]) {
				if (O.isSome(target)) {
					serialized.links.push({
						source,
						target: target.value,
					});
				}
			}
		});
		return serialized;
	}
}

export function nodeToString(node: Vertex): string {
	return node.attributes.prettyPrint();
}

type Annotation = TSFixMe;
export class Graph {
	graph: BaseGraph;
	nodePairings: { [key: string]: Vertex };
	edgeAnnotations: { [key: string]: Annotation };

	constructor() {
		this.graph = new BaseGraph();
		this.nodePairings = {};
		this.edgeAnnotations = {};
	}

	addNode(node: Vertex): void {
		if (this.hasNode(node)) {
			return;
		}

		this.nodePairings[nodeToString(node)] = node;
		this.graph.addNode(nodeToString(node));
	}

	addEdge(from: Vertex, to: Vertex, annotation?: Annotation): void {
		this.addNode(from);
		this.addNode(to);

		this.graph.addEdge(nodeToString(from), nodeToString(to));

		if (annotation) {
			this.edgeAnnotations[nodeToString(from) + ' -> ' + nodeToString(to)] = annotation;
		}
	}

	addEdges(from: Vertex, tos: Vertex[], annotations?: Annotation[]): void {
		for (let i = 0; i < tos.length; i++) {
			if (annotations) {
				this.addEdge(from, tos[i], annotations[i]);
			} else {
				this.addEdge(from, tos[i]);
			}
		}
	}

	hasEdge(from: Vertex, to: Vertex): boolean {
		return this.graph.succ(nodeToString(from)).has(nodeToString(to));
	}

	succ(node: Vertex): Vertex[] {
		const succ = this.graph.succ(nodeToString(node));
		const succList = [];
		for (const s of succ) {
			if (O.isSome(s)) {
				succList.push(this.nodePairings[s.value]);
			}
		}
		return succList;
	}

	hasNode(node: Vertex): boolean {
		return nodeToString(node) in this.nodePairings;
	}

	removeEdge(from: Vertex, to: Vertex): boolean {
		if (this.hasNode(from) && this.hasNode(to) && this.hasEdge(from, to)) {
			this.graph.removeEdge(nodeToString(from), nodeToString(to));
			return true;
		}
		return false;
	}

	removeNode(node: Vertex): boolean {
		if (this.hasNode(node)) {
			this.graph.removeNode(nodeToString(node));
			delete this.nodePairings[nodeToString(node)];
			return true;
		}
		return false;
	}

	iter(callback: (u: Vertex, v: Vertex) => void): void {
		const nodes = this.graph.nodes();
		for (const u of nodes) {
			for (const v of this.graph.succ(u)) {
				if (O.isSome(v)) {
					const uNode = this.nodePairings[u];
					const vNode = this.nodePairings[v.value];
					callback(uNode, vNode);
				}
			}
		}
	}

	iterNodes(callback: (n: Vertex) => void): void {
		const nodes = this.graph.nodes();
		for (const node of nodes) {
			callback(this.nodePairings[node]);
		}
	}

	getNodes(): Vertex[] {
		const nodes = this.graph.nodes();
		const out = [];
		for (const n of nodes) {
			out.push(this.nodePairings[n]);
		}
		return out;
	}
}

function getEnclosingFile(node: ExtendedNode) {
	/* eslint-disable no-prototype-builtins */
	/* eslint-disable @typescript-eslint/no-explicit-any */
	if (node.hasOwnProperty('node')) {
		return (node as any).node.attributes.enclosingFile;
	}
	if (node.hasOwnProperty('call')) {
		return (node as any).call.attributes.enclosingFile;
	}
	if (node.hasOwnProperty('func')) {
		return (node as any).func.attributes.enclosingFile;
	}
	return null;
}

export class FlowGraph extends Graph {
	_fileToNodes: { [key: string]: Set<Vertex> };
	constructor() {
		super();
		this._fileToNodes = {};
	}

	addEdge(from: Vertex, to: Vertex, annotation?: Annotation): void {
		super.addEdge(from, to, annotation);
	}

	_updateFileToNodes(node: Vertex): void {
		const enclosingFile = getEnclosingFile(node);
		if (!enclosingFile) {
			return;
		}
		if (!(enclosingFile in this._fileToNodes)) {
			this._fileToNodes[enclosingFile] = new Set();
		}
		this._fileToNodes[enclosingFile].add(node);
	}

	removeNodesInFile(fileName: string): void {
		if (fileName in this._fileToNodes) {
			for (const fileGroupNode of this._fileToNodes[fileName]) {
				super.removeNode(fileGroupNode);
			}
		} else {
			panic('FlowGraph: fileName does not exist in state');
		}
	}
}
