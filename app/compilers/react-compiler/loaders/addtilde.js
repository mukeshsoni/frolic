module.exports = function(source) {
	var replaced = source

	if(source.match(/@import \'[^~]/) || source.match(/@import \"[^~]/)) {
		replaced = source.replace(/@import \'/g, '@import \'~')
		.replace(/@import \"/g, '@import \"~');
	}

	return replaced;
}
