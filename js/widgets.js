/*
	widgets.js -- various for CAPComposer
	version 1.0 - 25 July 2013
	
	Copyright (c) 2013, Carnegie Mellon University
	All rights reserved.

	See LICENSE.txt for license terms (Modified BSD) 
	
	DEPENDENCIES AND REQUIREMENTS:
		OpenLayers, jQuery, jQuery Mobile and caplib.js must already be loaded into the document.
		 
*/


// Widget for a CAP tuple set element (set of valueName/value pairs, e.g., parameter, geocode)
var CapTupleSetWidget = function( label, area, div ) {	
	this.div = div;
	this.area = area;
	$(this.div).css( { 'padding':"5px", } );
	this.tuples = [];
	label = "Add a " + label;
	this.addButton = $('<input type="button" data-role="button" data-mini="true"/>').val(label);
	this.addButton.on( "click", null, this, this.addItem ).appendTo( $(this.div) ); 
}
CapTupleSetWidget.prototype = {
		
	addItem : function(event) {
		var tupleSet = event.data;  // ref to tupleSet
		var new_tuple = new CapTupleWidget( tupleSet, $(tupleSet.div).width() );
		tupleSet.tuples.push( new_tuple );  // add to array
		$(tupleSet.div).append( $(new_tuple.div) );  // add to screen
		new_tuple.valueName.focus();  // and put focus on valueName field
	},
	
	deleteItem : function(event) {
		var tuple = event.data;  // ref to tuple
		var tupleSet = tuple.tupleSet;  // ref to tupleSet
		tupleSet.tuples.splice( $.inArray(tuple, tupleSet.tuples),1); //remove from array
		$(tuple.div).remove(); // remove from screen
	},
	
	getAll : function() {  // return widget contents as an array of arrays
		var items = [];
		for (var i=0; i<this.tuples.length; i++ ) {
			var item = [];
			var tuple_widget = this.tuples[i];
			item.push( escape_text( tuple_widget.valueName.val() ) );  // utility escape_text() from CAPComposer.js
			item.push(  escape_text(tuple_widget.value.val() ) );
			items.push( item );
		}
		return items;
	},
	
}  // end CapTupleSetWidget definition

	
// Widget for a CAP tuple (an individual valueName/value pair)
var CapTupleWidget = function( tupleSet, widget_width ) {
	this.tupleSet = tupleSet;
	this.div = $(document.createElement('div')).attr('class','tuple_holder');
	$(this.div).width(widget_width);
	this.valueName = $("<input type='text' class='tuple_text_input' placeholder='valueName' name='valueName'/>").appendTo( $(this.div) );
	this.valueName.change(tupleSet.changed);
	this.value = $("<input type='text' class='tuple_text_input' placeholder='value' name='value'/>").appendTo( $(this.div) );
	this.value.change(tupleSet.changed);
	//this.delButton = $("<a data-mini='true' class='text_button'/>").text(' [-]').appendTo( $(this.div) );
	this.delButton = $('<input type="button" data-role="button" data-mini="true"/>').val("Delete");
	this.delButton.on( "click", null, this, tupleSet.deleteItem ).appendTo( $(this.div) ); 
	return this;
}
