(function(GLOBAL){


	var fs = require("fs");
	var runner = require("./runner");

	// Define singleton compiler
	var Compiler = {}


	// Define some properties
	Compiler.output = [];
	Compiler.args = {};
	Compiler.asserts = 0;
	Compiler.screenshot = 1;
	Compiler.testname = "Default Test";
	Compiler.indent = 0;


	// Adds formatted text 
	// ie compiler.addLine("This is {0} line of {1} text", 1, "cool");
	Compiler.add = function() {
		if (arguments.length > 1) {
		    var str = arguments[0], args = Array.prototype.slice.call(arguments, 1);
		    this.output.push(Array(this.indent).join(' ') + str.replace(/{(\d+)}/g, function(match, number) { 
		      return typeof args[number] != 'undefined'
		        ? args[number]
		        : match
		      ;
		    }));
		} else {
			// No extra arguments? 
			// Use first argument or empty string
			this.output.push(Array(this.indent).join(' ') + arguments[0] || "");
		}
	};



	// Try and resolve any variables
	Compiler.resolve = function(variable) {
		if (variable.indexOf("@") === 0) {
			// Does this variable exist?
			if (this.args[variable.substr(1)]) {
				return 'args["' + variable.substr(1) + '"]';
			} else {
				// No? We have a problem
				throw new Error('Compiler error. You forgot to set variable ' + variable + '. ');
			}
		} else {
			return variable;
		}
	};


	// Resolves a path relative to the results folder 
	// This is used to place screenshots in the results folder
	// TODO: Improve this by using a compiler property (ie Compiler.imagefolder)
	Compiler.resultspath = function(path) {
		if (runner && runner.resultsfolder) {
			return fs.absolute(runner.resultsfolder + '/' + path);
		}
		return path;
	}



	// Reset the compiler
	Compiler.reset = function(testname, args) {
		this.testname = testname;
		this.args = {};
		this.output = [];
		this.asserts = 0;
		this.screenshot = 1;
		this.indent = 0;
		for(var prop in args) {
			this.args[prop] = args[prop];
		}
	};




	// Returns compiled code
	Compiler.compile = function(testname, filepath, args, subtest) {

		// Check arguments
		if (arguments.length == 1) {
			// compiler.copile(filepath);
			filepath = testname;
			testname = "Default Test";
		} else if (arguments.length === 2 && typeof src === 'boolean') {
			// compiler.compile(filepath, true);
			nowrap = filepath;
			filepath = testname;
			testname = "Default Test";
		} 

		// Reset the test information when starting up
		// (ignore for sub-tests)
		if (!subtest) {
			this.reset(args, testname);
		}

		// Initialise vars
		var errMsg, errCol, line, match, info, 
			n, rule, success,
			src = fs.read(filepath),
			lines = src.split('\n');

		// Tell casper which file we're executing
		casper.test.currentTestFile = testname;

		// Increase indentation
		this.indent = 1;

		this.add('// STARTING TEST -- ' + testname);

		runner.log('----------------------------');
		runner.log(testname);
		runner.log('----------------------------');
		runner.log('Total ' + lines.length + ' lines.');
		runner.log('----------------------------');

		// ADD INPUT ARGUMENTS
		if (args) {
			this.add('// LOAD INPUT ARGUMENTS ');
			for(var name in args) {
				this.add('args["{0}"] = \"{1}\";', name, args[name]);
			}
		}

		if (lines.length) {
			for(var i = 0; i < lines.length; i++) {
				// Init
				line = lines[i].trim();
				runner.log(('0' + i).slice(-2) + ': '+ line);
				// Remove comments after a command
				line = line.indexOf("--") > 0 ? line.substr(0, line.indexOf("--")) : line;
				// Trim line
				line = line.trim();
				success = false;
				// Iterate through all lines
				for(n = 0; n < this.rules.length; n++) {
					rule = this.rules[n];
					match = line.match(rule.regex);
					info = {
						testname: testname,
						line: line,
						lineno: (i+1),
						message: 'Line ' + (i+1) + ': ' + line
					};
					// Match? Try and execute rule logic;
					if (match) {
						try {
							success = rule.logic.call(this, match, info);
						} catch (e) {
							throw new Error('Line ' + (i + 1) + ': Compiler error applying rule [' + rule.name + '].\n' + 
								e.message + '\n\n  ' +
								line + '\n');
						}
					}
				}

				if (!success) {
					// Find column
					errMsg = "";
					errCol = 0;
					if (line.indexOf(';') == line.length - 1) { 
						errCol = line.length; 
						errMsg = "Did you place a semicolon at the end of the line?"; 
					}
					// Throw syntax error
					throw new Error('Line ' + (i + 1) + ': Compiler error. ' + errMsg + '\n ' + 
						Array(errCol).join(" ") + '(!)\n  ' + line + '\n');
				}
			}
		}

		// Should we wrap it all up into a casper test?
		if (!subtest) {

			// Add lines at start of script
			this.output.unshift(
				'',
				'// Commence autogenerated casperjs script',
				'var args = {};',
				'',
				'casper.test.begin("' + testname + '", ' + (this.asserts || 0) + ', function suite(test) {',
				'',
				//' test.currentTestFile = "' + filename + '";',
				' casper.start("about:blank", function() {this.viewport(800, 600);});',
				'');

			// Add lines at end of script
			this.output.push(
				' casper.then(function() {casper.capture("' + this.resultspath('ending.screenshot.png') + '");});',
				' casper.run(function() { ',
					// '// Change suite results to customize XUNIT output',
					// 'console.log("casper.test.currentSuite.passes.length: " + casper.test.currentSuite.passes.length);',
					// 'var passes = casper.test.currentSuite.passes, failures = casper.test.currentSuite.failures;',
					// 'passes.forEach(function(success) { success.file = "' + testname + '" });',
					// 'failures.forEach(function(failure) { failure.file = "' + testname + '" });',
					// 'casper.test.currentSuite.file = "' + pkg.substr(pkg.indexOf('/')) + '";',
					'console.log(""); test.done(); ',
				 '});',
				'',
				'});',
				'');

		}

		// Return compiled script
		return this.output.join("\n");
	};




	// Validates code and returns
	// a descriptive object
	Compiler.validate = function(src) {

		var lines = src.split('\n');
		var line, match, info, 
			n, rule, success;

		if (lines.length) {
			for(var i = 0; i < lines.length; i++) {
				// Init
				line = lines[i].trim();
				// Remove comments after a command
				line = line.indexOf("--") > 0 ? line.substr(0, line.indexOf("--")) : line;
				// Trim line
				line = line.trim();
				success = false;
				// Iterate through all lines
				for(n = 0; n < this.rules.length; n++) {
					rule = this.rules[n];
					match = line.match(rule.regex);
					info = {
						testname: testname,
						line: line,
						lineno: (i+1),
						message: 'Line ' + (i+1) + ': ' + line
					};
					// Match? Try and execute rule logic;
					if (match) {
						try {
							success = rule.logic.call(this, match, info);
						} catch (e) {
							return {
								success: false,
								message: 'Compiler error applying rule [' + rule.name + ']. ' + e.message,
								line: (i+1),
								col: 0
							}
						}
					}
				}

				if (!success) {
					// Find column
					errMsg = "";
					errCol = 0;
					if (line.indexOf(';') == line.length - 1) { 
						errCol = line.length; 
						errMsg = "Did you place a semicolon at the end of the line?"; 
					}
					return {
						success: false,
						message: 'Compiler error. ' + errMsg,
						line: (i+1),
						col: errCol
					}
				}
			}
		}

		return {
			success: true,
			message: 'Success',
			line: 0,
			col: 0
		};

	};





	// Define some rules for the compiler
	Compiler.rules = [{
		name: 'COMMENT',
		regex: /^\s*(\-\-)/i,
		logic: function(match, info) {
			this.add(info.line.replace("--", "//"));
			return true;
		}
	},{
		name: 'BLANK LINE',
		regex: /^\s*$/i,
		logic: function(match, info) {
			this.add('');
			return true;
		}
	},{
		name: 'SET @variable',
		regex: /^SET @(\w+) = ("[^"]*"|@\w+)$/i,
		logic: function(match, info) {
			var argname = match[1], argvalue = this.resolve(match[2]);
			if (!this.args) { return false; }
			// Check if variable already exists
			// If so then comment it out
			if (typeof this.args[argname] !== 'undefined') {
				this.add('// args["{0}"] = {1};', argname, argvalue);
			} else {
				this.add('args["{0}"] = {1};', argname, argvalue);
				this.args[argname] = argvalue;
			}
			return true;
		}
	}, {
		name: 'GO TO "url"',
		regex: /^GO TO ("[^"]*"|@\w+)$/i,
		logic: function(match, info) {
			this.add('casper.thenOpen({0}, function() {test.assertUrlMatch({0}, \'{1}\')});', 
				this.resolve(match[1]), info.message);
			this.asserts++;
			return true;
		}
	}, {
		name: 'CLICK "selector"',
		regex: /^CLICK ("[^"]*"|@\w+)$/i,
		logic: function(match, info) {
			this.add(
				'casper.then(function() {' + 
					'test.assertVisible({0}, \'{1}\');' + 
				'}).thenClick({0});', 
				this.resolve(match[1]), info.message);
			this.asserts++;
			return true;
		}
	}, {
		name: 'CLICK "selector" AND WRITE "text"',
		regex: /^CLICK ("[^"]*"|@\w+) AND WRITE ("[^"]*"|@\w+)$/i,
		logic: function(match, info) {
			this.add(
				'casper.then(function() {' + 
					'var element = this.evaluate(function(selector, value) {' + 
						'var e = document.querySelector(selector);' +
						'if (e) {e.value = value; return e;}' +
					'}, {0}, {1}); ' +
					'test.assert(!!element, \'{2}\');' +  
				'});', 
				this.resolve(match[1]), this.resolve(match[2]), info.message);
			this.asserts++;
			return true;
		}
	}, {
		name: 'CHECK "selector" [NOT] EXISTS',
		regex: /^CHECK ("[^"]*"|@\w+) (NOT )?EXISTS$/i,
		logic: function(match, info) {
			this.add(
				'casper.then(function() {' + 
					'test.assert{1}Visible({0}, \'{2}\');' + 
				'});', 
			this.resolve(match[1]), match[2] ? "Not" : "", info.message);
			this.asserts++;
			return true;
		}
	}, {
		name: 'TAKE SCREENSHOT ["filename.png"]',
		regex: /^TAKE SCREENSHOT\s*("[^"]*"|@\w+)?$/i,
		logic: function(match, info) {
			var screenshotfile = '"line-' + info.lineno + '.screenshot.png"';
			var filename = match[1] ? this.resolve(match[1]) : screenshotfile;
			if (filename && filename.length) {
				filename = filename.substr(1, filename.length - 2);
				// what if they entered an empty string?... just fix it.
				filename = filename.length ? filename : screenshotfile;
				this.add('casper.then(function() {casper.capture("{0}");});', this.resultspath(filename));
			}
			return true;
		}
	}, {
		name: 'EXECUTE "filename.test"',
		regex: /^EXECUTE\s*("[^"]*"|@\w+)?$/i,
		logic: function(match, info) {
			// Check for filesystem access
			if (fs && typeof fs.exists === 'function') {
				var file = this.resolve(match[1]);
				var filepath = fs.absolute(file.substr(1, file.length - 2));
				var filename = filepath.split("/").pop();
				if (filename.indexOf(fs.separator)) {filename = filename.split(fs.separator).pop(); }
				runner.log('filepath: ' +  filepath);
				runner.log('filename: ' +  filename);
				if (fs.exists(filepath) === true) {
					this.indent++;
					this.add('// "{0}" ', info.line);
					this.add(this.compile(filename, fs.read(filepath), this.args, true));
					this.indent--;
					return true;
				}
				throw new Error("Test file does not exist " + filename);
			}
			// We cannot verify if the file exists
			// however we can still return true to allow
			// client side utilities to verify code
			return true;
		}
	}, {
		name: 'EXECUTE "filename.test" WITH @username="johns" [AND @pass="secret"]',
		regex: /^EXECUTE\s*("[^"]*"|@\w+)?\s+WITH(\s+@(\w+) = ("[^"]*"|@\w+))(\s+AND\s+@(\w+) = ("[^"]*"|@\w+))*$/i,
		logic: function(match, info) {
			// Check for filesystem access
			if (fs && typeof fs.exists === 'function') {
				var filepath = fs.absolute(match[1].substr(1, match[1].length - 2));
				var filename = filepath.split("/").pop();
				if (filename.indexOf(fs.separator)) {filename = filename.split(fs.separator).pop(); }
				if (fs.exists(filepath) === true) {
					this.add(' // Loading file (with arguments) ' + filename);
					if (match.length > 3) {
						// ADD EXEC ARGS
						for(n = 3; n <= match.length; n=n+3) {
							if (match[n] && match[n+1] && typeof this.args[match[n]] !== 'undefined') {
								runner.log('// Adding ' + n + ': ' + match[n] + '=' + match[n+1]);
								this.args[match[n]] = match[n+1].substr(1, match[n+1].length - 2);
							}
						}
					}
					this.indent++;
					this.add('// "{0}" ', info.line);
					this.add(exports.compile(filename, fs.read(filepath), args, true));
					this.indent--;
					return true;
				}
				return new Error("Test file does not exist " + filename);
			}
			// We cannot verify if the file exists
			// however we can still return true to allow
			// client side utilities to verify code
			return true;
		}
	}];




	// Export as CommonJS
	if (exports) {
		for (var prop in Compiler) {
			exports[prop] = Compiler[prop];
		}
	// Or to global context (ie window) 
	// on a browser
	} else {
		GLOBAL.Compiler = Compiler;
	}


})(this);

