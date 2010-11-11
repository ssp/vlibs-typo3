/* Adapted from Indexdata's js-client.js by ssp */

/* A very simple client that shows a basic usage of pz2.js */

/* Create a parameters array and pass it to the pz2's constructor.
 Then register the form submit event with the pz2.search function.
 autoInit is set to true on default.
*/
var usesessions = true;
var pazpar2path = '/pazpar2/search.pz2';
var showResponseType = '';

/* Maintain a list of all facet types so we can loop over it. 
   Don't forget to also set termlist attributes in the corresponding
   metadata tags for the service. */ 
var termListNames = ['xtargets', 'medium', 'author', 'subject', 'date'];
var termListMax = {'xtargets': 16, 'medium': 6, 'author': 10, 'subject': 10, 'date': 6 };

if (document.location.hash == '#useproxy') {
	usesessions = false;
	pazpar2path = '/service-proxy/';
	showResponseType = 'json';
}


/* Simple-minded localisation:
   Create a hash for each language, then use the appropriate one on the page. */
var germanTerms = {
	'facet-title-xtargets': 'Kataloge',
	'facet-title-medium': 'Art',
	'facet-title-author': 'Autoren',
	'facet-title-subject': 'Themengebiete',
	'facet-title-date': 'Jahre',
	'detail-label-title': 'Titel',
	'detail-label-series-title': 'Serie',
	'detail-label-author': 'Autor',
	'detail-label-author-plural': 'Autoren',
	'detail-label-other-person': 'Person',
	'detail-label-other-person-plural': 'Personen',
	'detail-label-medium': 'Art',
	'detail-label-description': 'Information',
	'detail-label-description-plural': 'Informationen',
	'detail-label-series-title': 'Reihe',
	'detail-label-issn': 'ISSN',
	'detail-label-isbn': 'ISBN',
	'detail-label-doi': 'DOI',
	'detail-label-doi-plural': 'DOIs',
	'detail-label-availability': 'Verfügbarkeit',
	'detail-label-id': 'PPN',
	'link': '[Link]',
	'Kataloge': 'Kataloge',
	'Google Books Vorschau': 'Google Books Vorschau',
	'Umschlagbild': 'Umschlagbild',
	'Ampelgraphik': 'Ampelgraphik der Elektronischen Zeitschriftenbibliothek zur Darstellung der Verfügbarkeit der Zeitschrift',
};


var localisations = {
	'de': germanTerms,
};


function localise (term) {
	var localised = localisations['de'][term];
	if ( localised == undefined ) {
		localised = term;
	}
	return localised;
}




my_paz = new pz2( { "onshow": my_onshow,
					"showtime": 500,			//each timer (show, stat, term, bytarget) can be specified this way
					"pazpar2path": pazpar2path,
					"oninit": my_oninit,
					"onstat": my_onstat,
					"onterm": my_onterm,
					"termlist": termListNames.join(","),
					"onbytarget": my_onbytarget,
	 				"usesessions" : usesessions,
					"showResponseType": showResponseType,
					"onrecord": my_onrecord,
					"serviceId": my_serviceID } );
// some state vars
var curPage = 1;
var recPerPage = 100;
var totalRec = 0;
var curDetRecId = '';
var curDetRecData = null;
var curSort = 'date';
var curFilter = null;
var filter = [];
var submitted = false;


//
// pz2.js event handlers:
//
function my_oninit() {
	my_paz.stat();
	my_paz.bytarget();
}


function my_onshow(data) {
	var titleInfo = function() {
		var output = '<li id="recdiv_' + HTMLIDForRecordData(hit) + '" >'
			+ '<a href="#" class="pz2-recordLink" id="rec_' + HTMLIDForRecordData(hit)
			+ '" onclick="toggleDetails(this.id);return false;">'
			+ '<span class="pz2-item-title">'

		if (hit['md-multivolume-title'] !== undefined) {
			output += ' <span class="pz2-item-multivolume-title">' 
				+ hit['md-multivolume-title'] + '</span>: ';
		}

		output += hit["md-title"] + '</span>';

		if (hit['md-title-remainder'] !== undefined) {
			output += ' <span class="pz2-item-title-remainder">' 
				+ hit['md-title-remainder'] + '</span>';
		}

		if (hit['md-title-number-section'] !== undefined) {
			output += ' <span class="pz2-item-title-number-section">'
				+ hit['md-title-number-section'] + '</span>';
		}


		output += '.';

		return output;
	}


	var authorInfo = function() {
		var output = '';
		// use responsibility field if available
		if (hit['md-title-responsibility'] !== undefined) {
		 	output = hit['md-title-responsibility'];
		}
		// otherwise try to fall back to author fields
		else if (hit['md-author'] !== undefined) {
			var authors = [];
			for (var index = 0; index < hit['md-author'].length; index++) {
				var authorname = hit['md-author'][index];
				authors.push(authorname);
			}

			output = authors.join('; ');
		}

		// ensure the author designation ends with a single full stop
		var extraFullStop = '';
		if (output[output.length - 1] != '.') {
			extraFullStop = '.';
		}
		
		if (output != '') {
			output = '<span class="pz2-item-responsibility">' 
						+ output + extraFullStop + '</span>';
		}
		
		return output;
	}


	var journalInfo = function () {
		var output = [];

		if (hit['md-journal-title'] !== undefined) {
			output.push('<span class="pz2-journal-title">'
				+ hit['md-journal-title'] + '</span>');
			if (hit['md-journal-subpart'] !== undefined) {
				output.push(', <span class="pz2-journal-subpart">'
				+ hit['md-journal-subpart'] + '</span>');
			}
		}

		if (output != []) {
			output.unshift(localise('In') + ': ');
			output.push('.');
		}

		return output.join('');
	} 



	totalRec = data.merged;
	// move it out
	var pager = document.getElementById("pz2-pager");
	pager.innerHTML = "";
	pager.innerHTML +='<div class="pz2-recordCount">' 
					+ (data.start + 1) + ' to ' + (data.start + data.num) +
					 ' of ' + data.merged + ' (found: ' 
					 + data.total + ')</div>';
	drawPager(pager);
	// navi
	var results = document.getElementById("pz2-results");
  
	var html = ['<ol start="' + (1 + recPerPage * (curPage - 1)) + '">'];
	for (var i = 0; i < data.hits.length; i++) {
		var hit = data.hits[i];

		html.push(titleInfo());

		var authors = authorInfo();
		if (authors != '') {
			html.push(' ' + authors );
		}

		var journal = journalInfo();
		if (hit['md-medium'] == 'article' && journal != '') {
			html.push(' ' + journal);
		}
		else {
			if (hit['md-date'] !== undefined) {
				html.push(' <span class="pz2-item-date">'
					+ hit['md-date'] + '</span>.');
			}
		}

		if (hit.recid == curDetRecId) {
			html.push(renderDetails(curDetRecData));
		}
		html.push('</a></li>');
	}
   	html.push('</ol>');
	replaceHtml(results, html.join(''));
}


function my_onstat(data) {
	var stat = document.getElementById("pz2-stat");
	if (stat == null)
	return;
	
	stat.innerHTML = '<h4>Status Information</h4term> -- Active clients: '
						+ data.activeclients
						+ '/' + data.clients + ' -- </span>'
						+ '<span>Retrieved records: ' + data.records
						+ '/' + data.hits + ' :.</span>';
}


function my_onterm(data) {
	// Creates markup for the termlist of type
	var termListHTML = function (type) {
		var theHTML = ['<div class="pz2-termList pz2-termList-', type, '">',
			'<h5>', localise('facet-title-'+type), '</h5><ol>'];
		var terms = data[type];
		for (var i = 0; i < terms.length && i < termListMax[type]; i++) {
			theHTML.push( '<li><a href="#"'
			+ ' target_name=' + terms[i].name
			+ ' onclick="limitTarget(' + terms[i].name + '), this.firstChild.nodeValue);return false;">'
			+ terms[i].name 
			+ '<span class="count">' + terms[i].freq + '</span>'
			+ '</a></li>');
		}
		theHTML.push('</ol></div>');
		return theHTML;		
	}

	var newTermListsHTML = ['<h4>Termlists:</h4>'];

	for ( index in termListNames ) {
		newTermListsHTML = newTermListsHTML.concat(termListHTML(termListNames[index]));
	}

	var currentTermLists = document.getElementById("pz2-termLists");
	replaceHtml(currentTermLists, newTermListsHTML.join(''));
}


function my_onrecord(data) {
	// FIXME: record is async!!
	clearTimeout(my_paz.recordTimer);
	// in case on_show was faster to redraw element
	var detRecordDiv = document.getElementById('det_'+ HTMLIDForRecordData(data));
	if (detRecordDiv) return;
	curDetRecData = data;
	var recordDiv = document.getElementById('recdiv_'+ HTMLIDForRecordData(curDetRecData));
	var details = renderDetails(curDetRecData);

//	replaceHtml(recordDiv, html);
//	var myDiv = document.createElement('div');
	//myDiv.innerHTML = html;
   recordDiv.appendChild( details );
}


function my_onbytarget(data) {
	var targetDiv = document.getElementById("pz2-byTarget");
	var table ='<table><thead><tr><td>Target ID</td><td>Hits</td><td>Diags</td>'
		+'<td>Records</td><td>State</td></tr></thead><tbody>';
	
	for (var i = 0; i < data.length; i++ ) {
		table += "<tr><td>" + data[i].id +
			"</td><td>" + data[i].hits +
			"</td><td>" + data[i].diagnostic +
			"</td><td>" + data[i].records +
			"</td><td>" + data[i].state + "</td></tr>";
	}

	table += '</tbody></table>';
	targetDiv.innerHTML = table;
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// wait until the DOM is ready
function domReady () 
{
	if ( document.search ) {
		document.search.onsubmit = onFormSubmitEventHandler;
		document.search.query.value = '';
		document.select.sort.onchange = onSelectDdChange;
		document.select.perpage.onchange = onSelectDdChange;
	}
}

// when search button pressed
function onFormSubmitEventHandler() 
{
	resetPage();
	loadSelect();
	triggerSearch();
	submitted = true;
	return false;
}

function onSelectDdChange()
{
	if (!submitted) return false;
	resetPage();
	loadSelect();
	my_paz.show(0, recPerPage, curSort);
	return false;
}

function resetPage()
{
	curPage = 1;
	totalRec = 0;
}

function triggerSearch ()
{
	// TODO-ssp: Set filter to correct term (target-facet?)
	// var filter = NULL;
	my_paz.search(document.search.query.value, recPerPage, curSort, curFilter);
}

function loadSelect ()
{
	curSort = document.select.sort.value;
	recPerPage = document.select.perpage.value;
}

// limit the query after clicking the facet
function limitQuery (field, value)
{
	document.search.query.value += ' and ' + field + '="' + value + '"';
	onFormSubmitEventHandler();
}

// limit by target functions
function limitTarget (id, name)
{
	var navi = document.getElementById('pz2-navi');
	navi.innerHTML = 
		'Source: <a class="crossout" href="#" onclick="delimitTarget();return false;">'
		+ name + '</a>';
	navi.innerHTML += '<hr/>';
	curFilter = 'pz:id=' + id;
	resetPage();
	loadSelect();
	triggerSearch();
	return false;
}

function delimitTarget ()
{
	var navi = document.getElementById('pz2-navi');
	navi.innerHTML = '';
	curFilter = null; 
	resetPage();
	loadSelect();
	triggerSearch();
	return false;
}

function limitResults(name, kind) {
	var thisFilter = {'name': name, 'kind': kind};
	for (var index in filter) {
		if (filter[index] == thisFilter) {
			filter.push(thisFilter);
			redisplay();
			load();
			break;
		}
	}
}

function delimitResults(name, kind) {
	var thisFilter = {'name': name, 'kind': kind};
	for (var index in filter) {
		if (filter[index] == thisFilter) {
			filter.splice(index, 1);
			redisplay();
			load();
			break;
		}
	}

}

function redisplay() {
	
}



function drawPager (pagerDiv)
{
	//client indexes pages from 1 but pz2 from 0
	var onsides = 6;
	var pages = Math.ceil(totalRec / recPerPage);
	
	var firstClkbl = ( curPage - onsides > 0 ) 
		? curPage - onsides
		: 1;

	var lastClkbl = firstClkbl + 2*onsides < pages
		? firstClkbl + 2*onsides
		: pages;

	var prev = '<span class="pz2-prev">&#60;&#60; Prev</span><b> | </b>';
	if (curPage > 1)
		var prev = '<a href="#" class="pz2-prev" onclick="pagerPrev();">'
		+'&#60;&#60; Prev</a><b> | </b>';

	var middle = '';
	for(var i = firstClkbl; i <= lastClkbl; i++) {
		var numLabel = i;
		if(i == curPage)
			numLabel = '<b>' + i + '</b>';

		middle += '<a href="#" onclick="showPage(' + i + ')"> '
			+ numLabel + ' </a>';
	}
	
	var next = '<b> | </b><span class="pz2-next">Next &#62;&#62;</span>';
	if (pages - curPage > 0)
	var next = '<b> | </b><a href="#" class="pz2-next" onclick="pagerNext()">'
		+'Next &#62;&#62;</a>';

	predots = '';
	if (firstClkbl > 1)
		predots = '...';

	postdots = '';
	if (lastClkbl < pages)
		postdots = '...';

	pagerDiv.innerHTML += '<div style="float: clear">' 
		+ prev + predots + middle + postdots + next + '</div><hr/>';
}

function showPage (pageNum)
{
	curPage = pageNum;
	my_paz.showPage( curPage - 1 );
}

// simple paging functions

function pagerNext() {
	if ( totalRec - recPerPage*curPage > 0) {
		my_paz.showNext();
		curPage++;
	}
}

function pagerPrev() {
	if ( my_paz.showPrev() != false )
		curPage--;
}

// swithing view between targets and records

function switchView(view) {
	
	var targets = document.getElementById('pz2-targetView');
	var records = document.getElementById('pz2-recordView');
	
	switch(view) {
		case 'pz2-targetView':
			targets.style.display = "block";			
			records.style.display = "none";
			break;
		case 'pz2-recordView':
			targets.style.display = "none";			
			records.style.display = "block";
			break;
		default:
			alert('Unknown view.');
	}
}

// detailed record drawing
function toggleDetails (prefixRecId) {
	var recId = prefixRecId.replace('rec_', '');
	// var oldRecId = curDetRecId;
	// curDetRecId = recId;
	
	// remove current detailed view if any
	var detRecordDiv = document.getElementById('det_'+ recId);
	// lovin DOM!
	if (detRecordDiv) {
		detRecordDiv.parentNode.removeChild(detRecordDiv);
	}
	else {
		my_paz.record(recordIDForHTMLID(recId));
	}
}

function replaceHtml(el, html) {
  var oldEl = typeof el === "string" ? document.getElementById(el) : el;
  /*@cc_on // Pure innerHTML is slightly faster in IE
	oldEl.innerHTML = html;
	return oldEl;
	@*/
  var newEl = oldEl.cloneNode(false);
  newEl.innerHTML = html;
  oldEl.parentNode.replaceChild(newEl, oldEl);
  /* Since we just removed the old element from the DOM, return a reference
	 to the new element, which can be used to restore variable references. */
  return newEl;
};





function renderDetails(data, marker) {

	var deduplicate = function (information) {
		// remove duplicate entries from an array
		for (var i = 0; i < information.length; i++) {
			var item = information[i];
			var isDuplicate = false;
			for (var j = 0; j < i; j++) {
				var jtem = information[j];					
				if ( item == jtem) {
					isDuplicate = true;
					information.splice(i, 1);
					i--;
					break;
				}
			}
		}	
	}



	/*	markupInfoItems
		Returns marked up version of the DOM items passed, putting them into a list if necessary:
		input:	infoItems - array of DOM elements to insert
		output: * 1-element array => just the element
				* multi-element array => UL with an LI containing each of the elements
				* empty array => undefined
	*/
	var markupInfoItems = function (infoItems) {
		var result;

		if (infoItems.length == 1) {
			 result = infoItems[0];
		}
		else if (infoItems.length > 1) {
			result = document.createElement('ul');
			$(infoItems).each( function(index) {
					var LI = document.createElement('li');
					result.appendChild(LI);
					LI.appendChild(this);
				}
			);
		}

		return result;
	}



	/*	detailLine
		input:	title - string with element's name
				informationElements - array of DOM elements with the information to be displayed
		output: DOM element of table row with 
				* heading containing the localised and plural conscious name of the item
				* data containing the informationElements passed. 
					If there is more than one of them, they are wrapped in a list
	*/
	var detailLine = function (title, informationElements) {
		if (informationElements && title) {
			var headingText;	

			if (informationElements.length == 1) {
				headingText = localise('detail-label-'+title);
			}
			else {
				var labelKey = 'detail-label-' + title + '-plural';
				var labelLocalisation = localise(labelKey);
				if (labelKey === labelLocalisation) { // no plural form, fall back to singular
					labelKey = 'detail-label-' + title;
					labelLocalisation = localise(labelKey);
				}
				headingText = labelLocalisation;
			}

			var infoItems = markupInfoItems(informationElements);

			if (infoItems) { // we have information, so insert it
				var tableRow = document.createElement('tr');
				tableRow.setAttribute('class', 'pz2-detail-' + title);

				var rowHeading = document.createElement('th');
				tableRow.appendChild(rowHeading);
				rowHeading.appendChild(document.createTextNode(headingText + ':'));

				var rowData = document.createElement('td');
				tableRow.appendChild(rowData);
				rowData.appendChild(infoItems);
			}
		}

		return tableRow;
	}



	/*	detailLineAuto
		input:	title - string with the element's name
		output:	DOM element for title and the data coming from data[md-title]
				as created by detailLine.
	*/
	var detailLineAuto = function (title) {
		var result = undefined;
		var element = DOMElementForTitle(title);

		if (element.length !== 0) {
			result = detailLine( title, element );
		}

		return result;
	} 

	
	/*	linkForDOI
		input:	DOI - string with DOI
		output: DOM anchor element with link to the DOI at dx.doi.org
	*/
	var linkForDOI = function (DOI) {
		var linkElement = document.createElement('a');
		linkElement.setAttribute('href', 'http://dx.doi.org/' + DOI);
		linkElement.appendChild(document.createTextNode(DOI));
		return linkElement;
	}



	/*	DOMElementForTitle
		input:	title - title string
		output:	nil, if the field md-title does not exist in data. Otherwise:
				array of DOM elements created from the fields of data[md-title]
	*/
	var DOMElementForTitle = function (title) {
		var result = [];
		if ( data['md-' + title] !== undefined ) {
			var theData = data['md-' + title];
			deduplicate(theData);

			// run loop backwards as pazpar2 seems to reverse the order of metadata items
			for (var dataNumber = theData.length -1; dataNumber >= 0; dataNumber--) {
				var rawDatum = theData[dataNumber];
				var wrappedDatum;
				switch	(title) {
					case 'doi':
						wrappedDatum = linkForDOI(rawDatum);
						break;
					default:
						wrappedDatum = document.createTextNode(rawDatum);
				}
				result.push(wrappedDatum);
			}
		}

		return result;
	}




	*/
		var ISSNs = data['md-issn'];
		}


	
	/*
		Figure out whether there is a Google Books Preview for the current data.
		Parameters: 
		* element: DOM element that is the container of the Google Books Preview button.
	*/
	var addGoogleBooksLinkIntoElement = function (element) {

		// Create list of search terms from ISBN and OCLC numbers.
		var searchTerms = [];
		for (locationNumber in data.location) {
			var numberField = String(data.location[locationNumber]['md-isbn']);
			var matches = numberField.replace(/-/g,'').match(/[0-9]{9,12}[0-9xX]/g);
			for (var matchNumber in matches) {
				searchTerms.push('ISBN:' + matches[matchNumber]);
			}
			numberField = String(data.location[locationNumber]['md-oclc']);
			matches = numberField.match(/[0-9]{4,}/g);
			for (var matchNumber in matches) {
				searchTerms.push('OCLC:' + matches[matchNumber]);
			}
		}
		

		// Asynchronously query Google Books for the ISBN/OCLC numbers in question.
		var googleBooksURL = 'http://books.google.com/books?bibkeys=' + searchTerms 
					+ '&jscmd=viewapi&callback=?';
		$.getJSON(googleBooksURL,
			function(data) {
				/*
					If there are multiple results choose the one we want:
						1. If available the first one with 'full' preview capabilities,
						2. otherwise the first one with 'partial' preview capabilities,
						3. undefined if none of the results has preview capabilities.
					Usually the first item in the list is also the newest one.
				*/
				var selectedBook;
				$.each(data, 
					function(bookNumber, book) {
						if (book.preview === 'full') {
							selectedBook = book;
							return false;
						}
						else if (book.preview === 'partial' && selectedBook === undefined) {
							selectedBook = book;
						}
					}
				);
			
				// Add link to Google Books if there is a selected book.
				if (selectedBook !== undefined) {
					var bookLink = document.createElement('a');
					bookLink.setAttribute('href', selectedBook.preview_url);
					bookLink.onclick = openPreview;

					var language = $('html').attr('lang');
					if (language === undefined) {
						language = 'en';
					}
					var buttonImageURL = 'http://www.google.com/intl/' + language + '/googlebooks/images/gbs_preview_button1.gif';
					var buttonImage = document.createElement('img');
					buttonImage.setAttribute('src', buttonImageURL);
					buttonImage.setAttribute('alt', localise('Google Books Vorschau'));
					bookLink.appendChild(buttonImage);
					element.appendChild(bookLink);

					if (selectedBook.thumbnail_url !== undefined) {
						var coverArtImage = document.createElement('img');
						bookLink.appendChild(coverArtImage);
						coverArtImage.setAttribute('src', selectedBook.thumbnail_url);
						coverArtImage.setAttribute('alt', localise('Umschlagbild'));
						coverArtImage.setAttribute('class', 'bookCover');
					}
				}
			}
		);


		// Open Preview when Google Books button is clicked.
		var openPreview = function() {
			// Get hold of containing <div>, creating it if necessary.
			var previewDivName = 'googlePreview';
			var previewDiv = document.getElementById(previewDivName);
			var previewContainerDivName = 'googlePreviewContainer';
			var previewContainerDiv = document.getElementById(previewContainerDivName);

			if (!previewContainerDiv) {
				previewContainerDiv = document.createElement('div');
				previewContainerDiv.setAttribute('id', previewContainerDivName);
				$('#page').get(0).appendChild(previewContainerDiv);

				var titleBarDiv = document.createElement('div');
				titleBarDiv.setAttribute('class', 'titleBar');
				previewContainerDiv.appendChild(titleBarDiv);
				$(titleBarDiv).css({height:'20px', width:'100%', position:'absolute', top:'-20px', background:'#eee'});

				var closeBoxLink = document.createElement('a');
				titleBarDiv.appendChild(closeBoxLink);
				$(closeBoxLink).css({display:'block', height:'16px', width:'16px', position:'absolute', right:'2px', top:'2px', background:'#666'})
				closeBoxLink.setAttribute('href', 'javascript:$("#' + previewContainerDivName + '").hide(200);');

				var previewDiv = document.createElement('div');
				previewDiv.setAttribute('id', previewDivName);
				previewContainerDiv.appendChild(previewDiv);
			}
			else {
				$(previewContainerDiv).show(200);
			}

			// Viewer: stored in the container div, created when needed.
			var viewer = new google.books.DefaultViewer(previewDiv);
			viewer.load(this.href);

			return false;
		}		
	}

	var extraLinks = function () {
		var tr = document.createElement('tr');
		tr.appendChild(document.createElement('th'));
		var td = document.createElement('td');
		tr.appendChild(td);

		var booksSpan = document.createElement('span');
		td.appendChild(booksSpan);
		booksSpan.setAttribute('class', 'googleBooks');
		addGoogleBooksLinkIntoElement(booksSpan);


		//var coverSpan = document.createElement('span');
		//td.appendChild(coverSpan);
		//coverSpan.setAttribute('class', 'covers');
		// addCoverArtIntoElement(coverSpan);

		return tr;
	}


	var appendInfoToContainer = function (info, container) {
		if (info != undefined && container != undefined ) {
			if (typeof(info.length) === 'undefined') {
				// info is a single item
				container.appendChild(info);
			}
			else {
				for (var infoNumber in info) {
					container.appendChild(info[infoNumber]);
				}
			}
		}
	}




	var locationDetails = function () {

		var detailInfoItemWithLabel = function (fieldContent, labelName, dontTerminate) {
			var infoSpan;
			if ( fieldContent !== undefined ) {
				infoSpan = document.createElement('span');
				infoSpan.setAttribute('class', 'pz2-info'); 
				if ( labelName !== undefined ) {
					var infoLabel = document.createElement('span');
					infoSpan.appendChild(infoLabel);
					infoLabel.setAttribute('class', 'pz2-label');
					infoLabel.appendChild(document.createTextNode(labelName));
					infoSpan.appendChild(document.createTextNode(' '));
				}
				infoSpan.appendChild(document.createTextNode(fieldContent));

				if (!dontTerminate) {
					infoSpan.appendChild(document.createTextNode('; '));
				}
			}			
			return infoSpan;
		}


		var detailInfoItem = function (fieldName) {
			var infoItem;
			var value = location['md-'+fieldName];

			if ( value !== undefined ) {
				var label;
				var labelID = 'detail-label-' + fieldName;
				var localisedLabelString = localise(labelID);

				if ( localisedLabelString != labelID ) {
					label = localisedLabelString;
				}

				var content = value.join(', ').replace(/^[ ]*/,'').replace(/[ ;.,]*$/,'');

				infoItem = detailInfoItemWithLabel(content, label);
			}

			return infoItem;
		}



		/*  cleanISBNs
			Takes the array of ISBNs in location['md-isbn'] and
				1. Normalises them
				2. Removes duplicates (particularly the ISBN-10 corresponding to an ISBN-13)
		*/
		var cleanISBNs = function () {
			/*	normaliseISBNsINString
				Vague matching of ISBNs and removing the hyphens in them.
				input: string
				output: string
			*/
			var normaliseISBNsInString = function (ISBN) {
				return ISBN.replace(/([0-9]*)-([0-9Xx])/g, '$1$2');
			}


			/*	pickISBN 
				input: 2 ISBN number strings without dashes
				output: if both are 'the same': the longer one (ISBN-13)
				        if they aren't 'the same': undefined
			*/
			var pickISBN = function (ISBN1, ISBN2) {
				var result = undefined;
				var numberRegexp = /([0-9]{9,12})[0-9xX].*/;
				var numberPart1 = ISBN1.replace(numberRegexp, '$1');
				var numberPart2 = ISBN2.replace(numberRegexp, '$1');
				if (!(numberPart1 == numberPart2)) {
					if (numberPart1.indexOf(numberPart2) != -1) {
						result = ISBN1;
					}
					else if (numberPart2.indexOf(numberPart1) != -1) {
						result = ISBN2;
					}
				}
				return result;
			}



			if (location['md-isbn'] !== undefined) {
				var newISBNs = []
				for (var index in location['md-isbn']) {
					var normalisedISBN = normaliseISBNsInString(location['md-isbn'][index]);
					for (var newISBNNumber in newISBNs) {
						var newISBN = newISBNs[newISBNNumber];
						var preferredISBN = pickISBN(normalisedISBN, newISBN);
						if (preferredISBN !== undefined) {
							newISBNs.splice(newISBNNumber, 1, preferredISBN);
							normalisedISBN = undefined;
							break;
						}
					}
					if (normalisedISBN !== undefined) {
						newISBNs.push(normalisedISBN);
					}
				}
				location['md-isbn'] = newISBNs;
			}
		}

		
		var electronicURLs = function() {
			var electronicURLs = location['md-electronic-url'];
			var URLsContainer;

			if (electronicURLs && electronicURLs.length != 0) {
				URLsContainer = document.createElement('span');

				for (var URLNumber in electronicURLs) {
					var URLInfo = electronicURLs[URLNumber];
					var linkText = '[' + localise('Link') + ']';
					var linkURL = URLInfo;
	
					if (typeof(URLInfo) === 'object' && URLInfo['#text'] !== undefined) {
						// URLInfo is not just an URL but an array also containing the link name 
						if (URLInfo['@name'] !== undefined) {
							linkText = '[' + URLInfo['@name'] + ']';
						}
						linkURL = URLInfo['#text'];
					}

					var link = document.createElement('a');
					URLsContainer.appendChild(link);
					link.setAttribute('href', linkURL);
					link.setAttribute('target', 'pz2-linktarget');
					link.innerHTML = linkText;
					if (URLNumber < electronicURLs.length - 1) {
						URLsContainer.appendChild(document.createTextNode(', '));
					}
				}
				URLsContainer.appendChild(document.createTextNode('; '));
			}
			return URLsContainer;		
		}


		var locationDetails = [];

		for ( var locationNumber in data.location ) {
			var localInfoItems = []

			var location = data.location[locationNumber];
			var localURL = location['@id'];
			var localName = location['@name'];

			var detailsRow = document.createElement('tr');
			var detailsHeading = document.createElement('th');
			detailsRow.appendChild(detailsHeading);
			detailsHeading.appendChild(document.createTextNode(localise('Ausgabe')+':'));
			var detailsData = document.createElement('td');
			detailsRow.appendChild(detailsData);

			appendInfoToContainer( detailInfoItem('edition'), detailsData );
			appendInfoToContainer( detailInfoItem('physical-extent'), detailsData );
			appendInfoToContainer( detailInfoItem('publication-name'), detailsData );
			appendInfoToContainer( detailInfoItem('publication-place'), detailsData );
			appendInfoToContainer( detailInfoItem('date'), detailsData );

			cleanISBNs();
			appendInfoToContainer( detailInfoItem('isbn'), detailsData );
			appendInfoToContainer( electronicURLs(), detailsData);

			
			var catalogueInfo = detailInfoItemWithLabel(location['md-id'], localName, true);
			catalogueInfo.setAttribute('title', localURL);
			detailsData.appendChild( catalogueInfo );
			
			locationDetails.push(detailsRow);
		}

		return locationDetails;
	}


	var detailsDiv = document.createElement('div');
	detailsDiv.setAttribute('class', 'pz2-details');
	detailsDiv.setAttribute('id', 'det_' + HTMLIDForRecordData(data));

	var detailsTable = document.createElement('table');
	detailsDiv.appendChild(detailsTable);

	appendInfoToContainer( detailLineAuto('author'), detailsTable );
	appendInfoToContainer( detailLineAuto('other-person'), detailsTable )
	appendInfoToContainer( detailLineAuto('description'), detailsTable );
 	appendInfoToContainer( detailLineAuto('medium'), detailsTable );
	appendInfoToContainer( detailLineAuto('series-title'), detailsTable );
	appendInfoToContainer( detailLineAuto('issn'), detailsTable );
	appendInfoToContainer( detailLineAuto('doi'), detailsTable );
	appendInfoToContainer( locationDetails(), detailsTable );
	appendInfoToContainer( extraLinks(), detailsTable );

	return detailsDiv;
}


/* 	Input: pz2 record data object
	Output: ID of that object in HTML-compatible form
			(replacing spaces by dashes)
*/
function HTMLIDForRecordData (recordData) {
	if (recordData.recid[0] !== undefined) {
		return recordData.recid[0].replace(/ /g,'+');
	}
}

/*	Input: Record ID in HTML compatible form
	Output: input with dashes replaced by spaces
*/
function recordIDForHTMLID (HTMLID) {
	return HTMLID.replace(/\+/g,' ');
}

//EOF
 
