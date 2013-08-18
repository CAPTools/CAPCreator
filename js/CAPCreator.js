/*
	CAPCreator.js -- methods and handlers for CAPCreator
	version 0.9 - 18 August 2013
	
	Copyright (c) 2013, Carnegie Mellon University
	All rights reserved.
	
	See LICENSE.txt for license terms (Modified BSD) 
	
	DEPENDENCIES AND REQUIREMENTS:
		OpenLayers, jQuery, jQuery Mobile and Moment.js, as well as local libraries
		config.js, caplib.js cap_map.js and widgets.js must be loaded in the HTML first
		 
*/

var versionID = "0.9"
var submitUrl = config.CAPCollectorSubmitURL;
var atomUrl = config.CAPCollectorBaseURL + "/index.atom";
var max_headline_length = 140;

var alert = new Alert();
var info = alert.addInfo();
var area = info.addArea();

var parameter_set;
var geocode_set;


// On initialization pick up default language
$(document).on('pageinit', "#alert", function() { 
	info.lang = $("#select-language").val();	
} );

// When initializing pages, apply data-set widgets
$(document).on('pageinit', "#info", function() { 
	parameter_set = new CapTupleSetWidget( "Parameter", area, $('#parameter_div') );
	$(".tm").html("CAPCreator&trade; " + versionID);
	$("#textarea-note").val("Created using CAPCreator" + versionID);
} );
$(document).on('pageinit', "#area", function() { 
	geocode_set = new CapTupleSetWidget( "Geocode", area, $('#geocode_div') );
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
				var updated = moment( $this.find("updated").text() ).format("YYYY-MM-DD <b>HH:mm</b> (Z)");
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


// Any time we go to the Review page, show the CAP XML
$(document).on('pageshow', "#release", function() { 
	showResult("");  // clear the response message
	view2model();  // force an update from screens  
	$("#review_span").text( alert.getCAP() );
	// test against rules
	
	//   if incomplete, show release panel (uid, pwd, release button)
	
	//   else show error message only
	
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
		success: function(data, status, jqXHR) {
			var $div = $("#alert_view_div");
			var $span = $("#alert_view_span");
			$span.html("");
			$div.popup("open");
			$span.append("[This needs XSL transform]\n");
			$span.append("<pre>" + jqXHR.responseText + "</pre>");
			$("#cancel_button").click( function(e) { console.log("cancel clicked"); } );
			$("#update_button").click( function(e) { console.log("update clicked"); } );
			
			// DISABLE FOR NOW, PENDING COMPLETION OF THE ABOVE FUNCTIONS
			$("#update_button").button('disable');
			$("#update_button").button('refresh');
			$("#cancel_button").button('disable');
			$("#cancel_button").button('refresh');
			
		},	
	} );
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
	alert.scope = $("#select-scope").val();
	alert.source = escape_text( $("#text-source").val() );	
	alert.note = escape_text( $("#textarea-note").val() ); 
	info.categories = [];
	info.addCategory( $("#select-categories").val() );
	info.event = escape_text( $("#text-headline").val() ); // note that this is forced to be same as headline
	info.responseTypes = [];
	info.addResponseType( $("#select-responseTypes").val() );
	info.urgency = $("#select-urgency").val();
	info.severity = $("#select-severity").val();
	info.certainty = $("#select-certainty").val();
	var expires_in_minutes = $("#select-expires-min").val();
	if (! expires_in_minutes) { expires_in_minutes = 60; }
	var expires_in_millis = now.getTime() + (expires_in_minutes * 60000);
	var expires_date = new Date( expires_in_millis );
	var expires_string = expires_date.toISOString().split(".")[0];
	if (timezone == "Z") { 
		info.expires = expires_string + "+00:00";
	} else {
		info.expires = expires_string;
	}
	info.senderName = escape_text( $("#text-senderName").val() ); 
	info.headline = escape_text( $("#text-headline").val() );  
	info.description = escape_text( $("#text-description").val() );  
	info.instruction = escape_text( $("#text-instruction").val() ); 
	info.contact = escape_text( $("#text-contact").val() ); 
	if( parameter_set ) { info.parameters = parameter_set.getAll(); }
	area.areaDesc = escape_text( $("#text-areaDesc").val() ); 	
	area.polygons = getPolygons(); // function getPolygons() from cap_map.js
	area.circles = getCircles();  // function getCircles() from cap_map.js
	if ( geocode_set ) { area.geocodes = geocode_set.getAll(); }
}


// submit alert JSON to server
function submitAlert() {
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
        		showResult( result_message);
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
        	showResult( result_message );
        	setTimeout( function() { $.mobile.navigate("#current"); }, 3000 );
        },
        error: function (data, textStatus, errorThrown) {
        	result_message = result_message + "POSSIBLE ERROR IN TRANSMISSION<br>\n";
        	result_message = result_message + "Check active alerts before resending.<br>\n";
        	console.log( "Error: " + data.status + " " + data.responseText );
        	setTimeout( function() { $.mobile.navigate("#current"); }, 3000 );
          },
    });
	
}

function showResult(message) {
	$("#response_span").html(message);
}


// update screen with values from model
function model2screen() {}
	
	
// load JSON into the model
function load_template() {}

