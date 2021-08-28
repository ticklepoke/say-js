function bar() {
	let a = 1;
	bar(a);
	return 1;
}
bar();

module.exports = bar;
