
var fs = require("fs");
var screenshot = 1, asserts = 0;

var variable = function(item) {
	if (item.indexOf("@") === 0) {
		return 'args["' + item.substr(1) + '"]';
	} else {
		return item;
	}
}

exports.compile = function(suitename, src, args, nowrap) {

	// Check arguments
	if (arguments.length == 1) {
		// compiler.copile(filepath);
		src = suitename;
		suitename = "Default Test Suite";
	} else if (arguments.length === 2 && typeof src === 'boolean') {
		// compiler.compile(filepath, true);
		nowrap = src;
		src = suitename;
		suitename = "Default Test Suite";
	} 

	// Split by line
	var errMsg, errCol, words, line, match, 
		execargs, n, argname, argvalue, filepath, filename,
		output = [],  lines = src.split('\n'),
		originalargs = args;

	output.add = function() {
		// Add formatted text 
		// ie output.add("This is {0} line of {1} text", 1, "cool");
		if (arguments.length > 1) {
		    var str = arguments[0], args = Array.prototype.slice.call(arguments, 1);
		    this.push(' ' + str.replace(/{(\d+)}/g, function(match, number) { 
		      return typeof args[number] != 'undefined'
		        ? args[number]
		        : match
		      ;
		    }));
		} else {
			// No parameters? 
			// Use first argument or empty string
			this.push(arguments[0] || "");
		}
	};
	console.log('Total of ' + lines.length + ' lines..');

	// ADD INPUT ARGUMENTS
	if (args) {
		output.add('// LOAD INPUT ARGUMENTS');
		for(argname in args) {
			output.add('args["{0}"] = \"{1}\";', argname, args[argname]);
		}
	}

	if (lines.length) {
		for(var i = 0; i < lines.length; i++) {
			// Init
			success = false, errMsg = "";
			line = lines[i].trim();
			// Remove comments after a command
			line = line.indexOf("--") > 0 ? line.substr(0, line.indexOf("--")) : line;
			// Trim line
			line = line.trim();
			// How many words?
			words = line.split(' ');
			if (words && words.length) {
				// COMMENT
				if (line.match(/^\s*(\-\-)/)) {
					output.push(line.replace("--", "//"));
					success = true;
				}				
				// BLANK LINE
				if (line === '') {
					output.push('');
					success = true;
				}
				// SET
				match = line.match(/^SET @(\w+) = ("[^"]*"|@\w+)$/i);
				if (match) {
					// HAVE WE PRESET ANY VARIABLES ALREADY?
					argname = match[1], argvalue = match[2];
					output.add('{0}args["{1}"] = {2};', 
					 	(args && typeof args[argname] !== 'undefined') ? "// " : "", argname, argvalue);
					success = true;
				}
				// GO TO "string"
				match = line.match(/^GO TO ("[^"]*"|@\w+)$/i);
				if (match) {
					output.add('casper.thenOpen({0}, function() {test.assertUrlMatch({0}, \'{1}\')});', variable(match[1]), suitename + ' - ' + line);
					asserts++;
					success = true;
				}
				// CLICK "string" AND WRITE "string"
				match = line.match(/^CLICK ("[^"]*"|@\w+) AND WRITE ("[^"]*"|@\w+)$/i);
				if (match) {
					output.add(
						'casper.then(function() {' + 
							'var element = this.evaluate(function(selector, value) {' + 
								'var e = document.querySelector(selector);' +
								'if (e) {e.value = value; return e;}' +
							'}, {0}, {1}); ' +
							'test.assert(!!element, \'{2}\');' +  
						'});', 
					variable(match[1]), variable(match[2]), suitename + ' - ' + line);
					asserts++;
					success = true;
				}
				// CLICK "string"
				match = line.match(/^CLICK ("[^"]*"|@\w+)$/i);
				if (match) {
					output.add(
						'casper.then(function() {' + 
							'test.assertVisible({0}, \'{1}\');' + 
						'}).thenClick({0});', 
					variable(match[1]), suitename + ' - ' + line);
					asserts++;
					success = true;
				}
				// CHECK "string" EXISTS
				match = line.match(/^CHECK ("[^"]*"|@\w+) (NOT )?EXISTS$/i);
				if (match) {
					output.add(
						'casper.then(function() {' + 
							'test.assert{1}Visible({0}, \'{2}\');' + 
						'});', 
					variable(match[1]), match[2] ? "Not" : "", suitename + ' - ' + line);
					asserts++;
					success = true;
				}
				// TAKE SCREENSHOT
				match = line.match(/^TAKE SCREENSHOT\s*("[^"]*"|@\w+)?$/i);
				if (match) {
					output.add('casper.then(function() {casper.capture({0});});', match[1] ? variable(match[1]) : ('"screenshot-' + (screenshot++) + '.png"'));
					success = true;
				}
				// EXECUTE
				match = line.match(/^EXECUTE\s*("[^"]*"|@\w+)?$/i);
				if (match) {
					if (fs.exists(match[1].substr(1, match.length - 2))); {
						output.add(' // Loading file ' + match[1]);
						success = true;
					}
				}
				// EXECUTE
				match = line.match(/^EXECUTE\s*("[^"]*"|@\w+)?\s+WITH(\s+@(\w+) = ("[^"]*"|@\w+))(\s+AND\s+@(\w+) = ("[^"]*"|@\w+))*$/i);
				if (match) {
					filepath = fs.absolute(match[1].substr(1, match[1].length - 2));
					filename = filepath.split("/").pop();
					if (filename.indexOf(fs.separator)) {filename = filename.split(fs.separator).pop(); }
					if (fs.exists(filepath) === true) {
						if (match.length > 3) {
							// ADD EXEC ARGS
							for(n = 3; n <= match.length; n=n+3) {
								if (match[n] && match[n+1] && typeof args[match[n]] !== 'undefined') {
									console.log('// Adding ' + n + ': ' + match[n] + '=' + match[n+1]);
									args[match[n]] = match[n+1].substr(1, match[n+1].length - 2);
								}
							}
						}
						output.add('// EXECUTE SUITE "{0}" ', filename);
						output.add(exports.compile(suitename, fs.read(filepath), args, true));
						success = true;
					} else {
						errMsg = "Test Suite file does not exist " + filename;
					}
				}
			}

			if (!success || errMsg.length) {
				// Find column
				if (line.indexOf(';') == line.length - 1) { errCol = line.length; errMsg = "Did you place a semicolon at the end of the line?"; }
				// Throw syntax error
				throw new Error('Line ' + (i + 1) + ': Compiler error. ' + errMsg + '\n ' + Array(errCol).join(" ") + '(!)\n  ' + line + '\n');
			}
		}
	}

	// Should we wrap it all up into a casper test?
	if (!nowrap) {

		// Add lines at start of script
		output.unshift(
			'',
			'// Commence autogenerated casperjs script',
			'var args = {};',
			'',
			'casper.test.begin("' + suitename + '", ' + (asserts || 0) + ', function suite(test) {',
			'',
			' casper.start("about:blank", function() {this.viewport(800, 600);});',
			'');

		// Add lines at end of script
		output.push(
			' casper.run(function() {test.done();});',
			'',
			'});',
			'');

		// Reset count totals
		screenshot = 1;
		asserts = 0;
	}

	// Return compiled script
	return output.join("\n");
}

