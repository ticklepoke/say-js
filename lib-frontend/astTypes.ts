/**
 * @module astTypes provide type narrowing predicates from ExtendedNode to namedTyped
 */
import { CalleeVertex, FunctionVertex, NodeVertex } from '@lib-calllgraph/vertex';
import SymbolTable from '@lib-ir/symbolTable';
import { namedTypes as n } from 'ast-types';

type Attributes = {
	fileName: string;
	functions: FunctionType[];
	calls: CallType[];
	enclosingFunction: FunctionType;
	enclosingFile: string;
	parent: ExtendedNode;
	childPropName: string;
	scope: SymbolTable<ExtendedNode>;

	// Pointers to vertex objects to be inserted into graphs
	variableVertex: NodeVertex;
	functionVertex: FunctionVertex;
	expressionVertex: NodeVertex;
	returnVertex: NodeVertex;
	calleeVertex: CalleeVertex;
	resultVertex: NodeVertex;
	receiverVertex: NodeVertex;
	argumentVertex: NodeVertex;
};

/**
 * @type ExtendedNode Adds extra metadata to be used for parsing. Extends ast-types::Node.
 */
export type ExtendedNode = n.Node & {
	range?: [number, number];
	attributes: Partial<Attributes>;
};

// For use when extending a specific AST node
export type ExtendedNodeT<T extends n.Node> = T & {
	range?: [number, number];
	attributes: Partial<Attributes>;
};

export type FunctionType = n.FunctionExpression | n.FunctionDeclaration | n.ArrowFunctionExpression;

export type CallType = n.CallExpression | n.NewExpression;

export function isFunctionExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.FunctionExpression> {
	return node.type === 'FunctionExpression';
}

export function isFunctionDeclaration(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.FunctionDeclaration> {
	return node.type === 'FunctionDeclaration';
}

export function isArrowFunctionExpression(
	node: ExtendedNode | n.Node
): node is ExtendedNodeT<n.ArrowFunctionExpression> {
	return node.type === 'ArrowFunctionExpression';
}

export function isMethodDefinition(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.MethodDefinition> {
	return node.type === 'MethodDefinition';
}

export function isIdentifier(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.Identifier> {
	return node.type === 'Identifier';
}

export function isLiteral(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.Literal> {
	return node.type === 'Literal';
}

export function isCallExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.CallExpression> {
	return node.type === 'CallExpression';
}

export function isNewExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.NewExpression> {
	return node.type === 'NewExpression';
}

export function isProperty(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.Property> {
	return node.type === 'Property';
}

export function isCatchClause(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.CatchClause> {
	return node.type === 'CatchClause';
}

export function isThisExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ThisExpression> {
	return node.type === 'ThisExpression';
}

export function isMemberExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.MemberExpression> {
	return node.type === 'MemberExpression';
}

export function isVariableDeclarator(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.VariableDeclarator> {
	return node.type === 'VariableDeclarator';
}

export function isObjectPattern(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ObjectPattern> {
	return node.type === 'ObjectPattern';
}

export function isPropertyPattern(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.PropertyPattern> {
	return node.type === 'PropertyPattern';
}

export function isArrayPattern(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ArrayPattern> {
	return node.type === 'ArrayPattern';
}

export function isFunctionType(node: ExtendedNode | n.Node): node is ExtendedNodeT<FunctionType> {
	return isFunctionExpression(node) || isFunctionDeclaration(node) || isArrowFunctionExpression(node);
}

export function isAssignmentExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.AssignmentExpression> {
	return node.type === 'AssignmentExpression';
}

export function isBlockStatement(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.BlockStatement> {
	return node.type === 'BlockStatement';
}

export function isReturnStatement(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ReturnStatement> {
	return node.type === 'ReturnStatement';
}

export function isArrayExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ArrayExpression> {
	return node.type === 'ArrayExpression';
}

export function isClassExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ClassExpression> {
	return node.type === 'ClassExpression';
}

export function isClassDeclaration(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ClassDeclaration> {
	return node.type === 'ClassDeclaration';
}

export function isConditionalExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ConditionalExpression> {
	return node.type === 'ConditionalExpression';
}

export function isLogicalExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.LogicalExpression> {
	return node.type === 'LogicalExpression';
}

export function isObjectExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ObjectExpression> {
	return node.type === 'ObjectExpression';
}

export function isSequenceExpression(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.SequenceExpression> {
	return node.type === 'SequenceExpression';
}

export function isThrowStatement(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ThrowStatement> {
	return node.type === 'ThrowStatement';
}

export function isExportDefaultDeclaration(
	node: ExtendedNode | n.Node
): node is ExtendedNodeT<n.ExportDefaultDeclaration> {
	return node.type === 'ExportDefaultDeclaration';
}

export function isExportAllDeclaration(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ExportAllDeclaration> {
	return node.type === 'ExportAllDeclaration';
}

export function isExportNamedDeclaration(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ExportNamedDeclaration> {
	return node.type === 'ExportNamedDeclaration';
}

export function isImportDeclaration(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ImportDeclaration> {
	return node.type === 'ImportDeclaration';
}

export function isImportSpecifier(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ImportSpecifier> {
	return node.type === 'ImportSpecifier';
}

export function isImportDefaultSpecifier(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.ImportDefaultSpecifier> {
	return node.type === 'ImportDefaultSpecifier';
}

export function isImportNamespaceSpecifier(
	node: ExtendedNode | n.Node
): node is ExtendedNodeT<n.ImportNamespaceSpecifier> {
	return node.type === 'ImportNamespaceSpecifier';
}

// Non type narrowing utils below

export function isModuleExports(node: ExtendedNode): boolean {
	if (!isAssignmentExpression(node)) {
		return false;
	}

	const { left } = node;

	if (!isMemberExpression(left)) {
		return false;
	}

	const { object, property } = left;

	if (!isIdentifier(object) || !isIdentifier(property)) {
		return false;
	}

	return object.name === 'module' && property.name === 'exports';
}

// Check if a node calls a function
export function isCallTo(node: n.Node, fnName: string): boolean {
	if (!isCallExpression(node)) {
		return false;
	}

	const { callee } = node;

	if (!isIdentifier(callee)) {
		return false;
	}

	return callee.name === fnName;
}
