/*
	config.js -- configuration variables for CAPCreator
	version 0.9.3 - 12 June 2014
	
	Copyright (c) 2013, Carnegie Mellon University
	All rights reserved.
	
	See LICENSE.txt for license terms (Modified BSD) 
			 
*/


// SET THESE FOR LOCAL CONFIGURATION
var CAPCreatorConfiguration = function() {	
	
	this.OpenLayersImgPath = "img/";  // relative path to the "img" subdirectory of OpenLayers install
	
	this.CAPCollectorSubmitURL = "http://localhost/cgi-bin/CAPCollector/post_cap.py";
	
	this.CAPCollectorBaseURL = "http://localhost/cap/data";
	
	
}

// Now create a global config object for the whole 
var config = new CAPCreatorConfiguration(); 
