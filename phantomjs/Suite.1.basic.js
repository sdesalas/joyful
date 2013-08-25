
// Inject Joyful test generation library
phantom.injectJs("Joyful.core.js");
phantom.injectJs("Joyful.suite.js");


// Add Suite logic
Joyful.suite.lines = [
	function() {this.name = "My Test Suite";},
	function() {this.tests.push("My First Test");},
	function() {this.page.open("http://www.phantoms.org");},
	function() {this.page.assertExits('a#download');}
]

// Execute
Joyful.suite.execute();

