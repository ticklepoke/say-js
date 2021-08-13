/**
 * @module vertex Holds types for verticex to be added to graphs
 */
import { ExtendedNode, ExtendedNodeT, FunctionType } from '@lib-frontend/astTypes';
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

export type FunctionVertex = Vertex & {
	function: ExtendedNodeT<FunctionType>;
};

export type CalleeVertex = Vertex & {
	call: ExtendedNodeT<n.CallExpression | n.NewExpression>;
};

export type NativeVertex = Vertex & {
	name: string;
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
