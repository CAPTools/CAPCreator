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

// Utility to escape HTML entities in user-supplied text
function escape_text(rawText) {
  return $('<div/>').text(rawText).html();
}

var CapButtonWidget = function(label, width) {
  label = escape_text(label);
  width = escape_text(width);
  return $('<a data-role="button" data-mini="true" ' +
      'class="ui-mini-smaller ui-btn ui-shadow ui-btn-corner-all ' +
      'ui-mini parameter ui-btn-up-c" data-corners="true" ' +
      'data-shadow="true" data-iconshadow="true" data-wrapperels="span" ' +
      'data-theme="c" style="vertical-align: middle; width:' + width + 'px">' +
      '<span class="ui-btn-inner "><span class="ui-btn-text">' + label +
      '</span></span></a>');
};

var CapParameterWidget = function(name, placeholder) {
  name = escape_text(name);
  placeholder = escape_text(placeholder);
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

var CapTupleSetWidget = function(label, area, div, opt_onChange, opt_onDelete) {
  this.div = div;
  this.area = area;
  this.tuples = [];
  label = gettext('Add a %s').replace('%s', label);
  this.addButton = new CapButtonWidget(label, 200);
  this.addButton.on('click', null, this, this.addItem.bind(this))
      .appendTo($(this.div));
  this.customOnChange = opt_onChange;
  this.customOnDelete = opt_onDelete;
};


CapTupleSetWidget.prototype = {
  changed: function(tuple, previous) {
    if (this.customOnChange) {
      this.customOnChange(tuple, previous);
    }
  },
  addItem: function(event) {
    var newTuple = new CapTupleWidget(this, 500);
    this.tuples.push(newTuple);  // add to array
    $(this.div).append($(newTuple.div));  // add to screen
    newTuple.valueName.focus();  // and put focus on valueName field
  },
  addAndPopulate: function(valueName, value) {
    var newTuple = new CapTupleWidget(this, 500);
    $(newTuple.valueName).find('input').val(valueName);
    $(newTuple.value).find('input').val(value);
    this.tuples.push(newTuple);  // add to array
    $(this.div).append($(newTuple.div));  // add to screen
  },
  deleteItem: function(event) {
    var tuple = event.data;  // ref to tuple to be removed
    var tupleSet = tuple.tupleSet;  // ref to tupleSet
    // Remove from array.
    tupleSet.tuples.splice($.inArray(tuple, tupleSet.tuples), 1);
    $(tuple.div).remove(); // and also remove from screen
    if (tupleSet.customOnDelete
        && (event.triggerOnDelete === undefined || event.triggerOnDelete)) {
      tupleSet.customOnDelete(tuple);
    }
  },
  deleteByValue: function(valueName, value, triggerOnDelete) {
    for (var i = 0; i < this.tuples.length; i++) {
      var tuple = this.tuples[i];
      var tupleValue = tuple.getValue();
      if (valueName == tupleValue.valueName && value == tupleValue.value) {
        this.deleteItem({data: tuple, triggerOnDelete: triggerOnDelete});
        i--;
      }
    }
  },
  contains: function(valueName, value) {
    for (var i = 0; i < this.tuples.length; i++) {
      var tupleValue = this.tuples[i].getValue();
      if (tupleValue.valueName == valueName && tupleValue.value == value) {
        return true;
      }
    }
    return false;
  },
  getAll: function() {  // return widget contents as an array of arrays
    var items = [];
    for (var i = 0; i < this.tuples.length; i++) {
      items.push(this.tuples[i].getValue());
    }
    return items;
  },
  removeAll: function() {  // Remove all tuples from the set.
    for (var i = this.tuples.length - 1; i >= 0; i--) {
      var tuple = this.tuples[i];
      this.tuples.pop(tuple); // Remove from array.
      $(tuple.div).remove(); // And also remove from screen.
      if (this.customOnDelete) {
        this.customOnDelete(tuple);
      }
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
  this.valueName.previous = '';
  this.valueName.find('input').change(this.onChange.bind(this));

  this.value = CapParameterWidget('value', gettext('value'));
  this.value.appendTo($(this.div));
  this.value.find('input').change(this.onChange.bind(this));
  this.value.previous = '';
  this.delButton = CapButtonWidget(gettext('Delete'), 75);
  this.delButton.on('click', null, this,
                    tupleSet.deleteItem).appendTo($(this.div));
  return this;
};

CapTupleWidget.prototype.getValue = function() {
  return {
    valueName: escape_text(this.valueName.find('input').val()),
    value: escape_text(this.value.find('input').val())
  };
};

CapTupleWidget.prototype.onChange = function(event) {
  this.tupleSet.changed(this.getValue(), {
    valueName: this.valueName.previous,
    value: this.value.previous
  });
  var newValue = this.getValue();
  this.valueName.previous = newValue.valueName;
  this.value.previous = newValue.value;
};
