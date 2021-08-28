import { FlowGraph } from '@lib-callgraph/graph';
import { ArgumentVertex, NativeVertex, Vertex } from '@lib-callgraph/vertex';
import { ProgramCollection, walk } from '@lib-frontend/ast';
import {
	ExtendedNode,
	ExtendedNodeT,
	FunctionType,
	isArrayExpression,
	isArrayPattern,
	isArrowFunctionExpression,
	isAssignmentExpression,
	isBinaryExpression,
	isCallExpression,
	isCatchClause,
	isClassDeclaration,
	isClassExpression,
	isConditionalExpression,
	isExpressionStatement,
	isFunctionDeclaration,
	isFunctionExpression,
	isFunctionType,
	isIdentifier,
	isLiteral,
	isLogicalExpression,
	isMemberExpression,
	isMethodDefinition,
	isNewExpression,
	isObjectExpression,
	isObjectPattern,
	isProperty,
	isReturnStatement,
	isSequenceExpression,
	isThisExpression,
	isThrowStatement,
	isUpdateExpresion,
	isVariableDeclarator,
} from '@lib-frontend/astTypes';
import { createExtendedNode, createExtendedNodeT, prettyPrintPosition } from '@lib-frontend/astUtils';
import SymbolTable from '@lib-ir/symbolTable';
import { panic } from '@utils/macros';
import { namedTypes as n } from 'ast-types';
import * as O from 'fp-ts/lib/Option';

export function addIntraProcedureEdges(ast: ProgramCollection, flowGraph = new FlowGraph()): FlowGraph {
	walk(ast, (node) => {
		if (isArrayExpression(node)) {
			node.elements.forEach((el, idx) => {
				if (el) {
					flowGraph.addEdge(getVertexForNodeType(el), propertyVertex({ type: 'Literal', value: idx }));
				}
			});
			return;
		}
		if (isAssignmentExpression(node)) {
			if (node.operator === '=') {
				// flowGraph.addEdges(getVertexForNodeType(node.right), [
				// 	getVertexForNodeType(node.left),
				// 	getVertexForNodeType(node),
				// ]);
				flowGraph.addEdge(getVertexForNodeType(node.left), getVertexForNodeType(node));
			}
			return;
		}
		if (isCallExpression(node)) {
			if (isMemberExpression(node.callee)) {
				flowGraph.addEdge(getVertexForNodeType(node.callee.object), argVertex(node, 0));
			}
			// fall through
		}
		if (isCallExpression(node) || isNewExpression(node)) {
			flowGraph.addEdge(getVertexForNodeType(node.callee), calleeVertex(node));
			node.arguments.forEach((arg, idx) => {
				flowGraph.addEdge(getVertexForNodeType(arg), argVertex(node, idx + 1));
			});
			flowGraph.addEdge(resultVertex(node), getVertexForNodeType(node));
			return;
		}
		if (isCatchClause(node) && node.param && isIdentifier(node.param)) {
			flowGraph.addEdge(unknownVertex(), variableVertex(node.param));
			return;
		}
		if (isConditionalExpression(node)) {
			flowGraph.addEdge(getVertexForNodeType(node.consequent), getVertexForNodeType(node));
			flowGraph.addEdge(getVertexForNodeType(node.alternate), getVertexForNodeType(node));
			return;
		}
		if (isClassDeclaration(node) || isClassExpression(node)) {
			const { body } = node.body;
			if (node.id) {
				for (const b of body) {
					if (isMethodDefinition(b) && b.kind === 'constructor' && isFunctionType(b.value)) {
						flowGraph.addEdge(functionVertex(b.value), getVertexForNodeType(node.id));
					}
				}
			}
			return;
		}
		if (isFunctionDeclaration(node)) {
			if (node.id) {
				flowGraph.addEdge(functionVertex(node), getVertexForNodeType(node.id));
			}
			return;
		}
		if (isFunctionExpression(node) || isArrowFunctionExpression(node)) {
			flowGraph.addEdge(functionVertex(node), expressionVertex(node));
			if (node.id && isIdentifier(node.id)) {
				flowGraph.addEdge(functionVertex(node), variableVertex(node.id));
			}
			return;
		}
		if (isLogicalExpression(node)) {
			if (node.operator === '||') {
				flowGraph.addEdge(getVertexForNodeType(node.left), getVertexForNodeType(node));
			}
			flowGraph.addEdge(getVertexForNodeType(node.right), getVertexForNodeType(node));
			return;
		}
		if (isObjectExpression(node)) {
			node.properties.forEach((prop) => {
				if (isProperty(prop) && prop.kind === 'init' && (isIdentifier(prop.key) || isLiteral(prop.key))) {
					flowGraph.addEdge(getVertexForNodeType(prop.value), propertyVertex(prop.key));
				}
			});
			return;
		}
		if (isReturnStatement(node)) {
			if (node.argument) {
				if (!node.attributes?.enclosingFunction) {
					panic('[FlowGraph::addIntraProceduralEdges] Missing enclosing function');
					return false;
				}
				flowGraph.addEdge(
					getVertexForNodeType(node.argument),
					returnVertex(createExtendedNodeT(node.attributes.enclosingFunction))
				);
			}
			return;
		}
		if (isSequenceExpression(node)) {
			const { expressions } = node;
			flowGraph.addEdge(getVertexForNodeType(expressions[expressions.length - 1]), getVertexForNodeType(node));
			return;
		}
		if (isThrowStatement(node)) {
			flowGraph.addEdge(getVertexForNodeType(node.argument), unknownVertex());
			return;
		}
		if (isVariableDeclarator(node)) {
			if (isIdentifier(node.id) && node.init) {
				// flowGraph.addEdge(getVertexForNodeType(node.init), getVertexForNodeType(node.id));
				flowGraph.addEdge(getVertexForNodeType(node), getVertexForNodeType(node.id));
			}
			return;
		}
		if (isObjectPattern(node)) {
			for (const prop of node.properties) {
				if (isProperty(prop) && (isLiteral(prop.key) || isIdentifier(prop.key))) {
					flowGraph.addEdge(propertyVertex(prop.key), getVertexForNodeType(prop.value));
				}
			}
			return;
		}
		if (isArrayPattern(node)) {
			node.elements.forEach((el, idx) => {
				if (el) {
					flowGraph.addEdge(propertyVertex({ type: 'Literal', value: idx }), getVertexForNodeType(el));
				}
			});
			return;
		}
		if (isMethodDefinition(node)) {
			if (isIdentifier(node.key) && isFunctionType(node.value)) {
				flowGraph.addEdge(functionVertex(node.value), propertyVertex(node.key));
			}
			return;
		}
		if (isExpressionStatement(node)) {
			if (isUpdateExpresion(node.expression)) {
				flowGraph.addEdge(getVertexForNodeType(node.expression.argument), getVertexForNodeType(node.expression));
			}
			if (isBinaryExpression(node.expression) && isIdentifier(node.expression.left)) {
				flowGraph.addEdge(getVertexForNodeType(node.expression.left), getVertexForNodeType(node.expression));
			}
		}
	});

	return flowGraph;
}

export function getVertexForNodeType(node: ExtendedNode | n.Node): Vertex {
	const _node = createExtendedNode(node);
	if (isIdentifier(_node)) {
		if (!_node.attributes?.scope) {
			panic('[FlowGraph::getVertexForNodeType] Missing scope in node');
		}
		const decl = _node.attributes?.scope?.get(_node.name);
		return decl &&
			O.isSome(decl) &&
			decl.value.attributes?.scope &&
			!decl.value.attributes.scope.global &&
			isIdentifier(decl.value)
			? variableVertex(decl.value)
			: globalVertex(_node);
	}
	if (isThisExpression(_node)) {
		const decl = _node.attributes?.scope?.get('this');
		return decl && O.isSome(decl) && isIdentifier(decl.value) ? variableVertex(decl.value) : expressionVertex(_node);
	}
	if (isClassExpression(_node)) {
		if (_node.id) {
			return getVertexForNodeType(_node.id);
		}

		const { body } = _node.body;

		for (const b of body) {
			if (isMethodDefinition(b)) {
				if (b.kind === 'constructor' && isFunctionType(b.value)) {
					return functionVertex(b.value);
				}
			}
		}
	}
	if (isMemberExpression(_node)) {
		if (!_node.computed) {
			if (isLiteral(_node.property) || isIdentifier(_node.property)) {
				return propertyVertex(_node.property);
			}
		}
	}
	if (isVariableDeclarator(_node)) {
		return variableDeclaratorVertex(_node);
	}
	return expressionVertex(_node);
}

// Singleton global cache of property vertices
const propertyVertices = new SymbolTable<Vertex>();

export function propertyVertex(node: n.Identifier | n.Literal): Vertex {
	let prop = '';
	if (isIdentifier(node)) {
		prop = node.name;
	} else if (isLiteral(node)) {
		prop = node.value?.toString() ?? '';
	} else {
		panic('[FlowGraph::propertyVertex] Invalid property type');
	}

	const propVertex = propertyVertices.get(prop);
	if (O.isSome(propVertex)) {
		return propVertex.value;
	}
	const newPropVertex = {
		type: 'PropertyVertex',
		name: prop,
		attributes: {
			prettyPrint: () => 'Prop(' + prop + ')',
		},
	};
	propertyVertices.set(prop, newPropVertex);
	return newPropVertex;
}

function variableVertex(node: ExtendedNodeT<n.Identifier>): Vertex {
	if (!node.attributes) {
		node.attributes = {};
	}

	if (!node.attributes?.variableVertex) {
		node.attributes.variableVertex = {
			type: 'VariableVertex',
			node: node,
			attributes: {
				prettyPrint: () => 'Var(' + node.name + ', ' + prettyPrintPosition(node) + ')',
			},
		};
	}
	return node.attributes.variableVertex;
}

// Singleton global cache of global vertices
const globalVertices = new SymbolTable<Vertex>();

function globalVertex(node: n.Identifier | n.Literal): Vertex {
	let prop = '';
	if (isIdentifier(node)) {
		prop = node.name;
	} else if (isLiteral(node)) {
		prop = node.value?.toString() ?? '';
	} else {
		panic('[FlowGraph::globalVertex] Invalid global vertex type');
	}

	const globalVertex = globalVertices.get(prop);
	if (O.isSome(globalVertex)) {
		return globalVertex.value;
	}
	const newGlobalVertex = {
		type: 'GlobalVertex',
		name: prop,
		attributes: {
			prettyPrint: () => 'Glob(' + prop + ')',
		},
	};
	globalVertices.set(prop, newGlobalVertex);
	return newGlobalVertex;
}

function expressionVertex(node: ExtendedNodeT<n.Node>): Vertex {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.expressionVertex) {
		return node.attributes.expressionVertex;
	} else {
		node.attributes.expressionVertex = {
			type: 'ExpressionVertex',
			node,
			attributes: {
				prettyPrint: () => 'Expr(' + prettyPrintPosition(node) + ')',
			},
		};
		return node.attributes.expressionVertex;
	}
}

export function functionVertex(fn: ExtendedNodeT<FunctionType>): Vertex {
	if (!fn.attributes) {
		fn.attributes = {};
	}

	if (fn.attributes.functionVertex) {
		return fn.attributes.functionVertex;
	} else {
		const newFnVertex = {
			type: 'FunctionVertex',
			function: fn,
			attributes: {
				prettyPrint: () => 'Func(' + prettyPrintPosition(fn) + ')',
			},
		};
		fn.attributes.functionVertex = newFnVertex;
		return newFnVertex;
	}
}

const nativeVertices = new SymbolTable<Vertex>();

/**
 * @function nativeVertex creates a vertex for native functions
 */
export function nativeVertex(name: string): Vertex {
	const nativeVertex = nativeVertices.get(name);
	if (O.isSome(nativeVertex)) {
		return nativeVertex.value;
	} else {
		const newVertex: NativeVertex = {
			type: 'NativeVertex',
			name,
			attributes: {
				prettyPrint: () => name,
			},
		};
		nativeVertices.set(name, newVertex);
		return newVertex;
	}
}

export function getNativeVertices(): Vertex[] {
	return nativeVertices.values();
}

/**
 * @function unknownVertex handles vertices that are not currently supported
 */
export function unknownVertex(): Vertex {
	return {
		type: 'UnknownVertex',
		attributes: {
			prettyPrint: () => 'Unknown',
		},
	};
}

// @ts-expect-error Function will always return Vertex. Otherwise, it will crash
export function paramVertex(fn: ExtendedNodeT<FunctionType>, idx: number): Vertex {
	if (idx === 0) {
		if (!fn.attributes?.scope) {
			panic('[FlowGraph::paramVertex] Missing scope attributes');
		} else {
			const varNode = fn.attributes.scope.get('this');
			if (O.isNone(varNode) || !isIdentifier(varNode.value)) {
				panic('[FlowGraph::paramVertex] Missing scope attributes: this');
			} else {
				return variableVertex(varNode.value);
			}
		}
	} else {
		return getVertexForNodeType(fn.params[idx - 1]);
	}
}

export function returnVertex(fn: ExtendedNodeT<FunctionType>): Vertex {
	if (!fn.attributes) {
		fn.attributes = {};
	}
	if (fn.attributes.returnVertex) {
		return fn.attributes.returnVertex;
	}
	fn.attributes.returnVertex = {
		type: 'ReturnVertex',
		node: fn,
		attributes: {
			prettyPrint: () => 'Ret(' + prettyPrintPosition(fn) + ')',
		},
	};
	return fn.attributes.returnVertex;
}

function calleeVertex(node: ExtendedNodeT<n.CallExpression | n.NewExpression>): Vertex {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.calleeVertex) {
		return node.attributes.calleeVertex;
	}
	node.attributes.calleeVertex = {
		type: 'CalleeVertex',
		call: node,
		attributes: {
			prettyPrint: () => 'Callee(' + prettyPrintPosition(node) + ')',
		},
	};
	return node.attributes.calleeVertex;
}

/**
 * ith argument at a call site, 0th argument is receiver
 */
export function argVertex(node: ExtendedNodeT<n.CallExpression | n.NewExpression>, idx: number): Vertex {
	if (idx === 0) {
		if (!node.attributes) {
			node.attributes = {};
		}
		if (node.attributes.receiverVertex) {
			return node.attributes.receiverVertex;
		}
		node.attributes.receiverVertex = {
			type: 'ArgumentVertex',
			node,
			attributes: {
				prettyPrint: () => 'Arg(' + prettyPrintPosition(node) + ', 0)',
			},
		};
		return node.attributes.receiverVertex;
	} else {
		const _arg = node.arguments[idx - 1] as ExtendedNode;
		if (!_arg.attributes) {
			_arg.attributes = {};
		}
		if (_arg.attributes.argumentVertex) {
			return _arg.attributes.argumentVertex;
		}
		_arg.attributes.argumentVertex = {
			type: 'ArgumentVertex',
			node,
			index: idx,
			attributes: {
				prettyPrint: () => 'Arg(' + prettyPrintPosition(node) + ', ' + idx + ')',
			},
		} as ArgumentVertex;
		return _arg.attributes.argumentVertex;
	}
}

export function resultVertex(node: ExtendedNodeT<n.CallExpression | n.NewExpression>): Vertex {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.resultVertex) {
		return node.attributes.resultVertex;
	}
	node.attributes.resultVertex = {
		type: 'ResultVertex',
		node,
		attributes: {
			prettyPrint: () => 'Res(' + prettyPrintPosition(node) + ')',
		},
	};
	return node.attributes.resultVertex;
}

export function variableDeclaratorVertex(node: ExtendedNodeT<n.VariableDeclarator>): Vertex {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.variableDeclaratorVertex) {
		return node.attributes.variableDeclaratorVertex;
	}
	node.attributes.variableDeclaratorVertex = {
		type: 'VariableDeclaratorVertex',
		variableDeclarator: node,
		attributes: {
			prettyPrint: () => 'VarDecl(' + prettyPrintPosition(node) + ')',
		},
	};
	return node.attributes.variableDeclaratorVertex;
}
