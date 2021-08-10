import { CallType, ExtendedNode, FunctionType } from '@lib-frontend/astTypes';
import { createExtendedNodeT } from '@lib-frontend/astUtils';
import { addNativeFunctionEdges } from '@utils/natives';
import { namedTypes as n } from 'ast-types';
import { makeReachability } from './dfs';
import {
	addIntraProcedureEdges,
	argVertex,
	functionVertex,
	getNativeVertices,
	paramVertex,
	resultVertex,
	returnVertex,
	unknownVertex,
} from './flowGraph';
import { FlowGraph, Graph } from './graph';
import { CalleeVertex, Vertex } from './vertex';

type CallGraphData = {
	edges: Graph;
	escaping: Vertex[];
	unknown: Vertex[];
	flowGraph: FlowGraph;
};

function extractCallGraph(ast: ExtendedNode, flowGraph: FlowGraph): CallGraphData {
	const edges = new Graph();
	const escaping: Vertex[] = [];
	const unknown: Vertex[] = [];

	const reach = makeReachability(flowGraph, (node: n.Node) => {
		return node.type !== 'UnknownVertex';
	});

	const processFunctionVertex = (fn: Vertex) => {
		const r = reach.getReachable(fn);
		r.forEach((node) => {
			if (node.type === 'UnknownVertex') {
				escaping.push(fn);
			} else if (node.type === 'CalleeVertex') {
				edges.addEdge(node, fn);
			}
		});
	};

	flowGraph.iterNodes((n) => {
		if (n.type === 'FunctionVertex') {
			processFunctionVertex(n);
		}
	});

	getNativeVertices().forEach(processFunctionVertex);
	const unknownReach = reach.getReachable(unknownVertex());
	unknownReach
		.filter((n) => n.type === 'CalleeVertex')
		.forEach((n) => {
			unknown.push(n);
		});

	return {
		edges,
		escaping,
		unknown,
		flowGraph,
	};
}

function addInterProcedureEdges(ast: ExtendedNode, flowGraph: FlowGraph) {
	let changed = true;
	while (changed) {
		changed = false;

		const reach = makeReachability(flowGraph, (n) => n.type !== 'UnknownVertex');

		if (!ast.attributes) {
			ast.attributes = {};
		}

		ast.attributes.calls?.forEach((call) => {
			const res = resultVertex(createExtendedNodeT<CallType>(call));
			if (!res.attributes.ofInterest) {
				reach.iterReachable(res, (n) => {
					if (n.type === 'CalleeVertex') {
						res.attributes.ofInterest = true;
					}
				});
			}
		});

		ast.attributes.functions?.forEach((fn) => {
			let ofInterest = false;
			const nParams = fn.params.length;

			for (let i = 0; i <= nParams; i++) {
				const param = paramVertex(createExtendedNodeT<FunctionType>(fn), i);
				if (!param.attributes.ofInterest) {
					reach.iterReachable(param, (n) => {
						if (n.type === 'CalleeVertex') {
							param.attributes.ofInterest = true;
						}
					});
				}
				ofInterest = ofInterest || !!param.attributes.ofInterest;
			}

			reach.iterReachable(functionVertex(createExtendedNodeT<FunctionType>(fn)), (n) => {
				if (n.type === 'CalleeVertex') {
					const { call } = n as CalleeVertex; // TODO: solve type coercion
					const res = resultVertex(call);

					if (res.attributes.ofInterest) {
						const ret = returnVertex(createExtendedNodeT<FunctionType>(fn));
						if (!flowGraph.hasEdge(ret, res)) {
							changed = true;
							flowGraph.addEdge(ret, res);
						}
					}

					if (ofInterest) {
						for (let i = 0; i <= nParams; i++) {
							// 0 refers to this, named params start from 1
							if (i > call.arguments.length) break;

							const param = paramVertex(createExtendedNodeT<FunctionType>(fn), i);
							if (param.attributes.ofInterest) {
								const arg = argVertex(call, i);
								if (!flowGraph.hasEdge(arg, param)) {
									changed = true;
									flowGraph.addEdge(arg, param);
								}
							}
						}
					}
				}
			});
		});
	}

	return flowGraph;
}

export function buildCallGraph(ast: ExtendedNode): CallGraphData {
	const flowGraph = new FlowGraph();
	addNativeFunctionEdges(flowGraph);
	addIntraProcedureEdges(ast, flowGraph);

	const expFunctions = {};
	const impFunctions = {};
	// TODO: collect export imports
	// collectExportImports(ast, expFunctions, impFunctions)
	// TODO: connect imports
	// connectImports(flowGraph, expFunctions, impFunctions)

	addInterProcedureEdges(ast, flowGraph);
	return extractCallGraph(ast, flowGraph);
}
