/* eslint-disable no-fallthrough */
import { ProgramCollection, walk } from '@lib-frontend/ast';
import {
	isArrayPattern,
	isArrowFunctionExpression,
	isCatchClause,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isMemberExpression,
	isObjectPattern,
	isProperty,
	isThisExpression,
	isVariableDeclarator,
	ExtendedNodeT,
	ExtendedNode,
} from '@lib-frontend/astTypes';
import SymbolTable from '@lib-ir/symbolTable';
import { namedTypes as n } from 'ast-types';

// Populates symbol table lexically
export function addBindings(ast: ProgramCollection): void {
	const globalScope = new SymbolTable<ExtendedNodeT<n.Literal | n.Identifier>>();
	globalScope.global = true;
	let currScope = globalScope;
	let declaredScope = currScope;
	walk(
		ast,
		(node, traverse, parent, childPropName, state) => {
			if (!state) {
				state = {
					withinParams: false,
					withinDeclarator: false,
				};
			}
			if (isFunctionDeclaration(node)) {
				if (node.id && isIdentifier(node.id)) {
					declaredScope.set(node.id.name, node.id);
					traverse(node.id);
				}
			}

			if (isFunctionExpression(node) || isArrowFunctionExpression(node)) {
				const prevDeclaratedScope = declaredScope;
				declaredScope = new SymbolTable<ExtendedNodeT<n.Literal | n.Identifier>>(currScope);
				currScope = declaredScope;
				currScope.global = false;

				if (!node.attributes) {
					node.attributes = {};
				}
				node.attributes.scope = currScope;

				if (node.id && isIdentifier(node.id)) {
					declaredScope.set(node.id.name, node.id);
					traverse(node.id);
				}

				declaredScope.set('this', {
					type: 'Identifier',
					name: 'this',
					loc: node.loc,
					range: node.range,
					attributes: {
						enclosingFile: node.attributes.enclosingFile,
						scope: declaredScope,
					},
				});

				state = {
					...state,
					withinParams: true,
				};

				for (let i = 0; i < node.params.length; ++i) {
					const curr = node.params[i];
					if (isIdentifier(curr)) {
						declaredScope.set(curr.name, curr);
					}
					traverse(curr);
				}
				state.withinParams = false;
				traverse(node.body);

				if (!declaredScope.has('arguments')) {
					declaredScope.set('arguments', {
						type: 'Identifier',
						name: 'arguments',
						loc: node.loc,
						range: node.range,
						attributes: {
							enclosingFile: node.attributes?.enclosingFile,
							scope: declaredScope,
						},
					} as ExtendedNodeT<n.Identifier>);
				}

				currScope = currScope.outerScope!;
				declaredScope = prevDeclaratedScope;
				return false;
			}

			if (isCatchClause(node)) {
				currScope = new SymbolTable(currScope);
				currScope.global = false;
				if (node.param && isIdentifier(node.param)) {
					currScope.set(node.param.name, node.param);
				}

				node.param && traverse(node.param);
				traverse(node.body);

				currScope = currScope.outerScope!;
				return false;
			}

			if (isIdentifier(node) || isThisExpression(node)) {
				node.attributes = {
					...node.attributes,
					scope: declaredScope,
				};
				return true;
			}

			if (isMemberExpression(node)) {
				traverse(node.object);
				if (node.computed) {
					traverse(node.property);
				}
				return false;
			}

			if (isVariableDeclarator(node)) {
				/**
				 * If node.id is identifier and hasn't been declared in the scope, set a new declaration
				 * in this scope. If variable is declared twice, ignore the second one
				 */
				if (isIdentifier(node.id) && !declaredScope.has(node.id.name)) {
					declaredScope.set(node.id.name, node.id);
				}
				state.withinDeclarator = true;
				traverse(node.id);
				node.init && traverse(node.init);
				state.withinDeclarator = false;
				return false;
			}

			if (isObjectPattern(node)) {
				for (const prop of node.properties) {
					if (
						(state.withinDeclarator || state.withinParams) &&
						isProperty(prop) &&
						prop.value &&
						isIdentifier(prop.value) &&
						!declaredScope.has(prop.value.name)
					) {
						declaredScope.set(prop.value.name, prop.value);
					}
				}
				return false;
			}

			if (isArrayPattern(node)) {
				for (const el of node.elements) {
					if (el) {
						if ((state.withinDeclarator || state.withinParams) && isIdentifier(el) && !declaredScope.has(el.name)) {
							declaredScope.set(el.name, el);
						}
						traverse(el);
					}
				}
				return false;
			}

			if (isProperty(node)) {
				traverse(node.key);
				traverse(node.value);
				return false;
			}
			return true;
		},
		{ withinDeclarator: false, withinParams: false }
	);
}
