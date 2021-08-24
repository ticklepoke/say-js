# Frontend

## Esprima, ast-types & ESTree

This project depends on [esprima](https://github.com/jquery/esprima) to generate the AST. The output AST is [ESTree](https://github.com/estree/estree) compliant.

[Ast-types](https://github.com/benjamn/ast-types) is used to provide better typescript support. It offers an esprima compatible, ESTree compliant type system.

## Type System

### `ProgramCollection` Type

This project extends the `ast-types` system be adding a `ProgramCollection` type. This type represents a collection of individual `Program`s from separate files.  

```ts
type ProgramCollection = {
    type: 'ProgramCollection',
    programs: Node[]
}
```

This wrapper type allows programs from multiple files to be handled elegantly as a single entity.

`Node` refers to any ESTree node. All specific instances of ESTree nodes extend from this type.

### `ExtendedNode`

This project also adds an `ExtendedNode` that extends the `Node` type. This allows several metadata fields to be captured when traversing the ESTree, which is needed for data flow analysis when generating the call graph.

### `ExtendedNodeT`: Generic, Polymorphic Types

`ExtendedNodeT<T>` behaves similarly to `ExtendedNode`, but provides support for generics. By passing a named `ast-types` type as a generic, we are able to create an extended type for that specifc named type. For example `ExtendedNodeT<Literal>` has both ESTree Literal properties and project specific metadata properties.

### Type Narrowing

The `Node` type can be type-narrowed to a specific ESTree node type using Typescript's [type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates). This is useful when we want to access properties on a specific ESTree node type.

```ts
function isProgram(node: ExtendedNode | n.Node): node is ExtendedNodeT<n.Program> {
	return node.type === 'Program';
}
```

