/**
 * @module astTypes provide type narrowing predicates from ExtendedNode to namedTyped
 */
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
	scope: SymbolTable;
};

/**
 * @type ExtendedNode Adds extra metadata to be used for parsing. Extends ast-types::Node.
 */
export type ExtendedNode = n.Node & {
	range?: [number, number];
	attributes?: Partial<Attributes>;
};

// For use when extending a specific AST node
export type ExtendedNodeT<T extends n.Node> = T & {
	range?: [number, number];
	attributes?: Partial<Attributes>;
};

export type FunctionType = n.FunctionExpression | n.FunctionDeclaration | n.ArrowFunctionExpression;

export type CallType = n.CallExpression | n.NewExpression;

export function isFunctionExpression(node: ExtendedNode): node is n.FunctionExpression {
	return node.type === 'FunctionExpression';
}

export function isFunctionDeclaration(node: ExtendedNode): node is n.FunctionDeclaration {
	return node.type === 'FunctionDeclaration';
}

export function isArrowFunctionExpression(node: ExtendedNode): node is n.ArrowFunctionExpression {
	return node.type === 'ArrowFunctionExpression';
}

export function isMethodDefinition(node: ExtendedNode): node is n.MethodDefinition {
	return node.type === 'MethodDefinition';
}

export function isIdentifier(node: ExtendedNode): node is n.Identifier {
	return node.type === 'Identifier';
}

export function isLiteral(node: ExtendedNode): node is n.Literal {
	return node.type === 'Literal';
}

export function isCallExpression(node: ExtendedNode): node is n.CallExpression {
	return node.type === 'CallExpression';
}

export function isNewExpression(node: ExtendedNode): node is n.NewExpression {
	return node.type === 'NewExpression';
}

export function isProperty(node: ExtendedNode): node is n.Property {
	return node.type === 'Property';
}

export function isCatchClause(node: ExtendedNode): node is n.CatchClause {
	return node.type === 'CatchClause';
}

export function isThisExpression(node: ExtendedNode): node is n.ThisExpression {
	return node.type === 'ThisExpression';
}

export function isMemberExpression(node: ExtendedNode): node is n.MemberExpression {
	return node.type === 'MemberExpression';
}

export function isVariableDeclarator(node: ExtendedNode): node is n.VariableDeclarator {
	return node.type === 'VariableDeclarator';
}

export function isObjectPattern(node: ExtendedNode): node is n.ObjectPattern {
	return node.type === 'ObjectPattern';
}

export function isPropertyPattern(node: ExtendedNode): node is n.PropertyPattern {
	return node.type === 'PropertyPattern';
}

export function isArrayPattern(node: ExtendedNode): node is n.ArrayPattern {
	return node.type === 'ArrayPattern';
}

export function isFunctionType(node: ExtendedNode): node is FunctionType {
	return isFunctionExpression(node) || isFunctionDeclaration(node) || isArrowFunctionExpression(node);
}

export function isAssignmentExpression(node: ExtendedNode): node is n.AssignmentExpression {
	return node.type === 'AssignmentExpression';
}

export function isBlockStatement(node: ExtendedNode): node is n.BlockStatement {
	return node.type === 'BlockStatement';
}

export function isReturnStatement(node: ExtendedNode): node is n.ReturnStatement {
	return node.type === 'ReturnStatement';
}

// Non type related utils below

function isAnon(functionName: string) {
	return functionName === 'anon';
}

function isModuleExports(node: n.Node): boolean {
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
