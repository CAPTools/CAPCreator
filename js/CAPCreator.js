/*
	CAPCreator.js -- methods and handlers for CAPCreator
	version 0.9.3 - 12 June 2014
	
	Copyright (c) 2013, Carnegie Mellon University
	All rights reserved.
	
	See LICENSE.txt for license terms (Modified BSD) 
	
	DEPENDENCIES AND REQUIREMENTS:
		OpenLayers, jQuery, jQuery Mobile and Moment.js, as well as local libraries
		config.js, caplib.js cap_map.js and widgets.js must be loaded in the HTML first
		
		Current alerts are in web subdirectory data with an index in index.atom.
		Templates for areas are in the web subdirectory templates/message, with a collection of label/filename pairs in index.json.
		Templates for areas are in the web subdirectory templates/area, with a collection of label/filename pairs in index.json.
		
		Example of an index.json file:
			-----------------
			{ 
			"templates" : [ 
				{ "label":"First Test Area", "link":"templates/area/test_area1.xml" },
				{ "label":"Second Test Area", "link":"templates/area/test_area2.xml" }
			] 
			}
			-----------------
		 
*/

var versionID = "0.9.3"
var submitUrl = config.CAPCollectorSubmitURL;
var atomUrl = config.CAPCollectorBaseURL + "/index.atom";
var max_headline_length = 140;

var alert = new Alert();
var info = alert.addInfo();
var area = info.addArea();

var parameter_set;
var geocode_set;

var area_templates;
var message_templates;


// On initialization pick up default language
$(document).on('pageinit', "#alert", function() { 
	info.lang = $("#select-language").val();	
	$("#hidden-references").prop("readonly", true);
	$("#text-expires").prop("readonly", true);
} );


// When initializing pages, apply data-set widgets
$(document).on('pageinit', "#info", function() { 
	parameter_set = new CapTupleSetWidget( "Parameter (optional)", area, $('#parameter_div') );
	$(".tm").html("CAPCreator&trade; " + versionID);
	$("#textarea-note").val("Using CAPCreator" + versionID);
} );
$(document).on('pageinit', "#area", function() { 
	geocode_set = new CapTupleSetWidget( "Geocode (optional)", area, $('#geocode_div') );
} );


// When initializing new page, load list of available message templates
$(document).on('pageinit', "#alert", function() { 
	$.getJSON( "templates/message/index.json" )
		.done( function(json) { 
			$.each(json.templates, function() {
				$("#select-message-template").append( new Option(this.label, this.link) );
			});
		} )
		.fail( function (jqxhr, textStatus, error) {
			console.log( "Can't load message templates: " + error );
	} );
} );


// When initializing area page, load list of available area templates
$(document).on('pageinit', "#area", function() { 
	$.getJSON( "templates/area/index.json" )
		.done( function(json) { 
			$.each(json.templates, function() {
				$("#select-area-template").append( new Option(this.label, this.link) );
			});
		} )
		.fail( function (jqxhr, textStatus, error) {
			console.log( "Can't load area templates: " + error );
	} );
} );


// Any time we enter the Current Alerts page, get ATOM feed and update display
$(document).on('pageshow', "#current", function() { 
	$.ajax( { 
		url: atomUrl,
		dataType: "xml",
		cache: false,
		success: function(data, status, jqXHR) {
			var $span = $("#current_alerts_span");
			$span.html('');
			var xml = $.parseXML(jqXHR.responseText );
			$(xml).find("entry").each( function() {
				$this = $(this);
				var sender = $this.find("name").text();
				var title = $this.find("title").text();
				var updated = moment.tz( $this.find("updated").text(), "America/Los_Angeles").format("YYYY-MM-DD <b>HH:mm</b> (Z)");
				var link = $this.find("link").attr("href");
				var urgency = $this.find("urgency").text();
				var severity = $this.find("severity").text();
				var certainty = $this.find("certainty").text();
				var responseType = $this.find("responseType").text();
				var areaDesc = $this.find("areaDesc").text();		
				$span.append( '<a href=""  onclick="viewAlert(\'' + link + '\');" style="font-weight:bold;font-size:1.3em;">' + title + '</a><br>' );
				$span.append( 'FOR: ' + areaDesc + '<br>');
				$span.append( 'ACTION: ' +  responseType + ' (' + urgency + ' / ' + severity + ' / ' + certainty + ')<br>');
				$span.append( updated + ' FROM ' + sender + '<br>');
				$span.append('<br>')
			} );
		},	
	} );
} );


// Any time we go to the Review page, show the CAP XML, clear the authentication
$(document).on('pageshow', "#release", function() { 
	$("#response_span").html("");  // clear the response message
	$("#text-uid").val("") // clear the uid field
	$("#text-pwd").val("") // clear the password field
	view2model();  // force an update from screens  
	$("#review_span").text( alert.getCAP() );
	
	// TBD qualify alert against profiles / rules
	
} );

// Any time we go to the Map page, resize each of the Geocodes widgets
$(document).on('pageshow',"#area", function () {
	
} );


// Utility to escape HTML entities in user-supplied text
function escape_text(rawText) {
	return $('<div/>').text(rawText).html();
}

// character counter/limiter for headline
$(document).on('keyup', "#text-headline", function() {
	var current_text = $(this).val();
	if (current_text.length > max_headline_length) { 
		current_text = current_text.substring(0,max_headline_length); 
		$(this).val(current_text);
	}
	$("#headline_counter").text( String( max_headline_length - current_text.length ) );
} );


// display a current CAP alert in the popup div
function viewAlert( link ) {
	$.ajax( { 
		url: link,
		dataType: "xml",
		cache: false,
		success: function(data, status, jqXHR) {
			var xml = jqXHR.responseText;
			var $div = $("#alert_view_div");
			var $span = $("#alert_view_span");
			$span.html("");
			$div.popup("open");
			$span.append( cap2html(xml) );
			var alert = parseCAP2Alert( xml );
			alert.references = alert.sender + "," + alert.identifier + "," + alert.sent;
			$("#cancel_button").click( function(e) { 
				alert.msgType = "Cancel";
				alert2view( alert );
				$.mobile.navigate("#alert");
			} );
			$("#update_button").click( function(e) { 
				alert.msgType = "Update";
				alert2view( alert );
				$.mobile.navigate("#alert");
			} );
		},	
	} );
}

// load an area template
function loadAreaTemplate() {
	var link = $("#select-area-template").find(":selected").val();
	$.ajax( {
		url: link,
		dataType: "xml",
		cache: false,
		success: function(data, status, jqXHR) {
			var xml = jqXHR.responseText;
			var alert = parseCAP2Alert( xml );
			var info = alert.infos[0];
			var area = info.areas[0];
			$("#textarea-areaDesc").text( area.areaDesc );
			geocode_set.removeAll();
			$(area.geocodes).each( function() {
				geocode_set.addAndPopulate( this.valueName, this.value );
			} );
			drawingLayer.destroyFeatures();
			$(area.polygons).each( function() {
				addCapPolygonToMap( String(this) );
			} );
			$(area.circles).each( function() {
				addCapCircleToMap( String(this) );
			} );
		},
	});
}


//load a message template
function loadMessageTemplate() {
	var link = $("#select-message-template").find(":selected").val();
	$.ajax( {
		url: link,
		dataType: "xml",
		cache: false,
		success: function(data, status, jqXHR) {
			var xml = jqXHR.responseText;
			var alert = parseCAP2Alert( xml );
			var info = alert.infos[0];;
			// load message fields into the current view
			var info = alert.infos[0];
			$("#select-status").val( alert.status ).selectmenu('refresh');
			$("#select-msgType").val( alert.msgType ).selectmenu('refresh');
			$("#select-scope").val( alert.scope ).selectmenu('refresh');
			if(info.event=="CAE")
			{$("#select-emrgncycode").val( info.event ).selectmenu('refresh');}
			else {$("#select-eventcode").val( info.event ).selectmenu('refresh');}
			$("#select-categories").val( info.categories[0] ).selectmenu('refresh');  // only the first value is imported
			$("#select-responseTypes").val( info.responseTypes[0] ).selectmenu('refresh'); // only the first value is imported
			$("#select-urgency").val( info.urgency ).selectmenu('refresh');
			$("#select-severity").val( info.severity ).selectmenu('refresh');
			$("#select-certainty").val( info.certainty ).selectmenu('refresh');
			$("#text-headline").text( info.headline );
			$("#textarea-description").text( info.description );
			$("#textarea-instruction").text( info.instruction );
			$("#textarea-note").val( alert.note );
			// clear and reload parameter set in widget
			parameter_set.removeAll();
			
			$(area.parameters).each( function() {
				parameter_set.addAndPopulate( this.valueName, this.value );
			} );
		},
	});
}


// update model with values from screen 
function view2model() {
	alert.identifier = "pending";
	alert.sender = "unverified";
	var now = new Date();
	var sent_string = now.toISOString();
	var local_sent_string = sent_string.split(".")[0];
	var timezone = sent_string.split(".")[1].substring(3);
	if (timezone == "Z") { 
		alert.sent = local_sent_string + "+00:00";
	} else {
		alert.sent = local_sent_string;
	}
	alert.status = $("#select-status").val();
	alert.msgType = $("#select-msgType").val();
	if((alert.msgType == "Update") || (alert.msgType == "Cancel"))
	{
		$("#hidden-references").prop("readonly", false);
		//alert.references = escape_text( $("#hidden-references").val() );
	}
	else
	{
		$("#hidden-references").prop("readonly", true);
	}

	alert.scope = $("#select-scope").val();
	alert.references = $("#hidden-references").val();
	alert.source = escape_text( $("#text-source").val() );	
	alert.note = escape_text( $("#textarea-note").val() ); 
	if ( $("#select-eventcode").val()!= "None" )
	info.event = escape_text( $("#select-eventcode").val() );
	else if ( $("#select-emrgncycode").val()!= "None" )
	info.event = escape_text( $("#select-emrgncycode").val() );
	else if ( $("#select-instrcode").val()!= "None" )
	info.event = escape_text( $("#select-instrcode").val() );
	else info.event = escape_text( "" );
	//info.event = escape_text( $("#text-headline").val() ); // note that this is forced to be same as headline
	info.categories = [];
	info.addCategory( $("#select-categories").val() );
	info.responseTypes = [];
	info.addResponseType( $("#select-responseTypes").val() );
	info.urgency = $("#select-urgency").val();
	info.severity = $("#select-severity").val();
	info.certainty = $("#select-certainty").val();
	var expires_in_minutes = $("#select-expires-min").val();
		if (expires_in_minutes == "More")
		{
			$("#text-expires").prop("readonly", false);
			expires_in_minutes = $("#text-expires").val();
		}
	else
		{
			$("#text-expires").prop("readonly", true);
		}		
	if (! expires_in_minutes) { expires_in_minutes = 60; }
	var expires_in_millis = now.getTime() + (expires_in_minutes * 60000);
	var localoffset = 25200000;
	var expires_date = new Date( expires_in_millis - localoffset );
	var expires_string = expires_date.toISOString().split(".")[0];
	if (timezone == "Z") { 
		info.expires = expires_string + "+00:00";
	} else {
		info.expires = expires_string;
	}
	info.senderName = escape_text( $("#text-senderName").val() ); 
	info.headline = escape_text( $("#text-headline").val() );  
	info.description = escape_text( $("#textarea-description").val() );  
	info.instruction = escape_text( $("#textarea-instruction").val() ); 
	info.contact = escape_text( $("#text-contact").val() ); 
	if( parameter_set ) { info.parameters = parameter_set.getAll(); }
	area.areaDesc = escape_text( $("#textarea-areaDesc").val() ); 
	area.polygons = getPolygons(); // function getPolygons() from cap_map.js
	area.circles = getCircles();  // function getCircles() from cap_map.js
	if ( geocode_set ) { area.geocodes = geocode_set.getAll(); }
}


// submit alert JSON to server
function sendAlert() {
	var result_message = "";
	var uid = $("#text-uid").val();
	if ( !uid ) { uid = "none"; };
	var password = $("#text-pwd").val();
	if ( !password ) { password = "none"; }
	$.ajax(submitUrl, { 
    	type: "POST",
    	data: { "uid": uid, "password": password, "xml": alert.getCAP(), },
    	dataType: "text",
    	contentType: "application/x-www-form-urlencoded; charset=utf-8",
        success: function (data, textStatus, jqXHR) {
        	var response_json = JSON.parse(jqXHR.responseText);
        	var isAuthenticated = response_json.authenticated;
        	if ( ! isAuthenticated ) {
        		result_message = result_message + "FAILED: Wrong User ID or Password<br>\n";
        		$("#response_span").html( result_message );
        		return;
        	}	
        	var isValid = response_json.valid;
        	if (isValid) { 
        		result_message = result_message + "Success: Valid CAP 1.2 MESSAGE SENT<br>\n";
	        } else { 
	        	result_message = result_message + "INVALID CAP 1.2<br>\n";
	        	result_message = result_message + "SERVER MESSAGE: " + response_json.error + "\n";
	        }
        	result_message = result_message + "UUID: " + response_json.uuid + "<br>\n";
        	// display the result
        	$("#response_span").html( result_message );
        	// and after delay, loop back to the Current Alerts screen
        	setTimeout( function() { $.mobile.navigate("#current"); }, 3000 );
        },
        error: function (data, textStatus, errorThrown) {
        	result_message = result_message + "POSSIBLE ERROR IN TRANSMISSION<br>\n";
        	result_message = result_message + "Check active alerts before resending.<br>\n";
        	console.log( "Error: " + data.status + " " + data.responseText );
        	// display the results
        	$("#response_span").html( result_message );
        	// and after delay, loop back to the Current Alerts screen
        	setTimeout( function() { $.mobile.navigate("#current"); }, 3000 );
          },
    });	
}


// update the screens with values from an Alert object
function alert2view( alert ) {
	var info = alert.infos[0];
	var area = info.areas[0];
	$("#select-status").val( alert.status ).selectmenu('refresh');
	$("#select-msgType").val( alert.msgType ).selectmenu('refresh');
	$("#select-scope").val( alert.scope ).selectmenu('refresh');
	$("#hidden-references").val( alert.references );
	$("#select-categories").val( info.categories[0] ).selectmenu('refresh');  // only the first value is imported
	$("#select-responseTypes").val( info.responseTypes[0] ).selectmenu('refresh'); // only the first value is imported
	$("#select-urgency").val( info.urgency ).selectmenu('refresh');
	$("#select-severity").val( info.severity ).selectmenu('refresh');
	$("#select-certainty").val( info.certainty ).selectmenu('refresh');
	// expiration is not imported
	$("#text-senderName").text( info.senderName );
	$("#text-headline").text( info.headline );
	$("#textarea-description").text( info.description );
	$("#textarea-instruction").text( info.instruction );
	$("#text-contact").text( info.contact );
	$("#text-source").text( info.source );
	$("#textarea-note").text( area.note );
	
	// clear and reload parameter set in widget
	parameter_set.removeAll();
	$(area.parameters).each( function() {
		parameter_set.addAndPopulate( this.valueName, this.value );
	} );
	
	// resources currently not implemented
	
	$("#textarea-areaDesc").text( area.areaDesc );
	
	// clear and reload geocode set in widget
	geocode_set.removeAll();
	$(area.geocodes).each( function() {
		geocode_set.addAndPopulate( this.valueName, this.value );
	} );
	
	// clear and reload polygons in map
	drawingLayer.destroyFeatures();
	$(area.polygons).each( function() {
		addCapPolygonToMap( String(this) );
	} );
	// clear and reload circles in map
	$(area.circles).each( function() {
		addCapCircleToMap( String(this) );
	} );
	// altitude is not imported
	// ceiling is not imported	
}


// style CAP XML string as HTML
function cap2html(cap_xml) {
	var xml = $.parseXML( cap_xml );
	var alert = parseCAP2Alert( cap_xml );
	var info = alert.infos[0];
	var area = info.areas[0];
	// create HTML fragment (suitable to insert into a div)
	var html = "<table class='html_table'>\n" +
"<tr><td class='html_label_cell'>headline</td><td colspan='5'>" + info.headline + "</td></tr>\n" +
"<tr><td class='html_label_cell'>senderName</td><td colspan='5'>" + info.senderName + "</td></tr>\n" +
"<tr><td class='html_label_cell'>sender</td><td>" + alert.sender + "</td><td class='html_label_cell'>sent</td>" +
	"<td colspan='3'>" + alert.sent + "</td></tr>\n" +
"<tr><td class='html_label_cell'>status</td><td>" + alert.status + "</td><td class='html_label_cell'>msgType</td>" +
	"<td colspan='3'>" + alert.msgType + "</td></tr>\n" +
"<tr><td class='html_label_cell'>urgency</td><td>" + info.urgency + "</td>" +
	"<td class='html_label_cell'>severity</td><td>" + info.severity + "</td>" +
	"<td class='html_label_cell'>certainty</td><td>" + info.certainty + "</td>" +
	"</tr>\n" +
"<tr><td class='html_label_cell'>response</td><td colspan='5'>" + info.response + "</td></tr>\n" +
"<tr><td class='html_label_cell'>areaDesc</td><td colspan='5'>" + area.areaDesc + "</td></tr>\n" +
"<tr><td class='html_label_cell'>description</td><td colspan='5'>" + info.description + "</td></tr>\n" +
"<tr><td class='html_label_cell'>instruction</td><td colspan='5'>" + info.instruction + "</td></tr>\n"+
"<tr><td class='html_label_cell'>expires</td><td colspan='5'>" + info.expires + "</td></tr>\n" +
"<tr><td class='html_label_cell'>identifier</td><td colspan='5'>" + alert.identifier + "</td></tr>\n" +
"<tr><td class='html_label_cell'>category</td><td>" + info.categories[0] + "</td>" +
"<td class='html_label_cell'>event</td><td colspan='3'>" + info.event + "</td>" + 
	"</tr>\n" +
	"</table>\n";   
	return html;
}
