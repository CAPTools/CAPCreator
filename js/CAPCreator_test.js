/**
 * @fileoverview CAPCreator.js unit tests.
 * @author arcadiy@google.com (Arkadii Yakovets)
 */


/* Define unit test module for CAPCreator tests. */
QUnit.module('CAPCreator.js Unit Tests');


/* Tests that escapedText() function returns expected result. */
QUnit.test('Test escape_text function', function(assert) {
  // Test escaped characters.
  var initialText = 'text to be <escaped>';
  var escapedText = escape_text(initialText);
  assert.equal(escapedText, 'text to be &lt;escaped&gt;',
               'Expected: text to be &lt;escaped&gt;');

  // Test regular characters.
  initialText = 'text to be not escaped';
  escapedText = escape_text(initialText);
  assert.equal(escapedText, initialText, 'Expected: text to be ' + initialText);
});


/* Tests that validate() function highlights invalid fields and shows error
 * messages.
 */
QUnit.test('Test required field validation', function(assert) {
  // DOM fixture for the test.
  var html = '<div id="info"><div class="form_row_div">' +
      '<label class="field_label">Event' +
      '<span class="required">*</span></label>' +
      '<div class="ui-input-text ui-shadow-inset ui-corner-all ui-btn-shadow' +
      ' ui-body-c ui-mini"><input type="text" name="text-event"' +
      ' id="text-event" class="required-field placeholder-field' +
      ' ui-input-text ui-body-c prepopulated" data-mini="true"' +
      ' onkeydown="removeStyles(this)" onpaste="removeStyles(this)"' +
      ' onchange="view2model(this)"></div></div>' +
      '<div><span class="required-placeholder hidden">* ' +
      'Required fields"</span></div></div>';
  $('<div>').html(html).appendTo($('#qunit-fixture'));

  var elementId = '#info';
  var textEvent = $('#text-event');
  var requiredPlaceholder = $(elementId + ' .required-placeholder');

  // Test validation failed.
  var initialClassList = textEvent.attr('class').split(/\s+/);
  assert.equal(initialClassList.indexOf('indicate-required-input'), -1,
               'Expected: indicate-required-input not in initial class list');
  var valid = validate(elementId);
  assert.equal(valid, false, 'Expected: validation failed');

  var validatedClassList = textEvent.attr('class').split(/\s+/);
  assert.notEqual(validatedClassList.indexOf('indicate-required-input'), -1,
                  'Expected: indicate-required-input in validated class list');
  assert.notEqual(requiredPlaceholder.css('display'), 'none',
                  'Expected: required placeholder is shown');

  // Test validation succeeded.
  textEvent.val('Some text event');
  valid = validate('#info');
  assert.ok(valid, 'Expected: validation succeeded');
  validatedClassList = textEvent.attr('class').split(/\s+/);
  assert.equal(requiredPlaceholder.css('display'), 'none',
               'Expected: required placeholder is not shown');
});
