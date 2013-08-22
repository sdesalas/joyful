
// Inject Joyful test generation library
phantom.injectJs("Joyful.core.js");
phantom.injectJs("Joyful.suite.js");

// # TEST SUITE "My Test Suite"
Joyful.suite.name = "My Test Suite";

// # TEST "My First Test"
Joyful.suite.tests.push({
	name: "My First Test",
	payload: function(page) {

		// # GO TO "http://www.phantomjs.org"
		Joyful.suite.open("http://www.phantomjs.org", function(page) {

			// # CHECK "a#download" EXISTS
			Joyful.assertExists(page, 'a#download');

		});

	}
});


Joyful.suite.execute();




