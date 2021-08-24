# Conventions

The following coding conventions / styles are used throughout this project to improve readbility, debugability and developer experience.

## Functional Programming

While functional programming patterns are used in certain areas, this project does not adopt a fully functional paradigm. There are areas were object-oriented and imperative styles are also used. Functional programming paradigms are mostly used for mapping over data and error handling.

### Option (`Some(A)` / `None`)

The `Option` type replaces the need for `undefined`. `Some(A)` represents the presence of a variable `A` while `None` represents the absence of such a variable.

### Either (`Ok(A)` / `Err(error)`)

The `Either` type replaces the need for throwing errors. This is used in computation steps that can potentially fail. `Ok(A)` represents the result of a computation step succeeding and producting a variable `A`. `Err(error)` represents the computation step failing and reporting an `error`.

### No `try/catch`

Contrary to the `throw` and `try / catch` system provided natively in Javascript, the `Either` system reduces the need for a `try / catch` block around invocations that can fail. It is impossible to infer whether a function throws an error from its signature alone. The `Either` type provides a more verbose indication of whether a function can fail.

