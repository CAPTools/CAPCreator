/*
	CAPCreator.js -- methods and handlers for CAPCreator
	version 0.9 - 20 August 2013
	
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
	$("#response_span").html("");  // clear the response message
	view2model();  // force an update from screens  
	$("#review_span").text( alert.getCAP() );
	// test against rules
	
	//   if incomplete, show release panel (uid, pwd, release button)
	
	//   else show error message only
	
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
		success: function(data, status, jqXHR) {
			var xml = jqXHR.responseText;
			var $div = $("#alert_view_div");
			var $span = $("#alert_view_span");
			$span.html("");
			$div.popup("open");
			$span.append( styleAlert(xml) ); // THIS NEED TO BE FLESHED OUT, BELOW
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
	alert.references = $("#hidden-references").val();
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
	$("#textarea-note").text( info.note );
	
	// clear and reload parameter set in widget
	parameter_set.removeAll();
	$(area.parameters).each( function() {
		parameter_set.addAndPopulate( this.valueName, this.value );
	} );
	
	// resources currently not implemented
	$("#text-areaDesc").text( area.areaDesc );
	
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
function styleAlert(cap_xml) {
	var xml = $.parseXML( cap_xml );
	var styled = "<pre>" + cap_xml + "</pre>";   // FOR NOW
	return styled;
}
