

Joyful = {

	assertExists: function(page, selector, not) {
		console.log('Joyful.assertExists(page, selector, not)');

		var result = page.evaluate(function(selector) {
			return $(selector).length > 0;
		}, selector);

		if (result === !!not) {
			console.log('assertExists Error for Selector ' + selector);
		}

	}

};