/**
 * @module vertex Holds types for verticex to be added to graphs
 */
import { ExtendedNode, ExtendedNodeT, FunctionType } from '@lib-frontend/astTypes';
import { namedTypes as n } from 'ast-types';

export type Vertex = {
	type: string;
	attributes: {
		prettyPrint: () => string;
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
