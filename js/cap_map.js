/*
	cap_map.js -- Map for authoring CAP geometries (circles and polygons)
	version 0.9 - 6 August 2013
	
	Copyright (c) 2013, Carnegie Mellon University
	All rights reserved.

	See LICENSE.txt for license terms (Modified BSD) 
	
	DEPENDENCIES AND REQUIREMENTS:
		OpenLayers, jQuery, jQuery Mobile, config.js and caplib.js must already be loaded into the document.
		Document must have appropriately-sized and -located <div>s named "map", "coords" and "radius".
		Document must have radio-button set named "noneToggle", "circleToggle" and "polygonToggle" with values "none", "circle" and "polygon" respectively
	
	API:
		renderFeatures() - returns an array of geometry descriptions from the drawing layer
		clearAll() - removes all features from the drawing layer
		clearLast() - removes the last feature added to the drawing layer
		setView( float, float, int ) - requires the latitude and longitude to center on and the relative zoom level to view
  
*/

OpenLayers.ImgPath = config.OpenLayersImgPath;
var Geographic = new OpenLayers.Projection("EPSG:4326");
var Mercator = new OpenLayers.Projection("EPSG:3857");  // more modern (and official) version of 900913

var map, drawControls, drawingLayer, cap_area;

$(document).delegate("#area",'pageshow', function() {  // waits unil the page is visible, 'sted "pageinit"
	
if ( ! map ){   // only initialize the map once!
	
	if ( ! cap_area ) {
		cap_area = new Area("Undesignated Area");  // constructor in caplib.js
	}
	
    map = new OpenLayers.Map({
    	div:"map",
    	allOverlays: true,
    	projection: Mercator,
    	displayProjection: Geographic,
    	autoUpdateSize: true,
    	});
    
 	// create reference layers
    var gphyLayer = new OpenLayers.Layer.Google(
            "Google", {	
            	type: google.maps.MapTypeId.TERRAIN, 
            	numZoomLevels:22,
          	}
        );
    
   var osmLayer = new OpenLayers.Layer.OSM( "OpenStreetMap" );
    osmLayer.setVisibility(false);
    
  	// create drawing layer
    drawingLayer = new OpenLayers.Layer.Vector("Drawing Layer");
    
    // add all layers to map
    map.addLayers( [ gphyLayer, osmLayer, drawingLayer ] );

    // create draw controls
    drawControls = {
            circle: new OpenLayers.Control.DrawFeature( 
            			drawingLayer,
            			OpenLayers.Handler.RegularPolygon,
                    	{
            				handlerOptions: {sides: 40},
            				callbacks: { move:showRadius }
            			}
            		),
            polygon: new OpenLayers.Control.DrawFeature(
            			drawingLayer,
            			OpenLayers.Handler.Polygon
            		)
        };
    
    // prevent map from panning when in "circle" mode
    drawControls["circle"].handler.stopDown = stop;
    drawControls["circle"].handler.stopUp = stop;
    
     // reset mode to "Navigate" after each feature
    drawingLayer.events.register('featureadded', this, resetToNav)
    
    // add controls to the map
    // ...including the collection of (named) draw controls
    for(var key in drawControls) {
        map.addControl(drawControls[key]);
    }
    map.addControl( new OpenLayers.Control.LayerSwitcher() );

    // default initial view (for now)
	setView(13.812, 100.54, 10);
	
}
	
} );  // end of $(document).bind('pageinit') initialization


// set the map view
function setView(centerLat, centerLon, zoomLevel) {
	var centerCoords = new OpenLayers.LonLat(centerLon, centerLat);
	map.setCenter(centerCoords.transform(Geographic, Mercator), zoomLevel);
}

// handler for radio buttons, activates the corresponding OpenLayers control
function toggleControl(element) {
    for(key in drawControls) {
        var control = drawControls[key];
        if(element.value == key && element.checked) {
            control.activate();
        } else {
            control.deactivate();
        }
    }
}

//reset map to Navigate mode (handler for drawingLayer's 'featureadded' event)
function resetToNav(feature) {
	$("#noneToggle").prop("checked",true).checkboxradio("refresh")
	$("#circleToggle").prop("checked",false).checkboxradio("refresh")
	$("#polygonToggle").prop("checked",false).checkboxradio("refresh");  // sets the radio button
	toggleControl( $("#noneToggle") );  // and sets the drawing mode
	$("#radius").text( "" );  // clear the radius display, if any
}

// return an array of polygon strings
function getPolygons() {
	var polygons = [];
	if (drawingLayer) {
		for (var i=0; i < drawingLayer.features.length; i++) {
			var feature = drawingLayer.features[i];
			if (feature.geometry.getVertices().length != 40) {  // a somewhat arbitrary test for now
				polygons.push( polygonToCapXml(feature) );
			}
		}
	}
	return polygons;
}

// return an array of circle strings
function getCircles() {
	var circles = [];
	if (drawingLayer) {
		for (var i=0; i < drawingLayer.features.length; i++) {
			var feature = drawingLayer.features[i];
			if (feature.geometry.getVertices().length == 40) {  // a somewhat arbitrary test for now
				circles.push( circleToCapXml(feature) );
			}
		}
	}
	return circles;
}
	
// clear the entire draw layer
function clearAll(element) { drawingLayer.destroyFeatures(); }

// remove the last feature added to the draw layer
function clearLast(element) { drawingLayer.destroyFeatures( drawingLayer.features[ drawingLayer.features.length -1 ] ) }


// add a polygon in CAP string format as a feature on the drawing layer
function addCapPolygonToMap(polygonString) {
	points = [];
	pointStrings = polygonString.split(" ");
	// note swap of coordinate order 'twixt CAP and OpenLayers
	for (var i = 0; i<pointStrings.length; i++) {
		var coords = pointStrings[i].split(",");
		points.push( new OpenLayers.Geometry.Point( parseFloat(coords[1]), parseFloat(coords[0]) ).transform(Geographic,Mercator)  );
	}
	var ring = new OpenLayers.Geometry.LinearRing(points);
	var polygon = new OpenLayers.Geometry.Polygon(ring);
	var feature = new OpenLayers.Feature.Vector(polygon);
	drawingLayer.addFeatures([feature]);
}

//add a circle in CAP string format as a feature on the drawing layer
function addCapCircleToMap(circleString) {
	var parts = circleString.split(" ");
	var radius = parseFloat(parts[1]) * 1000;
	var coords = parts[0].split(",");
	var centerPoint = new OpenLayers.Geometry.Point( parseFloat(coords[1]), parseFloat(coords[0]) ).transform(Geographic,Mercator);
	console.log(centerPoint)
	var circle = new OpenLayers.Geometry.Polygon.createRegularPolygon(
			centerPoint,
			radius,
			40
		);
	var feature = new OpenLayers.Feature.Vector(circle);
	drawingLayer.addFeatures([feature]);
}

// handle changes in a textArea with id "areaDesc"
function setAreaDesc() {
	cap_area.areaDesc = $('textarea#areaDesc').val()
}
         	

/**
VARIOUS UTILITY FUNCTIONS
**/
          
function polygonToCapXml(feature) {
	var vertices = feature.geometry.getVertices();
	if (vertices.length < 3) return null;  // need at least three vertices
	var polygon = [];
	var polygonString = "";
	for  (var i=0; i < vertices.length; i++) {
		polygonString += pointToRoundedCAPString(vertices[i],5) + " ";
	}
	polygonString += pointToRoundedCAPString(vertices[0],5);
	return polygonString;
}

function circleToCapXml(circle) {
	var centroid = circle.geometry.getCentroid();
	var radius = radiusOfCircle(circle.geometry);
	//geographicCentroid = centroid.transform(Mercator, Geographic);
	var circleString = pointToRoundedCAPString(centroid, 5) + " " + radius;
	return circleString;
	
}

// note that this returns the coordinates in CAP (lat,lon) order
function pointToRoundedCAPString(vertex, decimalPoints) {
	var geo_point = vertex.transform(Mercator, Geographic);
	var string =  geo_point.y.toFixed(decimalPoints) + "," + geo_point.x.toFixed(decimalPoints);
	vertex.transform(Geographic, Mercator);  // gotta undo the transform!
	return string;
}

function radiusOfCircle(circle) {
	var vertices = circle.getVertices();
	var centroid = circle.getCentroid();
	edgePoint = vertices[0];
	var radius = distanceBetweenPoints(centroid, edgePoint );
	return radius;
}

function distanceBetweenPoints(point1, point2){  // both points in Mercator projection
    return (point1.distanceTo(point2) / 1000).toFixed(5);  // in km, geodesic
}

// display circle radius during draw, handler attached to draw control for circle
function showRadius(circle) {
	$("#radius").text( "Radius: " + radiusOfCircle(circle) + " km." );
}

// display prompt during polygon draw
function showPrompt() {
	$("#radius").text( "Double-click to finish." );
}

// clear display
function clearPrompt() {
	$("#radius").text( "" );
}

// clear the coordinates display, handler attached to "out" event of draw layer
function clearCoords(foo) {
	$("#coords").text("");
}
