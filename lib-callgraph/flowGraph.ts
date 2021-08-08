import { FlowGraph } from '@lib-calllgraph/graph';
import { walk } from '@lib-frontend/ast';
import {
	ExtendedNode,
	ExtendedNodeT,
	FunctionType,
	isArrayExpression,
	isArrayPattern,
	isArrowFunctionExpression,
	isAssignmentExpression,
	isCallExpression,
	isCatchClause,
	isClassDeclaration,
	isClassExpression,
	isConditionalExpression,
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
	isVariableDeclarator,
} from '@lib-frontend/astTypes';
import { createExtendedNode, createExtendedNodeT, prettyPrintPosition } from '@lib-frontend/astUtils';
import SymbolTable from '@lib-ir/symbolTable';
import { panic } from '@utils/macros';
import { TSFixMe } from '@utils/types';
import { namedTypes as n } from 'ast-types';
import * as O from 'fp-ts/lib/Option';

export function addIntraProcedureEdges(ast: ExtendedNode, flowGraph = new FlowGraph()): FlowGraph {
	walk(ast, (node) => {
		if (isArrayExpression(node)) {
			node.elements.forEach((el, idx) => {
				if (el) {
					flowGraph.addEdge(getVertexForNodeType(el), propertyVertex({ type: 'Literal', value: idx }));
				}
			});
			return false;
		}
		if (isAssignmentExpression(node)) {
			if (node.operator === '=') {
				flowGraph.addEdges(getVertexForNodeType(node.right), [
					getVertexForNodeType(node.left),
					getVertexForNodeType(node),
				]);
			}
			return false;
		}
		if (isCallExpression(node)) {
			if (isMemberExpression(node.callee)) {
				flowGraph.addEdge(getVertexForNodeType(node.callee.object), argVertex(node, 0));
			}
			// fall through
		}
		if (isNewExpression(node)) {
			flowGraph.addEdge(getVertexForNodeType(node.callee), calleeVertex(node));
			node.arguments.forEach((arg, idx) => {
				flowGraph.addEdge(getVertexForNodeType(arg), argVertex(node, idx + 1));
			});
			flowGraph.addEdge(resultVertex(node), getVertexForNodeType(node));
			return false;
		}
		if (isCatchClause(node) && node.param && isIdentifier(node.param)) {
			flowGraph.addEdge(unknownVertex(), variableVertex(node.param));
			return false;
		}
		if (isConditionalExpression(node)) {
			flowGraph.addEdge(getVertexForNodeType(node.consequent), getVertexForNodeType(node));
			flowGraph.addEdge(getVertexForNodeType(node.alternate), getVertexForNodeType(node));
			return false;
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
			return false;
		}
		if (isFunctionDeclaration(node)) {
			if (node.id) {
				flowGraph.addEdge(functionVertex(node), getVertexForNodeType(node.id));
			}
			return false;
		}
		if (isFunctionExpression(node) || isArrowFunctionExpression(node)) {
			flowGraph.addEdge(functionVertex(node), expressionVertex(node));
			if (node.id && isIdentifier(node.id)) {
				flowGraph.addEdge(functionVertex(node), variableVertex(node.id));
			}
			return false;
		}
		if (isLogicalExpression(node)) {
			if (node.operator === '||') {
				flowGraph.addEdge(getVertexForNodeType(node.left), getVertexForNodeType(node));
			}
			flowGraph.addEdge(getVertexForNodeType(node.right), getVertexForNodeType(node));
			return false;
		}
		if (isObjectExpression(node)) {
			node.properties.forEach((prop) => {
				if (isProperty(prop) && prop.kind === 'init' && (isIdentifier(prop.key) || isLiteral(prop.key))) {
					flowGraph.addEdge(getVertexForNodeType(prop.value), propertyVertex(prop.key));
				}
			});
			return false;
		}
		if (isReturnStatement(node)) {
			if (node.argument) {
				if (!node.attributes?.enclosingFunction) {
					panic('Missing enclosing function');
					return false;
				}
				flowGraph.addEdge(
					getVertexForNodeType(node.argument),
					returnVertex(createExtendedNodeT(node.attributes.enclosingFunction))
				);
			}
			return false;
		}
		if (isSequenceExpression(node)) {
			const { expressions } = node;
			flowGraph.addEdge(getVertexForNodeType(expressions[expressions.length - 1]), getVertexForNodeType(node));
			return false;
		}
		if (isThrowStatement(node)) {
			flowGraph.addEdge(getVertexForNodeType(node.argument), unknownVertex());
			return false;
		}
		if (isVariableDeclarator(node)) {
			if (isIdentifier(node.id) && node.init) {
				flowGraph.addEdge(getVertexForNodeType(node.init), getVertexForNodeType(node.id));
			}
			return false;
		}
		if (isObjectPattern(node)) {
			for (const prop of node.properties) {
				if (isProperty(prop) && (isLiteral(prop.key) || isIdentifier(prop.key))) {
					flowGraph.addEdge(propertyVertex(prop.key), getVertexForNodeType(prop.value));
				}
			}
			return false;
		}
		if (isArrayPattern(node)) {
			node.elements.forEach((el, idx) => {
				if (el) {
					flowGraph.addEdge(propertyVertex({ type: 'Literal', value: idx }), getVertexForNodeType(el));
				}
			});
		}
		if (isMethodDefinition(node)) {
			if (isIdentifier(node.key) && isFunctionType(node.value)) {
				flowGraph.addEdge(functionVertex(node.value), propertyVertex(node.key));
			}
		}
		return false;
	});

	return flowGraph;
}

function getVertexForNodeType(node: ExtendedNode | n.Node): TSFixMe {
	const _node = createExtendedNode(node);
	if (isIdentifier(_node)) {
		if (!_node.attributes?.scope) {
			panic('Missing scope in node');
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
	return expressionVertex(_node);
}

// Singleton global cache of property vertices
const propertyVertices = new SymbolTable();

function propertyVertex(node: n.Identifier | n.Literal) {
	let prop = '';
	if (isIdentifier(node)) {
		prop = node.name;
	} else if (isLiteral(node)) {
		prop = node.value?.toString() ?? '';
	} else {
		// TODO: standardise error format
		panic('Invalid property type');
	}

	const propVertex = propertyVertices.get(prop);
	if (O.isSome(propVertex)) {
		return propVertex;
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

function variableVertex(node: ExtendedNodeT<n.Identifier>) {
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
const globalVertices = new SymbolTable();

function globalVertex(node: n.Identifier | n.Literal) {
	let prop = '';
	if (isIdentifier(node)) {
		prop = node.name;
	} else if (isLiteral(node)) {
		prop = node.value?.toString() ?? '';
	} else {
		panic('Invalid global vertex type');
	}

	const globalVertex = globalVertices.get(prop);
	if (O.isSome(globalVertex)) {
		return globalVertex;
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

function expressionVertex(node: ExtendedNodeT<n.Node>) {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.expressionVertex) {
		return node.attributes.expressionVertex;
	} else {
		node.attributes.expressionVertex = {
			type: 'ExprVertex',
			node,
			attributes: {
				prettyPrint: () => 'Expr(' + prettyPrintPosition(node) + ')',
			},
		};
		return node.attributes.expressionVertex;
	}
}

function functionVertex(fn: ExtendedNodeT<FunctionType>) {
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

const nativeVertices = new SymbolTable();

/**
 * @function nativeVertex creates a vertex for native functions
 */
export function nativeVertex(name: string): ExtendedNode {
	const nativeVertex = nativeVertices.get(name);
	if (O.isSome(nativeVertex)) {
		return nativeVertex.value;
	} else {
		const newVertex = {
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

export function getNativeVertices(): ExtendedNode[] {
	return nativeVertices.values;
}

/**
 * @function unknownVertex handles vertices that are not currently supported
 */
function unknownVertex() {
	return {
		type: 'UnknownVertex',
		attributes: {
			prettyPrint: () => 'Unknown',
		},
	};
}

export function paramVertex(fn: ExtendedNodeT<FunctionType>, idx: number): TSFixMe {
	if (idx === 0) {
		if (!fn.attributes?.scope) {
			panic('Missing scope attributes');
			return;
		}
		const varNode = fn.attributes.scope.get('this');
		if (O.isNone(varNode) || !isIdentifier(varNode.value)) {
			panic('Missing scope attributes: this');
			return;
		}
		return variableVertex(varNode.value);
	} else {
		return getVertexForNodeType(fn.params[idx - 1]);
	}
}

function returnVertex(fn: ExtendedNodeT<FunctionType>) {
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

function calleeVertex(node: ExtendedNodeT<n.CallExpression | n.NewExpression>) {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.calleeVertex) {
		return node.attributes.calleeVertex;
	}
	node.attributes.calleeVertex = {
		type: 'ReturnVertex',
		call: node,
		attributes: {
			prettyPrint: () => 'Ret(' + prettyPrintPosition(node) + ')',
		},
	};
	return node.attributes.returnVertex;
}

/**
 * ith argument at a call site, 0th argument is receiver
 */
function argVertex(node: ExtendedNodeT<n.CallExpression | n.NewExpression>, idx: number) {
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
			attributes: {
				prettyPrint: () => 'Arg(' + prettyPrintPosition(node) + ', ' + idx + ')',
			},
		};
	}
}

function resultVertex(node: ExtendedNodeT<n.CallExpression | n.NewExpression>) {
	if (!node.attributes) {
		node.attributes = {};
	}
	if (node.attributes.resultVertex) {
		return node.attributes.resultVertex;
	}
	node.attributes.resultVertex = {
		type: 'ReturnVertex',
		node,
		attributes: {
			prettyPrint: () => 'Ret(' + prettyPrintPosition(node) + ')',
		},
	};
	return node.attributes.resultVertex;
}
