/* global jQuery */

var timelineEditor = (function($) {
	'use strict';

	/**
	 * Zero-initialize array.
	 * @param  {Number} length Number of elements to initialize.
	 * @return {Array}
	 */
	function makeArray(length) {
		var a = new Array(length);
		for (var i = 0; i < length; i++) {
			a[i] = 0;
		}
		return a;
	}

	/**
	 * Takes a number and wraps it within the range of [0:numEl)
	 * @param  {Number} index
	 * @param  {Number} numEl
	 * @return {Number}       New Index
	 */
	function wrapIndex(index, numEl) {
		index = index % numEl;
		return (index < 0) ? index + numEl : index;
	}

	/**
	 * @class TimelineEditor
	 */
	var TimelineEditor = function() {};

	TimelineEditor.prototype.name = ''; // History prefix for localStorage.
	TimelineEditor.prototype.ajaxUrl = ''; // For server-side history; defaults to same page.
	TimelineEditor.prototype.timelineDefault = ''; // Default JSON to load.
	/**
	 * JSON of column names for the Additional Process Steps.
	 * Defaults to wildcard (represented as an empty object);
	 * A wildcard is a class given to the "name" field to
	 * differentiate from the grey readonly fields.
	 * @type {String}
	 */
	TimelineEditor.prototype.processSteps = '[{}]';
	/**
	 * Columns that will always appear in the timeline Object and results.
	 * Enforces an order; additional columns will be put after these.
	 * @type {Array}
	 */
	TimelineEditor.prototype.requiredColumns = [];
	TimelineEditor.prototype.timelineSelector = '#timeline';
	TimelineEditor.prototype.rowSelector = '#timeline .timeline-item';
	TimelineEditor.prototype.processStepsSelector = '#timeline-wordbank';
	TimelineEditor.prototype.localHistorySelector = '#timeline-history';
	TimelineEditor.prototype.remoteHistorySelector = '#timeline-history-server';
	/**
	 * timeScale: For changing the time interval.
	 * For example, using  0.5 => {0, 2, 4, 6, ...}
	 *				using 10.0 => {0, 0.1, 0.2, 0.3, ...}
	 * (Note that time interval == 1/timeScale).
	 */
	TimelineEditor.prototype.timeScale = 1;
	TimelineEditor.prototype.historyCount = 5; // Max number of history items to save.


	/**
	 * Converts the timeline intervals to a full start-to-stop timeline.
	 * @param  {Object} timeline
	 * @param  {Object} timeline.raw        AA of timeline steps.
	 * @return {Array}  timeline[columns]   An array for each column.
	 */
	TimelineEditor.prototype.buildTimeline = function(timeline) {
		if (timeline.error) {
			return timeline;
		}
		var timeScale = this.timeScale;
		var endIndex = parseInt(timeline.endTime*timeScale);

		$(this.requiredColumns).each(function(i,name) {
			timeline[name] = makeArray(endIndex+1);
		});

		$(timeline.raw).each(function(i,lineAA) {
			var name = lineAA.name;
			if (!name) {
				return;
			}
			if (!timeline[name]) {
				timeline[name] = makeArray(endIndex+1);
			}

			// If iter or stop is NaN, the while becomes false.
			var iter = parseInt(parseFloat(lineAA.start)*timeScale);
			var stop = Math.min(parseInt(parseFloat(lineAA.stop)*timeScale), endIndex);

			while (iter <= stop) {
				timeline[name][iter++] = parseFloat(lineAA.amount);
			}
		});

		return timeline;
	};

	/**
	 * Parses the Timeline into tab-separated values.
	 * @param  {Object} timeline
	 * @param  {Number} timeline.endTime
	 * @return {String}
	 */
	TimelineEditor.prototype.saveToString = function(timeline) {

		// Error checking
		if (timeline.error) {
			return timeline.errorMessage;
		}

		var header = this.requiredColumns.slice(); // copy-by-value
		var ignore = ['endTime', 'EndTime', 'raw', ''];
		$(Object.keys(timeline)).each(function(i,key) {
			if (timeline.hasOwnProperty(key)) {
				if ($.inArray(key, header) === -1 && $.inArray(key, ignore) === -1) {
					header.push(key);
				}
			}
		});

		// Write Header
		var text = 'Time';
		for (var i = 0; i < header.length; ++i) {
			text += '\t' + header[i];
		}
		text += '\n';

		// The rest of the timeline
		for (var i = 0; i <= timeline.endTime*this.timeScale; ++i) {
			text += i/this.timeScale; // Time
			for (var j = 0; j < header.length; ++j) {
				text += '\t' + timeline[header[j]][i];
			}
			text += '\n';
		}
		return text;
	};

	/**
	 * Parses the 'raw' line objects of the timeline and converts that to JSON.
	 * Used for recreating the timeline.
	 * @return {String} JSON.
	 */
	TimelineEditor.prototype.saveToJSON = function(timeline) {
		return (timeline.error) ? timeline.errorMessage : JSON.stringify(timeline.raw);
	};

	/**
	 * Serializes the Timeline fields to a JSON-parsable associative array.
	 * @return {Object}  timeline
	 * @return {Number}  timeline.endTime
	 * @return {Array}   timeline.raw          Each line of the timeline in its own Object.
	 * @return {Boolean} timeline.error
	 * @return {String}  timeline.errorMessage
	 */
	TimelineEditor.prototype.parseFields = function() {
		var timeline = {};
		timeline.raw = [];
		$(this.rowSelector).each(function() {
			var line = $(this).children().serializeArray();

			if (line[0].value === 'EndTime') {
				timeline.endTime = parseFloat(line[1].value);
			}

			var lineAA = {};
			for (var j = 0; j < line.length; j++) {
				lineAA[line[j].name] = line[j].value;
			}
			timeline.raw.push(lineAA);
		});

		// Error checking
		if (isNaN(timeline.endTime) || timeline.endTime < 0) {
			return {
				error: true,
				errorMessage: 'EndTime must be a positive number.'
			};
		}
		return timeline;
	};

	/**
	 * Load the input fields from JSON.
	 * @param  {String} json
	 * @return {Object}
	 */
	TimelineEditor.prototype.loadJSON = function(json) {

		var jsonObj;

		try {
			jsonObj = JSON.parse(json);
		} catch(e) {
			jsonObj = JSON.parse(this.timelineDefault);
		}

		var timeline = $(this.timelineSelector).empty()
			.append('<div class="list-group-item"><input type="text" value="Name" class="readonly" readonly><input type="text" value="Start Time" class="readonly" readonly><input type="text" value="Stop Time" class="readonly" readonly><input type="text" value="Amount" class="readonly" readonly></div>');

		$(jsonObj).each(function(i, line) {
			var row = $('<div>', {'class': 'timeline-item list-group-item'});
			timeline.append(row);

			$(['name', 'start', 'stop', 'amount']).each(function(i, name) { // Append input boxes.
				if (line.name === 'EndTime' && i > 1) {
					return;
				}
				row.append($('<input>', {
					'type': 'text',
					'class': ((name=='name') ? 'readonly' + ((line.wildcard) ? ' wildcard' : '') : 'numeric'),
					'readonly': (name=='name' && !line.wildcard) ? true : false,
					'name': name,
					'value': line[name]
				}));
			});
			if (line.name !== 'EndTime') { // Append move button.
				row.append('<span aria-hidden="true" class="glyphicon glyphicon-move" title="Drag to move">');
			}
		});

		return jsonObj;
	};

	/**
	 * Updates the view with the Additional Process Steps.
	 */
	TimelineEditor.prototype.loadProcessSteps = function() {

		var jsonObj;
		try {
			jsonObj = JSON.parse(this.processSteps);
		} catch(e) {
			return;
		}

		var editor = this;
		$(editor.processStepsSelector).empty();

		$(jsonObj).each(function(i, line) {
			var row = $('<div>', {'class': 'timeline-item list-group-item'});
			row.append($('<input>', {
						'type': 'text',
						'class': 'readonly' + ((typeof(line) === 'string') ? '' : ' wildcard'),
						'readonly': (typeof(line) === 'string') ? true : false,
						'name': 'name',
						'value': (typeof(line) === 'string') ? line : ''
					}));
			row.append('<span aria-hidden="true" class="glyphicon glyphicon-move" title="Drag to move">');
			$(editor.processStepsSelector).append(row);
		});
	};

	/**
	 * Save JSON to a $(historyCount)-slot history in localStorage.
	 * Three pieces if information are stored:
	 *   two per history-item (json & timestamp), one global (newest_pointer).
	 */
	TimelineEditor.prototype.saveHistory = function() {
		var json = this.saveToJSON(this.parseFields());
		var pointer = localStorage.getItem(this.name + 'History_newest') || '0';
		pointer = wrapIndex(parseInt(pointer) + 1, this.historyCount);
		localStorage.setItem(this.name + 'History_newest', pointer);
		localStorage.setItem(this.name + 'History_json_' + pointer, json);
		localStorage.setItem(this.name + 'History_timestamp_' + pointer, new Date().toLocaleString());
	};

	/**
	 * Loads a local history item by pointer value.
	 */
	TimelineEditor.prototype.loadHistory = function(pointer) {
		var json = localStorage.getItem(this.name +	'History_json_' + wrapIndex(pointer, this.historyCount));
		if (json !== null) {
			this.loadJSON(json);
		}
	};

	/**
	 * Update the view with the local history items.
	 */
	TimelineEditor.prototype.updateHistory = function() {
		$(this.localHistorySelector).empty();
		this.updateHistoryFromServer();
		var pointer = localStorage.getItem(this.name + 'History_newest');
		for (var i = 0; i < this.historyCount; i++) {
			var timestamp = localStorage.getItem(this.name + 'History_timestamp_' + pointer);
			if (timestamp) {
				$(this.localHistorySelector).append('<a id="history_'+ pointer +'" class="timeline-history-item">'+timestamp+'</a>&nbsp;<span aria-hidden="true" id="history_'+ pointer +'" class="glyphicon glyphicon-save timeline-history-item-save" title="Save to Server"></span><br>');
				pointer = wrapIndex(parseInt(pointer) - 1, this.historyCount);
			} else {
				break;
			}
		}
	};

	/**
	 * Update the view with the server-side history items.
	 */
	TimelineEditor.prototype.updateHistoryFromServer = function() {
		var editor = this;
		$.ajax({
			url: editor.ajaxUrl,
			type: 'POST',
			data: {
				historyAction: 'list'
			},
			success: function(response) {
				// The server responds with a JSON array of history names
				$(editor.remoteHistorySelector).empty().append('<option value=""></option>');
				try {
					jQuery.each(JSON.parse(response), function(i, item) {
						$(editor.remoteHistorySelector).append('<option value="'+item+'">' + item + '<span aria-hidden="true" class="glyphicon glyphicon-save timeline-history-item-save" title="Save to Server"></span></option>');
					});
				} catch(e) {
					// JSON parse errors
				}
			}
		});
	};

	TimelineEditor.prototype.saveHistoryToServer = function(pointer) {
		//var pointer = ($(this).attr('id')).substr(8); // "history_" prefix
		var historyName = prompt("Enter a name to save the timeline as.");
		if (!historyName) {
			return;
		}

		var editor = this;
		$.ajax({
			url: editor.ajaxUrl,
			type: 'POST',
			data: {
				historyAction: 'save',
				historyData: localStorage.getItem(editor.name + 'History_json_' + pointer),
				historyName: historyName
			},
			success: function() {
				editor.updateHistoryFromServer();
			}
		});
	};

	TimelineEditor.prototype.loadHistoryFromServer = function(historyName) {
		var editor = this;
		$.ajax({
			url: editor.ajaxUrl,
			type: 'POST',
			data: {
				historyAction: 'load',
				historyName: historyName
			},
			success: function(response) {
				editor.loadJSON(response);
			}
		});
	};


	TimelineEditor.prototype.deleteHistoryFromServer = function(historyName) {
		if (historyName === '') {
			alert("To delete a timeline from the server, first select one then press this trashcan icon again.");
			return;
		}
		if (confirm('Delete ' + historyName + ' from the server?')) {
			var editor = this;
			$.ajax({
				url: editor.ajaxUrl,
				type: 'POST',
				data: {
					historyAction: 'delete',
					historyName: historyName
				},
				success: function() {
					editor.updateHistoryFromServer();
				}
			});
		}
	};

	/* // Unused function
	TimelineEditor.prototype.buildTimelineOnServer = function() {
		$.post(this.ajaxUrl, {
			buildTimeline: this.saveToJSON(this.parseFields())
		}).done(function(timelineTxt) {
			$('#timeline-results').val(timelineTxt).focus().select();
		});
	};*/

	return {
		TimelineEditor: TimelineEditor,
		makeArray: makeArray,
		wrapIndex: wrapIndex
	};

})(jQuery);