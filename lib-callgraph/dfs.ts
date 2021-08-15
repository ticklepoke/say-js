/**
 * @module dfs transitive closure to compute reachability of nodes
 */
import { Graph, nodeToString } from '@lib-callgraph/graph';
import { Vertex } from '@lib-callgraph/vertex';
import { namedTypes as n } from 'ast-types';

function visit1(props: {
	idx: number;
	enumNodes: Vertex[];
	visited: number[];
	visited2: number[];
	nodePredecessor: NodePred;
	graph: Graph;
	stringToReachId: { [key: string]: number };
	m: Set<number>[];
	t: Set<number>[];
	popped: number[];
	globl: Set<number>;
}) {
	const { idx, enumNodes, visited, nodePredecessor, graph, stringToReachId, m, t, popped } = props;
	let { globl } = props;
	visited[idx] = 1;

	if (!nodePredecessor || nodePredecessor(enumNodes[idx])) {
		const succ = graph.succ(enumNodes[idx]);

		for (let j = 0; j < succ.length; j++) {
			const index = stringToReachId[nodeToString(succ[j])];
			if (nodePredecessor && !nodePredecessor(succ[j])) continue;
			if (m[idx].has(index) || t[idx].has(index)) continue;
			if (visited[index] === 0) {
				visit1({
					...props,
					idx: index,
				});
			}
			if (popped[index] === 1) {
				m[idx] = new Set(m[idx]);
				for (const el of m[index].values()) {
					m[idx].add(el);
				}
				m[idx].add(index);
				t[idx] = new Set(t[idx]);
				for (const el of t[index].values()) {
					t[idx].add(el);
				}
				for (const el of m[index].values()) {
					t[idx].delete(el);
				}
			} else {
				t[idx] = new Set(t[idx].add(index));
			}
		}
	}

	if (t[idx].has(idx)) {
		if (t[idx].size === 1) {
			m[idx].add(idx);
			t[idx] = new Set();
			globl = new Set(m[idx]);
			visit2({ ...props, globl, idx });
		} else {
			t[idx].delete(idx);
			m[idx].delete(idx);
		}
	}
	popped[idx] = 1;
}

function visit2(props: {
	idx: number;
	enumNodes: Vertex[];
	visited2: number[];
	nodePredecessor: NodePred;
	graph: Graph;
	stringToReachId: { [key: string]: number };
	m: Set<number>[];
	t: Set<number>[];
	globl: Set<number>;
}) {
	const { idx, enumNodes, visited2, nodePredecessor, graph, stringToReachId, m, t, globl } = props;
	visited2[idx] = 1;

	if (!nodePredecessor || nodePredecessor(enumNodes[idx])) {
		const succ = graph.succ(enumNodes[idx]);

		for (let j = 0; j < succ.length; j++) {
			const index = stringToReachId[nodeToString(succ[j])];
			if (nodePredecessor && !nodePredecessor(succ[j])) return;
			if (visited2[index] === 0 && t[index].size !== 0) {
				visit2({ ...props, idx: index });
			}
		}

		m[idx] = new Set(globl);
		t[idx] = new Set();
	}
}

type NodePred = (node: n.Node) => boolean;
type Reachability = {
	getReachable: (s: Vertex) => Vertex[];
	iterReachable: (s: Vertex, cb: (n: Vertex) => void) => void;
	reaches: (s: Vertex, d: Vertex) => boolean;
};

export function makeReachability(graph: Graph, nodePredecessor: NodePred): Reachability {
	const enumNodes: Vertex[] = [];
	const nodes = graph.getNodes();
	const N = nodes.length;

	const stringToReachId: { [key: string]: number } = {};

	const visited = new Array(N).fill(0);
	const visited2 = new Array(N).fill(0);
	const popped = new Array(N).fill(0);
	const globl = new Set<number>();
	const m: Set<number>[] = []; // TODO: find a better name
	const t: Set<number>[] = [];

	nodes.forEach((node, idx) => {
		enumNodes.push(node);
		stringToReachId[nodeToString(node)] = idx;
		m.push(new Set());
		t.push(new Set());
	});

	return {
		getReachable: (src: Vertex) => {
			const nodeString = nodeToString(src);
			if (!(nodeString in stringToReachId)) {
				enumNodes.push(src);
				visited.push(0);
				visited2.push(0);
				popped.push(0);
				m.push(new Set());
				t.push(new Set());
				stringToReachId[nodeString] = enumNodes.length - 1;
			}

			const srcId = stringToReachId[nodeString];
			if (visited[srcId] === 0) {
				visit1({
					idx: srcId,
					enumNodes,
					visited,
					visited2,
					nodePredecessor,
					graph,
					stringToReachId,
					m,
					t,
					popped,
					globl,
				});
			}
			const transitiveClosure = new Set(m[srcId]);
			for (const el of t[srcId].values()) {
				transitiveClosure.add(el);
			}

			const ret = [];
			for (const el of transitiveClosure.values()) {
				ret.push(enumNodes[el]);
			}
			return ret;
		},
		iterReachable: (src: Vertex, callback: (node: Vertex) => void) => {
			const nodeString = nodeToString(src);
			if (!(nodeString in stringToReachId)) {
				enumNodes.push(src);
				visited.push(0);
				visited2.push(0);
				popped.push(0);
				m.push(new Set());
				t.push(new Set());
				stringToReachId[nodeString] = enumNodes.length - 1;
			}

			const srcId = stringToReachId[nodeString];
			if (visited[srcId] === 0) {
				visit1({
					idx: srcId,
					enumNodes,
					visited,
					visited2,
					nodePredecessor,
					graph,
					stringToReachId,
					m,
					t,
					popped,
					globl,
				});
			}
			const transitiveClosure = new Set(m[srcId]);
			for (const el of t[srcId].values()) {
				transitiveClosure.add(el);
			}
			for (const el of transitiveClosure.values()) {
				callback(enumNodes[el]);
			}
		},
		reaches: (src: Vertex, destination: Vertex) => {
			const srcId = stringToReachId[nodeToString(src)];
			const destId = stringToReachId[nodeToString(destination)];

			if (visited[srcId] === 0) {
				visit1({
					idx: srcId,
					enumNodes,
					visited,
					visited2,
					nodePredecessor,
					graph,
					stringToReachId,
					m,
					t,
					popped,
					globl,
				});
			}

			const transitiveClosure = new Set(m[srcId]);
			for (const el of t[srcId].values()) {
				transitiveClosure.add(el);
			}
			return transitiveClosure.has(destId);
		},
	};
}
