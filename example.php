<?php
// This PHP block is only required for server-side saving of inputs.
// Note: This file has been simplified and stripped of a bunch of specifics.

function parseName($name) {
	$name = preg_replace('/[^A-Za-z0-9_\-\s]/', '_', $name); // Allow underscores, dashes, spaces.
	$name = preg_replace('/\s+/', ' ', $name); // Reduce multiple spaces to one.
	$name = substr($name, 0, 255); // Limit to 255 characters.
	return $name;
}

$timelineDir = 'path/to/timelines/';
$historyName = isset($_POST['historyName']) ? parseName($_POST['historyName']) : null;
$historyAction = isset($_POST['historyAction']) ? parseName($_POST['historyAction']) : null;
$historyData = isset($_POST['historyData']) ? $_POST['historyData'] : null;

switch ($historyAction) {
	case('save'):
		if ($historyName && is_string($historyData) && is_array(json_decode($historyData, true))) {
			file_put_contents($timelineDir . $historyName, $historyData);
		}
		return;
	case('load'):
		echo file_get_contents($timelineDir . $historyName);
		return;
	case('list'):
		echo json_encode(array_map('basename', glob($timelineDir . '*')));
		return;
	case('delete'):
		if (is_file($timelineDir . $historyName)) {
			unlink($timelineDir . $historyName);
		}
		return;
	default:
		break;
}
?>

<!DOCTYPE html>
<html>

<head>
	<title>Example Timeline Editor</title>
	<meta http-equiv="Content-type" content="text/html;charset=utf-8"/>
	<link rel="stylesheet" type="text/css" href="libs/css/bootstrap.min.css"/>
	<link rel="stylesheet" type="text/css" href="libs/css/select2.min.css"/>
	<link rel="stylesheet" type="text/css" href="timelineEditor.css"/>
	<script type="text/javascript" src="libs/js/jquery-1.11.1.min.js"></script>
	<script type="text/javascript" src="libs/js/Sortable.min.js"></script>
	<script type="text/javascript" src="libs/js/select2.min.js"></script>
	<script type="text/javascript" src="timelineEditor.js"></script>
	<script type="text/javascript" src="example.js"></script>
</head>

<body style="margin-left:2em">

	<h1>Example Timeline Editor</h1>
	<ul>
		<li><b>Don't know what to do?</b> Try pressing <b><i>Load Example</i></b> then <b><i>Save.</i></b></li>
		<li>Drag <span class="glyphicon glyphicon-move" aria-hidden="true"></span> Timeline items from the <b>Additional Process Steps</b> into the <b>Process Timeline.</b></li>
		<li>If time intervals overlap, the ones below have higher priority.</li>
		<li>If a required process step isn't present in the timeline, its values default to zero.</li>
		<li>A process step with a colored background is a <span class="wildcard">wildcard</span>.</li>
	</ul>

	<table><tr>
		<td style="vertical-align:top; padding-right:2em">
			<div class="panel panel-primary" style="min-width:38.5em">
				<div class="panel-heading">Process Timeline <button type="button" id="timeline-reset" class="btn btn-default" style="float:right">Reset</button><button type="button" id="timeline-getExample" class="btn btn-default" style="float:right">Load Example</button></div>
				<div class="panel-body">
					<div id="timeline" class="list-group">
					</div>
					<button type="button" id="timeline-save" class="btn btn-primary">Save</button>
				</div>
			</div>
			<div style="margin-bottom:2em">
				<label for="timeline-results">Timeline Results</label><br>
				<textarea id="timeline-results" style="max-width:38.5em; width:38.5em; height:10em"></textarea>
			</div>
		</td>

		<td style="vertical-align:top; padding-right:2em">
			<div class="flexWrapper">
				<div class="flex">
					<div class="panel panel-default" style="min-width:14em">
						<div class="panel-heading">Additional Process Steps</div>
						<div class="panel-body">
							<div id="timeline-wordbank" class="list-group">
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">Trash</div>
						<div class="panel-body">
							<div id="timeline-trash" class="list-group">
								<div class="timeline-item list-group-item"><input type="text" name="name" value="Drag here to delete" class="readonly" readonly></div>
							</div>
						</div>
					</div>
				</div>
				<div class="panel panel-default flex" style="min-width:15.5em">
					<div class="panel-heading">Load From History</div>
					<span class="label label-default">Local:</span>
					<div id="timeline-history" class="panel-body">
					</div>
					<span class="label label-default">Server:</span>
					<div class="panel-body">
					<select id="timeline-history-server" style="display:inline-block; width:11.5em"></select> <span id="timeline-history-server-delete" aria-hidden="true" class="glyphicon glyphicon-trash" title="Delete currently selected"></span>
					</div>
				</div>
			</div>
		</td>
	</tr></table>

</body>

</html>
