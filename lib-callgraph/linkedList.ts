import * as O from 'fp-ts/lib/Option';

class ListNode<T> {
	_element: O.Option<T>;
	_next: O.Option<ListNode<T>>;

	constructor(element: T | undefined) {
		this._element = O.fromNullable(element);
		this._next = O.none;
	}

	setNext(next: O.Option<ListNode<T>>): void {
		this._next = next;
	}

	getNext(): O.Option<ListNode<T>> {
		return this._next;
	}

	getElement(): O.Option<T> {
		return this._element;
	}
}

export class LinkedList<T> {
	_head: O.Option<ListNode<T>>;
	_size: number;

	constructor() {
		this._head = O.none;
		this._size = 0;
	}

	add(element: T): void {
		const newNode = new ListNode(element);
		newNode.setNext(this._head);
		this._head = O.some(newNode);
		this._size++;
	}

	remove(element: T): O.Option<T> {
		let current = this._head;
		let previous: O.Option<ListNode<T>> = O.none;
		while (O.isSome(current)) {
			const currentElement = current.value.getElement();
			if (O.isSome(currentElement) && currentElement.value === element) {
				if (O.isNone(previous)) {
					this._head = current.value.getNext();
				} else {
					previous.value.setNext(current.value.getNext());
				}
				this._size--;
				return currentElement;
			}
			previous = current;
			current = current.value.getNext();
		}
		return O.none;
	}

	has(element: T): boolean {
		let current = this._head;
		while (O.isSome(current)) {
			const currentElement = current.value.getElement();
			if (O.isSome(currentElement) && currentElement.value === element) {
				return true;
			}
			current = current.value.getNext();
		}
		return false;
	}

	isEmpty(): boolean {
		return this._size === 0;
	}

	getSize(): number {
		return this._size;
	}

	iter(): Iterator<ListNode<T>> {
		let value: O.Option<ListNode<T>> = O.none;
		let current = this._head;
		return {
			next: () => {
				if (O.isSome(current)) {
					value = current;
					current = current.value.getNext();
					return { value: value, done: false };
				} else {
					return { value: O.none, done: true };
				}
			},
		};
	}
}

type Iterator<T> = {
	next: () => {
		value: O.Option<T>;
		done: boolean;
	};
};
