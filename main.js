const { entrypoints, shell } = require('uxp');
const { app } = require('indesign');

let webview = null;
let g_stories = []; // currently active stories
let g_story = null; // current active single story

function getStoriesPars(stories) {
	g_stories = [];
	let ps = [];

	for (let i = 0; i < stories.length; ++i) {
		// app.activeDocument.stories needs .item() even though it has [], but array only has []
		let story = (stories.item?.(i)) ?? stories[i];
		g_stories.push(story);
		ps.push({i: ps.length + 1, t: story.contents});
	}

	return ps;
}

function getSelectedPars() {
	console.log(app.activeDocument.selection);
	if (typeof app.activeDocument.selection === 'undefined' || !app.activeDocument.selection) {
		return [];
	}

	let stories = [app.activeDocument.selection];
	if (app.activeDocument.selection instanceof Array) {
		stories = app.activeDocument.selection;
	}
	console.log(stories);
	for (let i=0 ; i<stories.length ; ++i) {
		stories[i] = stories[i].parentStory;
	}
	return getStoriesPars(stories);
}

function getSelectedText() {
	g_stories = [];
	let rv = [];

	let sels = [app.activeDocument.selection];
	if (app.activeDocument.selection instanceof Array) {
		sels = app.activeDocument.selection;
	}
	for (let i=0 ; i<sels.length ; ++i) {
		let sel = sels[i];
		let r = {
			i: 0,
			t: sel.contents,
		};
		if (sel?.parentStory !== null) {
			g_stories.push(sel.parentStory);
			r.i = sel.index;
			r.p = sel.parentStory.contents;
		}
		else {
			g_stories.push(sel);
			r.p = sel.contents;
		}
		if (r.t === r.p) {
			r.i = 0;
		}
		rv.push(r);
	}

	return rv;
}

function selectInDocument(r) {
	let rv = false;
	let oldWhat = app.findTextPreferences.findWhat;

	// First find the prefix + target + suffix, to differentiate paragraphs that start with the same text
	app.findTextPreferences.findWhat = r.px + r.md + r.sx;
	for (let i=0 ; i<g_stories.length ; ++i) {
		let ps = g_stories[i].findText();
		if (!ps || !ps.length) {
			continue;
		}
		g_story = g_stories[i];

		// Now that we have the paragraph, find just the prefix + target
		app.findTextPreferences.findWhat = r.px + r.md;
		ps = ps[0].findText(true);
		console.log(ps);

		// Then find the last target in the first hit, which must be what we're looking for
		app.findTextPreferences.findWhat = r.md;
		ps = ps[0].findText(true);
		console.log(ps);

		app.activeDocument.selection = [ps[0]];
		rv = true;
	}

	app.findTextPreferences.findWhat = oldWhat;
	return rv;
}

function replaceInDocument(r) {
	if (!selectInDocument(r)) {
		return false;
	}

	let rv = {
		before: g_story.contents,
		rpl: r.rpl,
		after: '',
	};

	let oldWhat = app.findTextPreferences.findWhat;
	let oldTo = app.changeTextPreferences.changeTo;

	app.findTextPreferences.findWhat = r.md;
	app.changeTextPreferences.changeTo = r.rpl;
	app.activeDocument.selection[0].changeText();

	app.findTextPreferences.findWhat = oldWhat;
	app.changeTextPreferences.changeTo = oldTo;

	rv.after = g_story.contents;
	return rv;
}

function eventListener(e) {
	e = e.data;
	console.log(e);
	let rv = {
		a: e.a,
	};

	if (e.a === 'init') {
		rv.locale = app.locale.toString();
	}
	else if (e.a === 'getAllPars') {
		rv.ps = getStoriesPars(app.activeDocument.stories);
	}
	else if (e.a === 'getSelectedPars') {
		rv.ps = getSelectedPars();
		if (!rv.ps.length) {
			rv.a = 'showError';
			rv.e = 'ERR_NO_SELECTION';
		}
	}
	else if (e.a === 'selectInDocument') {
		if (!selectInDocument(e.r)) {
			rv.a = 'showError';
			rv.e = 'ERR_SELECT_NOTFOUND';
		}
	}
	else if (e.a === 'replaceInDocument') {
		rv.d = replaceInDocument(e.r);
		if (!rv.d) {
			rv.a = 'showError';
			rv.e = 'ERR_SELECT_NOTFOUND';
		}
	}
	else if (e.a === 'replaceInDocumentSilent') {
		rv.d = replaceInDocument(e.r);
		if (!rv.d) {
			rv.a = 'showError';
			rv.e = 'ERR_SELECT_NOTFOUND';
		}
	}
	else if (e.a === 'insertInDocument') {
		rv.d = replaceInDocument(e.r);
		if (!rv.d) {
			rv.a = 'showError';
			rv.e = 'ERR_SELECT_NOTFOUND';
		}
	}
	else if (e.a === 'removeInDocument') {
		rv.d = replaceInDocument(e.r);
		if (!rv.d) {
			rv.a = 'showError';
			rv.e = 'ERR_SELECT_NOTFOUND';
		}
	}
	else if (e.a === 'getSelectedText') {
		rv.d = getSelectedText();
		if (!rv.d.length) {
			rv.a = 'showError';
			rv.e = 'ERR_NO_SELECTION';
		}
	}
	else if (e.a === 'openExternal') {
		shell.openExternal(e.url);
	}

	console.log(rv);
	webview.postMessage(rv);
}

function initSidebar() {
	window.addEventListener('message', eventListener);
	webview = document.getElementById('webview');
}

entrypoints.setup({
	panels: {
		showSidebar: {
			show: initSidebar,
		},
	},
});
