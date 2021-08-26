export function panic(e: string): void {
	console.error(e);
	setTimeout(() => {
		process.exit(1);
	}, 1000);
}
