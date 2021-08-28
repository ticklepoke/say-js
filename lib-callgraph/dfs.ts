import { namedTypes as n } from 'ast-types';
import { Graph, nodeToString } from './graph';
import { Vertex } from './vertex';

type NodePred = (node: n.Node) => boolean;
type Reachability = {
	getReachable: (s: Vertex) => Vertex[];
	iterReachable: (s: Vertex, cb: (n: Vertex) => void) => void;
	reaches: (s: Vertex, d: Vertex) => boolean;
};

export function makeReachability(graph: Graph, nodePred: NodePred): Reachability {
	const enumNodes: Vertex[] = [];

	const nodes = graph.getNodes();

	const n = nodes.length;

	const stringToReachabilityId: Record<string, number> = {};

	for (let i = 0; i < n; i++) {
		enumNodes[i] = nodes[i];
		stringToReachabilityId[nodeToString(nodes[i])] = i;
	}

	const visited = new Array(n).fill(0),
		visited2 = new Array(n).fill(0),
		popped = new Array(n).fill(0),
		m: Set<number>[] = [],
		t: Set<number>[] = [];

	let globol = new Set<number>();

	for (let i = 0; i < n; i++) {
		m.push(new Set());
		t.push(new Set());
	}

	function visit1(i: number) {
		visited[i] = 1;

		if (!nodePred || nodePred(enumNodes[i])) {
			const succ = graph.succ(enumNodes[i]);

			for (let j = 0; j < succ.length; j++) {
				const index = stringToReachabilityId[nodeToString(succ[j])];
				if (nodePred && !nodePred(succ[j])) continue;
				if (m[i].has(index) || t[i].has(index)) continue;

				if (visited[index] == 0) visit1(index);

				if (popped[index] == 1) {
					m[i] = new Set(m[i]);
					for (const elem of m[index].values()) {
						m[i].add(elem);
					}
					m[i].add(index);
					t[i] = new Set(t[i]);
					for (const elem of t[index].values()) t[i].add(elem);
					for (const elem of m[i].values()) t[i].delete(elem);
				} else {
					t[i] = new Set(t[i].add(index));
				}
			}
		}

		if (t[i].has(i)) {
			if (t[i].size === 1) {
				m[i].add(i);
				t[i] = new Set();
				globol = new Set(m[i]);
				visit2(i);
			} else {
				t[i].delete(i);
				m[i].add(i);
			}
		}

		popped[i] = 1;
	}

	function visit2(i: number) {
		visited2[i] = 1;

		if (!nodePred || nodePred(enumNodes[i])) {
			const succ = graph.succ(enumNodes[i]);

			for (let j = 0; j < succ.length; j++) {
				const index = stringToReachabilityId[nodeToString(succ[j])];
				if (nodePred && !nodePred(succ[j])) return;
				if (visited2[index] == 0 && t[index].size !== 0) visit2(index);
			}
		}

		m[i] = new Set(globol);
		t[i] = new Set();
	}
	return {
		getReachable: function (src) {
			const nodeStr = nodeToString(src);
			if (!(nodeStr in stringToReachabilityId)) {
				enumNodes.push(src);
				visited.push(0);
				visited2.push(0);
				popped.push(0);
				m.push(new Set());
				t.push(new Set());
				stringToReachabilityId[nodeStr] = enumNodes.length - 1;
			}
			const srcId = stringToReachabilityId[nodeStr];

			if (visited[srcId] == 0) visit1(srcId);

			const transitiveClosure = new Set(m[srcId]);
			for (const elem of t[srcId].values()) transitiveClosure.add(elem);

			const res = [];
			for (const el of transitiveClosure.values()) {
				res.push(enumNodes[el]);
			}

			return res;
		},
		iterReachable: function (src, cb) {
			const nodeStr = nodeToString(src);
			if (!(nodeStr in stringToReachabilityId)) {
				enumNodes.push(src);
				visited.push(0);
				visited2.push(0);
				popped.push(0);
				m.push(new Set());
				t.push(new Set());
				stringToReachabilityId[nodeStr] = enumNodes.length - 1;
			}
			const srcId = stringToReachabilityId[nodeStr];

			if (visited[srcId] == 0) visit1(srcId);

			const transitiveClosure = new Set(m[srcId]);
			for (const el of t[srcId].values()) transitiveClosure.add(el);

			for (const el of transitiveClosure.values()) cb(enumNodes[el]);
		},
		reaches: function (src, dest) {
			const srcId = stringToReachabilityId[nodeToString(src)];
			const destId = stringToReachabilityId[nodeToString(dest)];

			if (visited[srcId] == 0) visit1(srcId);

			const transitiveClosure = new Set(m[srcId]);
			for (const elem of t[srcId].values()) transitiveClosure.add(elem);

			return transitiveClosure.has(destId);
		},
	};
}
