/**
 * @license
 * Copyright (c) 2013, Carnegie Mellon University
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or
 * other materials provided with the distribution.
 *
 * Neither the name of the Carnegie Mellon University nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * widgets.js -- various for CAPComposer
 * version 1.0 - 20 August 2013
 *
 * Copyright (c) 2013, Carnegie Mellon University
 * All rights reserved.
 *
 * See LICENSE.txt for license terms (Modified BSD)
 *
 * DEPENDENCIES AND REQUIREMENTS:
 *  OpenLayers, jQuery, jQuery Mobile and caplib.js must already be loaded
 *  into the document.
 *
 */

/* Widget for a CAP tuple set element (set of valueName/value pairs,
   e.g., parameter, geocode).
*/

var CapButtonWidget = function(label, width) {
  return $('<a data-role="button" data-mini="true" ' +
      'class="ui-mini-smaller ui-btn ui-shadow ui-btn-corner-all ' +
      'ui-mini parameter ui-btn-up-c" data-corners="true" ' +
      'data-shadow="true" data-iconshadow="true" data-wrapperels="span" ' +
      'data-theme="c" style="vertical-align: middle; width:' + width + 'px">' +
      '<span class="ui-btn-inner "><span class="ui-btn-text">' + label +
      '</span></span></a>');
};

var CapParameterWidget = function(name, placeholder) {
  return $('<div class="cap-parameter">' +
      '<div class="invalid-placeholder-message hidden">' +
      gettext('Fill in placeholder') +
      ' <span class="invalid-placeholder-message-error"></span></div>' +
      '<div class="tuple-text ui-input-text ui-shadow-inset ' +
      'ui-corner-all ui-btn-shadow ui-body-c ui-mini"><input type="text" ' +
      'name="' + name + '" data-mini="true" placeholder="' + placeholder + '"' +
      'onchange="view2model(this)" onkeydown="removeStyles(this)" ' +
      'onpaste="removeStyles(this)" ' +
      'class="ui-input-text ui-body-c placeholder-field"></div></div>');
};

var CapTupleSetWidget = function(label, area, div) {
  this.div = div;
  this.area = area;
  this.tuples = [];
  label = gettext('Add a %s').replace('%s', label)
  this.addButton = new CapButtonWidget(label, 200);
  this.addButton.on('click', null, this, this.addItem).appendTo($(this.div));
};


CapTupleSetWidget.prototype = {
  addItem: function(event) {
    var tupleSet = event.data;  // ref to tupleSet
    var new_tuple = new CapTupleWidget(tupleSet, 500);
    tupleSet.tuples.push(new_tuple);  // add to array
    $(tupleSet.div).append($(new_tuple.div));  // add to screen
    new_tuple.valueName.focus();  // and put focus on valueName field
  },
  addAndPopulate: function(valueName, value) {
    var new_tuple = new CapTupleWidget(this, 500);
    $(new_tuple.valueName).find('input').val(valueName);
    $(new_tuple.value).find('input').val(value);
    this.tuples.push(new_tuple);  // add to array
    $(this.div).append($(new_tuple.div));  // add to screen
  },
  deleteItem: function(event) {
    var tuple = event.data;  // ref to tuple to be removed
    var tupleSet = tuple.tupleSet;  // ref to tupleSet
    // Remove from array.
    tupleSet.tuples.splice($.inArray(tuple, tupleSet.tuples), 1);
    $(tuple.div).remove(); // and also remove from screen
  },
  getAll: function() {  // return widget contents as an array of arrays
    var items = [];
    for (var i = 0; i < this.tuples.length; i++) {
      var item = [];
      var tuple_widget = this.tuples[i];
      // Utility escape_text() from CAPComposer.js.
      item.push(escape_text(tuple_widget.valueName.find('input').val()));
      item.push(escape_text(tuple_widget.value.find('input').val()));
      items.push(item);
    }
    return items;
  },
  removeAll: function() {  // Remove all tuples from the set.
    for (var i = this.tuples.length - 1; i >= 0; i--) {
      var tuple = this.tuples[i];
      this.tuples.pop(tuple); // Remove from array.
      $(tuple.div).remove(); // And also remove from screen.
    }
  }
};  // end CapTupleSetWidget definition


// Widget for a CAP tuple (an individual valueName/value pair)
var CapTupleWidget = function(tupleSet, widget_width) {
  this.tupleSet = tupleSet;
  this.div = $(document.createElement('div')).attr('class', 'tuple_holder');
  $(this.div).width(widget_width);

  this.valueName = CapParameterWidget('valueName', gettext('name'));
  this.valueName.appendTo($(this.div));
  this.valueName.change(tupleSet.changed);

  this.value = CapParameterWidget('value', gettext('value'));
  this.value.appendTo($(this.div));
  this.value.change(tupleSet.changed);
  this.delButton = CapButtonWidget(gettext('Delete'), 75);
  this.delButton.on('click', null, this,
                    tupleSet.deleteItem).appendTo($(this.div));
  return this;
};
