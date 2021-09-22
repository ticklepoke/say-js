/**
 * @module vertex Holds types for verticex to be added to graphs
 */
import {
	ExtendedNode,
	ExtendedNodeT,
	FunctionType,
	isAssignmentExpression,
	isBinaryExpression,
	isCallExpression,
	isUpdateExpresion,
} from '@lib-frontend/astTypes';
import {
	enclosingFunctionName,
	functionName,
	prettyPrintPosition,
	variableDeclaratorName,
	variableIdentifierName,
} from '@lib-frontend/astUtils';
import { panic } from '@utils/macros';
import { namedTypes as n } from 'ast-types';

export type Vertex = {
	type: string;
	attributes: {
		prettyPrint: () => string;
		ofInterest?: boolean;
	};
};

export type NodeVertex = Vertex & {
	node: ExtendedNode;
};

export type ArgumentVertex = NodeVertex & {
	index: number;
};

export type FunctionVertex = Vertex & {
	function: ExtendedNodeT<FunctionType>;
};

export type CalleeVertex = Vertex & {
	call: ExtendedNodeT<n.CallExpression | n.NewExpression>;
};

export type NativeVertex = Vertex & {
	name: string;
};

export type VariableDeclaratorVertex = Vertex & {
	variableDeclarator: ExtendedNodeT<n.VariableDeclarator>;
};

export type GlobalVertex = Vertex & {
	name: string;
};

export type ExpressionVertex = Vertex & {
	node: ExtendedNode;
};

// Type narrowing utils below
export function isCalleeVertex(v: Vertex): v is CalleeVertex {
	return v.type === 'CalleeVertex';
}

export function isFunctionVertex(v: Vertex): v is FunctionVertex {
	return v.type === 'FunctionVertex';
}

export function isNativeVertex(v: Vertex): v is NativeVertex {
	return v.type === 'NativeVertex';
}

export function isVariableVertex(v: Vertex): v is NodeVertex {
	return v.type === 'VariableVertex';
}

export function isVariableDeclaratorVertex(v: Vertex): v is VariableDeclaratorVertex {
	return v.type === 'VariableDeclaratorVertex';
}

export function isNodeVertex(v: Vertex): v is NodeVertex {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return !!(v as any).node;
}

export function isArgumentVertex(v: Vertex): v is ArgumentVertex {
	return v.type === 'ArgumentVertex';
}

export function isGlobalVertex(v: Vertex): v is GlobalVertex {
	return v.type === 'GlobalVertex';
}

export function isExpressionVertex(v: Vertex): v is ExpressionVertex {
	return v.type === 'ExpressionVertex';
}

export function prettyPrintVertex(v: Vertex): string | undefined {
	if (isGlobalVertex(v)) {
		return 'global.' + v.name;
	}

	if (isCalleeVertex(v)) {
		return (
			"'" +
			enclosingFunctionName(v.call.attributes.enclosingFunction) +
			'.' +
			variableIdentifierName(v.call.callee) +
			"()' (" +
			prettyPrintPosition(v.call) +
			')'
		);
	}
	if (isFunctionVertex(v)) {
		return "'" + functionName(v.function) + "' (" + prettyPrintPosition(v.function) + ')';
	}

	if (isNativeVertex(v)) {
		return "'" + v.name + "' (Native)";
	}

	if (isVariableDeclaratorVertex(v)) {
		return "'" + variableDeclaratorName(v.variableDeclarator) + "' (" + prettyPrintPosition(v.variableDeclarator) + ')';
	}

	if (isVariableVertex(v)) {
		return "'" + variableIdentifierName(v.node) + "' (" + prettyPrintPosition(v.node) + ')';
	}

	if (isArgumentVertex(v) && isCallExpression(v.node)) {
		return (
			"'" +
			enclosingFunctionName(v.node.attributes.enclosingFunction) +
			'.' +
			variableIdentifierName(v.node.callee) +
			'(' +
			variableIdentifierName(v.node.arguments[v.index - 1]) +
			')' +
			"' (" +
			prettyPrintPosition(v.node) +
			')'
		);
	}

	if (isNodeVertex(v)) {
		if (isAssignmentExpression(v.node)) {
			return "'" + variableIdentifierName(v.node.left) + "' (" + prettyPrintPosition(v.node) + ')';
		}
		if (isUpdateExpresion(v.node)) {
			return "'" + variableIdentifierName(v.node.argument) + "' (" + prettyPrintPosition(v.node) + ')';
		}
		if (isBinaryExpression(v.node)) {
			return "'" + variableIdentifierName(v.node.left) + "' (" + prettyPrintPosition(v.node) + ')';
		}
	}
	panic('[vertex::prettyPrintVertex]: Unknown vertex');
}
