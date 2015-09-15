/* global jQuery, Sortable, timelineEditor */

var exampleEditor = (function($, Sortable, timelineEditor) {
	'use strict';

	/**
	 * @class Editor
	 * @extends timelineEditor.TimelineEditor
	 */
	var Editor = function() {
		this.name = 'example';
		this.timelineDefault = '[{"name":"Event1","start":"","stop":"","amount":""},{"name":"Event2","start":"","stop":"","amount":""},{"name":"Something","start":"","stop":"","amount":""},{"wildcard":true},{"name":"EndTime","start":""}]';
		this.timelineExample = '[{"name":"Event1","start":"0","stop":"10","amount":"374"},{"name":"Event2","start":"0","stop":"20","amount":"473"},{"wildcard":true,"name":"Y","start":"4","stop":"5","amount":"229"},{"name":"Something","start":"10","stop":"10","amount":"1010"},{"name":"Event1","start":"11","stop":"20","amount":"473"},{"name":"Event2","start":"11","stop":"20","amount":"374"},{"wildcard":true,"name":"X","start":"6","stop":"16","amount":"666"},{"name":"EndTime","start":"20"}]';
		this.processSteps = '["Event1", "Event2", "Something", {}]';
		this.requiredColumns = ['Event1', 'Event2', 'Something'];
	};
	Editor.prototype = Object.create(timelineEditor.TimelineEditor.prototype); // inheritance
	var editor = new Editor();


	$(document).ready(function() {
		editor.loadProcessSteps();
		editor.loadJSON(); // Reset Timeline to default.
		editor.updateHistory();

		Sortable.create(document.getElementById('timeline'), {
			handle: '.glyphicon-move',
			group: {name: 'share'},
			onAdd: function (evt) {
				if (evt.from.id === 'timeline-wordbank') {
					$(evt.item).find('span').before('<input type="text" name="start" class="numeric"><input type="text" name="stop" class="numeric"><input type="text" name="amount" class="numeric">');
				}
			}
		});
		Sortable.create(document.getElementById('timeline-wordbank'), {
			//handle: '.glyphicon-move',
			group: {name: 'share', pull: 'clone', put: false}
		});
		Sortable.create(document.getElementById('timeline-trash'), {
			handle: '.glyphicon-move', // Make trash not draggable
			group: {name: 'share', pull: false, put: true},
			onAdd: function (evt) {
				evt.item.remove(); // Remove items dragged into the trash
			}
		});

		// Server history drop-down
		$(editor.remoteHistorySelector).select2()
			.on('select2:open', function () {
				// On open, the select chooses the '' option, so we can choose
				// to change() to the current option again.
				// The last selected option will stay in the box until
				// we want to change it; this way we can use the delete button.
				$(editor.remoteHistorySelector).select2('val', '');
			});

		// Reset button
		$('#timeline-reset').click(function() {
			editor.loadProcessSteps();
			editor.loadJSON();
		});

		// Example button
		$('#timeline-getExample').click(function() {
			editor.loadJSON(editor.timelineExample);
		});

		// Save button
		$('#timeline-save').click(function() {
			var timeline = editor.buildTimeline(editor.parseFields());
			var timelineTxt = editor.saveToString(timeline);

			$('#timeline-results').val(timelineTxt).focus().select();

			if (!timeline.error) {
				editor.saveHistory();
				editor.updateHistory();
			}
		});

		// Load from Local History
		$(editor.localHistorySelector).on('click', '.timeline-history-item', function() {
			editor.loadHistory(($(this).attr('id')).substr(8)); // "history_" prefix
		});

		// Save History to Server
		$(editor.localHistorySelector).on('click', '.timeline-history-item-save', function() {
			editor.saveHistoryToServer(($(this).attr('id')).substr(8));
		});

		// Load History from Server
		$(editor.remoteHistorySelector).on('change', function(e) {
			if ($(e.target).val() !== '') {
				editor.loadHistoryFromServer($(e.target).val());
			}
		});

		// Delete History from Server
		$('#timeline-history-server-delete').click(function() {
			editor.deleteHistoryFromServer($(editor.remoteHistorySelector).val());
		});

	});

	return {
		editor: editor
	};

})(jQuery, Sortable, timelineEditor);