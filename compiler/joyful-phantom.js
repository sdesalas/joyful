/**
* joyful-phantom.js
*
* Converts joyful language into a phantom executable script
*
*/

Joyful = this.Joyful || {};

(function() {

Joyful.compile = function(code) {

	var output = [
		'// Inject Joyful test generation library',
		'phantom.injectJs("Joyful.core.js");',
		'phantom.injectJs("Joyful.suite.js");',
		'// Add Suite logic',
		'Joyful.suite.lines = ['
	];

	if (code && typeof code === 'string') {

		var words, line, match, func = [], lines = code.split('\n');

		if (lines.length) {

			for (var i = 0; i < lines.length; i++) {

				// Trim line
				line = lines[i].replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');
				words = line.split(' ');
				if (words && words.length) {
					// Check BLANK LINE
					if (line === '') {
						func.push('function(page) {}');
					}
					// Check TEST SUITE
					match = line.match(/^TEST SUITE ("[^"]*")$/i);
					if (match) {
						func.push('function(page) {this.name = ' + match[1] + ';}');
					}
					// Check TEST
					match = line.match(/^TEST ("[^"]*")$/i);
					if (match) {
						func.push('function(page) {this.tests.push(' + match[1] + ');}')
					}
					// Check GO TO
					match = line.match(/^GO TO ("[^"]*")$/i);
					if (match) {
						func.push('function(page) {page.open(' + match[1] + ');}')
					}
					// Check CLICK
					match = line.match(/^CLICK ("[^"]*")$/i);
					if (match) {
						func.push('function(page) {page.click(' + match[1] + ');}')
					}
					// Check CHECK LOCATION LIKE
					match = line.match(/^CHECK LOCATION LIKE ("[^"]*")$/i);
					if (match) {
						func.push('function(page) {page.locationLike(' + match[1] + ');}')
					}
					// Check CHECK EXISTS
					match = line.match(/^CHECK ("[^"]*") EXISTS$/i);
					if (match) {
						func.push('function(page) {page.assertExists(' + match[1] + ');}')
					}
				}

				if (func.length - 1 !== i) {
					throw new Error('Line ' + i + ': Syntax error.');
				}

			}

			output.push(func.join(',\n'));

		}


	}

	output.push('];');
	output.push('// Execute');
	output.push('Joyful.suite.execute();');

	return output.join('\n');

};

})();


