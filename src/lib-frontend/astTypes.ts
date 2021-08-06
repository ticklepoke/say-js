/**
 * @module astTypes provide type narrowing predicates from ExtendedNode to namedTyped
 */
import { namedTypes as n } from 'ast-types';
import { ExtendedNode } from './ast';

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
