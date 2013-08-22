
Joyful = Joyful || {};


Joyful.suite = {

	// Name of Test Suite
	name: 'Test Suite',
	
	// List of tests
	tests: [],

	// Use a single page per suite of tests
	// This is so that you can build tests incrementally as a workflow
	page: require('webpage').create(),

	// Opens a URL and runs a payload inside the page
	open: function (url, payload) {

		console.log('Joyful.suite.open("' + url + '", callback)')
	
		this.page.open(url, function(status) {

			// If ok, load JQuery and execute payload
		    if ( status === "success" ) {
		    	Joyful.suite.page.injectJs('jquery-1.7.1.min.js');
		    	payload.call(this, Joyful.suite.page);
		    } else {
		    	console.log('Error Opening URL: ' + url + '.');
		    	phantom.exit();
		    }

		});

	},

	// Execute test suite	
	execute: function () {
		console.log('Joyful.suite.execute()');
		var i, test;
		// Flag status listeners
		this.page.onLoadStarted = function() {Joyful.suite.status = 'loading'};
		this.page.onLoadFinished = function() {Joyful.suite.status = 'ready'};
		this.page.onConsoleMessage = function(msg) {console.log(msg);};
		// Check completion at intervals
		this.intervalId = setInterval(function () {Joyful.suite.checkComplete.call(Joyful.suite)}, 1000);
		// Loop through each test
		for(var i = 0; i < this.tests.length; i++) {
			test = this.tests[i];
			if (test && test.name && test.payload) {
				console.log('Executing Test ' + (i + 1) + ': ' + test.name);
				test.payload.call(test, this.page);
				test.executed = true;
			}
		}
	},

	checkComplete: function() {
		console.log('Joyful.suite.checkComplete()');

		var i, test;

		if (this.status === 'loading') { 
			console.log('Page still loading');
			return false; 
		}

		for(var i = 0; i < this.tests.length; i++) {
			test = this.tests[i];
			if (test && test.name && test.payload) {
				if (!test.executed) {
					console.log('Test Unfinshed: ' + test.name);
					return false;
				}
			}
		}

		// All done
		console.log('COMPLETE: No More tests');
		clearInterval(this.intervalId);
		phantom.exit();

	}
	
};