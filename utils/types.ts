export type TSFixMe = unknown;

export type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? RecursivePartial<U>[]
		: T[P] extends Record<string, unknown>
		? RecursivePartial<T[P]>
		: T[P];
};
