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
 * CAPCreator.js -- methods and handlers for CAPCreator
 * version 0.9.3 - 12 June 2014
 *
 * Copyright (c) 2013, Carnegie Mellon University
 * All rights reserved.
 *
 * See LICENSE.txt for license terms (Modified BSD)
 *
 * DEPENDENCIES AND REQUIREMENTS:
 * OpenLayers, jQuery and jQuery Mobile as well as local libraries
 * config.js, caplib.js cap_map.js and widgets.js must be loaded in the
 * HTML first.
 *
 *
 */

var versionID = config.versionID;
var submitUrl = config.CAPCollectorSubmitURL;
var atomUrl = config.atomUrl;
var maxHeadlineLength = config.maxHeadlineLength;

var alert = new Alert();
var info = alert.addInfo();
var area = info.addArea();

var parameter_set;
var geocode_set;
var area_descriptions = [];

var area_templates;
var message_templates;

var messageTemplatePrepopulatedFieldIds = [];


// When initializing pages, apply data-set widgets
$(document).on('pageinit', '#info', function() {
  parameter_set = new CapTupleSetWidget(gettext('Parameter'), area,
                                        $('#parameter_div'));
  $('.tm').html('CAPCreator&trade; ' + versionID);
  $('#textarea-note').val('Using CAPCreator' + versionID);
});


$(document).on('pageshow', '#info', function() {
  // On show pick up default language if no language specified.
  if (!$('#select-language').val()) {
    $('#select-language').val($('#ui-language').val()).selectmenu('refresh');
  }
  info.language = $('#ui-language').val();
});


$(document).on('pageinit', '#area', function() {
  geocode_set = new CapTupleSetWidget(gettext('Geocode'), area,
                                      $('#geocode_div'));
});


$(document).on('pageinit', '#alert', function() {
  // Hide custom expiration time input on page init.
  $('#custom-expiration-time-block').hide();
  // Set default expiration time to 1 hour.
  $('#select-expires-min').val(
      config.defaultExpiresDurationMinutes).selectmenu('refresh');
});


// Any time we enter the Current Alerts page, get ATOM feed and update display.
$(document).on('pageshow', '#current', function() {
  $.ajax({
    url: atomUrl,
    dataType: 'xml',
    cache: false,
    success: function(data, status, jqXHR) {
      var $span = $('#current_alerts_span');
      $span.html('');
      var xml = $.parseXML(jqXHR.responseText);
      $(xml).find('entry').each(function() {
        $this = $(this);
        var sender = $this.find('name').text();
        var title = $this.find('title').text();
        var updated = $this.find('updated').text();
        var link = $this.find('link').attr('href');
        var urgency = $this.find('urgency').text();
        var severity = $this.find('severity').text();
        var certainty = $this.find('certainty').text();
        var responseType = $this.find('responseType').text();
        var areaDesc = $this.find('areaDesc').text();
        $span.append('<a href="" onclick="viewAlert(\'' + link +
            '\');" style="font-weight:bold;font-size:1.3em;">' + title +
            '</a><br>');
        $span.append('FOR: ' + areaDesc + '<br>');
        $span.append('ACTION: ' + responseType + ' (' + urgency + ' / ' +
                     severity + ' / ' + certainty + ')<br>');
        $span.append(updated + ' FROM ' + sender + '<br>');
        $span.append('<br>');
      });
    }
  });
});


// Any time we go to the Review page, show the CAP XML, clear the authentication
$(document).on('pageshow', '#release', function() {
  $('#response_span').html('');  // clear the response message
  view2model();  // force an update from screens
  $('#review_span').text(alert.getCAP());

  // TBD qualify alert against profiles / rules

  // Set focus to username field.
  $('#text-uid').focus();

  // Set focus to password field after user pressed enter on username field.
  $('#text-uid').keydown(function(event) {
    if (event.which == 13) {
     $('#text-pwd').focus();
    }
  });

  // Release alert after user pressed enter on password field.
  $('#text-pwd').keydown(function(event) {
    if (event.which == 13) {
     $('#sending-alert-button').trigger('click');
    }
  });
});


// Utility to escape HTML entities in user-supplied text
function escape_text(rawText) {
  return $('<div/>').text(rawText).html();
}

// character counter/limiter for headline
$(document).on('keyup', '#text-headline', function() {
  var current_text = $(this).val();
  if (current_text.length > maxHeadlineLength) {
    current_text = current_text.substring(0, maxHeadlineLength);
    $(this).val(current_text);
  }
  $('#headline_counter').text(String(maxHeadlineLength - current_text.length));
});


// display a current CAP alert in the popup div
function viewAlert(link) {
  $.ajax({
    url: link,
    dataType: 'xml',
    cache: false,
    success: function(data, status, jqXHR) {
      var xml = jqXHR.responseText;
      var $div = $('#alert_view_div');
      var $span = $('#alert_view_span');
      $span.html('');
      $div.popup('open');
      $span.append(cap2html(xml));
      var alert = parseCAP2Alert(xml);
      alert.references = alert.sender + ',' + alert.identifier + ',' +
                         alert.sent;
      $('#cancel_button').click(function(e) {
        $('#select-message-template').val('None').selectmenu('refresh');
        $('#select-area-template').val('None').selectmenu('refresh');
        alert.msgType = 'Cancel';
        clearWebFieldIfAutopopulated(alert);
        alert2view(alert);
        $.mobile.navigate('#alert');
      });
      $('#update_button').click(function(e) {
        $('#select-message-template').val('None').selectmenu('refresh');
        $('#select-area-template').val('None').selectmenu('refresh');
        alert.msgType = 'Update';
        clearWebFieldIfAutopopulated(alert);
        alert2view(alert);
        $.mobile.navigate('#alert');
      });
      $('#view_button').click(function(e) {
        var newTab = window.open('/feed/' + alert.identifier + '.xml',
                                 '_blank');
        newTab.focus();
      });
    }
  });
}

/**
 * Clear the web field set automatically by the app when prepopulating alert
 * data for update or cancel.
 */
function clearWebFieldIfAutopopulated(alert) {
  var info = alert.infos[0];
  if (info.web.indexOf('/feed/' + alert.identifier) != -1) {
    info.web = '';
  }
}

function removeStyles(element) {
  if (element) {
    var el = $(element);
    // Remove pre-populated from template related styles.
    el.removeClass('prepopulated');
    // Remove validation related styles.
    el.removeClass('indicate-required-select');
    el.closest('.indicate-required-input').removeClass(
        'indicate-required-input');
    el.closest('.indicate-required-select').removeClass(
        'indicate-required-select');
    el.closest('.indicate-invalid-placeholder').removeClass(
        'indicate-invalid-placeholder');
  }
}

function handleAreaTemplateChange(urlPrefix, adminUrl) {
  handleTemplateChange(urlPrefix, '#select-area-template',
                       '', 'CreateNewAreaTemplate', adminUrl, function(alert) {
    var info = alert.infos[0];
    var area = info.areas[0];
    if ($.inArray(area.areaDesc, area_descriptions) == -1) {
      area_descriptions.push(area.areaDesc);
      $(area.geocodes).each(function() {
        geocode_set.addAndPopulate(this.valueName, this.value);
      });
      $(area.polygons).each(function() {
        addCapPolygonToMap(String(this));
      });
      $(area.circles).each(function() {
        addCapCircleToMap(String(this));
      });
    }
    $('#textarea-areaDesc').val(area_descriptions.join(', '));
    $('#clear-area-templates').show();
  });
}


function clearAreaTemplates() {
  $('#clear-area-templates').hide();
  $('#textarea-areaDesc').val('');
  $('#select-area-template').val('None').selectmenu('refresh');
  area_descriptions = [];
  geocode_set.removeAll();
  clearAll();
}


function handleMessageTemplateChange(urlPrefix, adminUrl) {
  handleTemplateChange(urlPrefix, '#select-message-template',
                       '#reapply-message-template', 'CreateNewMessageTemplate',
                       adminUrl, function(alert) {
    messageTemplatePrepopulatedFieldIds = [];

    function prepopulateValue(elementId, elementValue) {
      if (elementValue) {
        messageTemplatePrepopulatedFieldIds.push(elementId);
        var element = $(elementId);
        element.addClass('prepopulated');
        element.val(elementValue);
      }
    }

    function prepopulateMenu(elementId, elementValue) {
      var element = $(elementId);
      if (elementValue) {
        messageTemplatePrepopulatedFieldIds.push(elementId);
        element.val(elementValue);
      }
      element.find(':selected').addClass('prepopulated');
      element.selectmenu('refresh');
    }

    $('#custom-expiration-time-block').hide();
    $('#reapply-message-template').hide();
    $('.prepopulated').removeClass('prepopulated');
    prepopulateMenu('#select-message-template');

    var info = alert.infos[0];
    // Load message fields into the current view.

    prepopulateMenu('#select-status', alert.status);
    // Don't change message type for 'Update' and 'Cancel'.
    if (alert.msgType != 'Update' && alert.msgType != 'Cancel') {
      prepopulateMenu('#select-msgType', alert.msgType);
    }
    prepopulateMenu('#select-scope', alert.scope);
    prepopulateValue('#textarea-note', alert.note);
    // Only the first value is imported.
    if (info.categories && info.categories[0]) {
      prepopulateMenu('#select-categories', info.categories[0]);
    }
    // Only the first value is imported.
    if (info.responseTypes && info.responseTypes[0]) {
      prepopulateMenu('#select-responseTypes', info.responseTypes[0]);
    }
    prepopulateMenu('#select-urgency', info.urgency);
    prepopulateMenu('#select-severity', info.severity);
    prepopulateMenu('#select-certainty', info.certainty);
    if (alert.expiresDurationMinutes) {
      prepopulateMenu('#select-expires-min', alert.expiresDurationMinutes);
      if ($('#select-expires-min').val() != alert.expiresDurationMinutes) {
        prepopulateMenu('#select-expires-min', 'Other');
        $('#custom-expiration-time-block').show();
        prepopulateValue('#text-expires', alert.expiresDurationMinutes);
      }
    } else {
      $('#select-expires-min').val(
          config.defaultExpiresDurationMinutes).selectmenu('refresh');
    }
    prepopulateMenu('#select-language', info.language);

    if (!$('#select-language').val()) {
      $('#select-language').val(
          $('#ui-language').val()).selectmenu('refresh');
    }
    prepopulateValue('#text-senderName', info.senderName);
    prepopulateValue('#text-headline', info.headline);
    prepopulateValue('#text-event', info.event);
    prepopulateValue('#textarea-description', info.description);
    prepopulateValue('#textarea-instruction', info.instruction);
    prepopulateValue('#text-web', info.web);
    prepopulateValue('#text-contact', info.contact);
    prepopulateValue('#text-source', info.source);

    if (info.parameters) {
      // Clear and reload parameter set in widget.
      parameter_set.removeAll();
      $(info.parameters).each(function() {
        parameter_set.addAndPopulate(this.valueName, this.value);
      });
      $('.tuple_text_input').addClass('prepopulated');
    }
  });
}

function handleTemplateChange(urlPrefix, selectId, reapplyTemplateId,
    createNewTemplateId, createNewTemplateUrl, onSuccess) {

  function createPopupWindow(url, width, height) {
    var left = screen.width / 2 - width / 2;
    var top = screen.height / 2 - height / 2;
    var dimenstions = 'height=' + height + ', width=' + width;
    var position = 'top=' + top + ', left=' + left;
    var params = dimenstions + ' ' + position;
    var newTab = window.open(url, '_blank', params);
    newTab.focus();
  }

  var templateId = $(selectId).find(':selected').val();
  if (templateId && templateId == createNewTemplateId) {
    $(reapplyTemplateId).hide();
    var newTab = createPopupWindow(createNewTemplateUrl, 800, 400);
  } else if (templateId && templateId != 'None') {
    var link = urlPrefix + '?template_id=' + templateId;
    $.ajax({
      url: link,
      dataType: 'xml',
      cache: false,
      success: function(data, status, jqXHR) {
        var xml = jqXHR.responseText;
        var alert = parseTemplateToAlert(xml);
        onSuccess(alert);
      }
    });
  } else {
    $('.prepopulated').removeClass('prepopulated');
    $(reapplyTemplateId).hide();
  }
}

function setLanguage(language, csrfToken) {
  $.ajax('/i18n/setlang/', {
    type: 'POST',
     data: {
        'csrfmiddlewaretoken': csrfToken,
        'language': language
    },
    dataType: 'text',
    success: function(data, textStatus, jqXHR) {
        window.location.reload();
    }
  });
}


function parseTemplateToAlert(template_xml) {
  var xml = $.parseXML(template_xml);
  var alert = parseCAP2Alert(xml);
  // Non-CAP-compliant fields:
  alert.expiresDurationMinutes = $(xml).find('expiresDurationMinutes').text();
  return alert;
}


// update model with values from screen
function view2model(element) {
  alert.identifier = 'pending';
  alert.sender = 'unverified';
  var now = new Date();
  var sent_string = now.toISOString();
  var local_sent_string = sent_string.split('.')[0];
  var timezone = sent_string.split('.')[1].substring(3);
  if (timezone == 'Z') {
    alert.sent = local_sent_string + '+00:00';
  } else {
    alert.sent = local_sent_string;
  }
  alert.status = $('#select-status').val();
  alert.msgType = $('#select-msgType').val();
  if ((alert.msgType == 'Update') || (alert.msgType == 'Cancel')) {
    $('#hidden-references').prop('readonly', false);
  } else {
    $('#hidden-references').prop('readonly', true);
  }
  alert.scope = $('#select-scope').val();
  alert.references = $('#hidden-references').val();
  alert.source = escape_text($('#text-source').val());
  alert.note = escape_text($('#textarea-note').val());
  info.event = escape_text($('#text-event').val());
  info.categories = [];
  info.addCategory($('#select-categories').val());
  info.responseTypes = [];
  // Set default response type if not set.
  info.addResponseType($('#select-responseTypes').val() || 'None');
  info.urgency = $('#select-urgency').val();
  info.severity = $('#select-severity').val();
  info.certainty = $('#select-certainty').val();
  var expires_in_minutes = $('#select-expires-min').val();
  if (expires_in_minutes == 'Other') {
    $('#custom-expiration-time-block').show();
    expires_in_minutes = $('#text-expires').val();
  } else {
    $('#custom-expiration-time-block').hide();
  }
  if (!expires_in_minutes) {
    expires_in_minutes = 60;
  }
  var expires_in_millis = now.getTime() + (expires_in_minutes * 60000);
  var expires_date = new Date(expires_in_millis);
  var expires_string = expires_date.toISOString().split('.')[0];
  if (timezone == 'Z') {
    info.expires = expires_string + '+00:00';
  } else {
    info.expires = expires_string;
  }
  info.language = $('#select-language').val();
  info.senderName = escape_text($('#text-senderName').val());
  info.headline = escape_text($('#text-headline').val());
  info.description = escape_text($('#textarea-description').val());
  info.instruction = escape_text($('#textarea-instruction').val());
  info.contact = escape_text($('#text-contact').val());
  info.web = escape_text($('#text-web').val() || 'pending');
  if (parameter_set) { info.parameters = parameter_set.getAll(); }
  area.areaDesc = escape_text($('#textarea-areaDesc').val());
  area.polygons = getPolygons(); // function getPolygons() from cap_map.js
  area.circles = getCircles();  // function getCircles() from cap_map.js
  if (geocode_set) {
    area.geocodes = geocode_set.getAll();
  }
  if (element) {
    removeStyles(element);
    if (messageTemplatePrepopulatedFieldIds.indexOf(
        '#' + $(element).attr('id')) != -1 &&
        $('#select-message-template').val() != 'None') {
      $('#reapply-message-template').show();
    }
  }
}


// submit alert JSON to server
function sendAlert(csrfToken, element) {
  var result_message = '';
  var uid = $('#text-uid').val();
  var password = $('#text-pwd').val();

  $('#sending-alert-button').addClass('hidden');
  $('#sending-alert-indicator').removeClass('hidden');
  $('#response_status').html('');
  $(element).unbind('click');

  $.ajax(submitUrl, {
      type: 'POST',
      data: {
          'csrfmiddlewaretoken': csrfToken,
          'uid': uid,
          'password': password,
          'xml': alert.getCAP()
      },
      dataType: 'json',
        success: function(data, textStatus, jqXHR) {
          var response_json = data;
          var isValid = response_json['valid'];
          if (isValid) {
            result_message = result_message +
                gettext('Success: Valid CAP 1.2 MESSAGE SENT') + '<br>\n';
          } else {
            result_message = result_message +
                gettext('INVALID CAP 1.2') + '<br>\n';
            result_message = result_message + gettext('SERVER MESSAGE') + ': ' +
                             response_json.error + '\n';
          }
          result_uuid = 'UUID: ' + response_json['uuid'];
          $(element).hide();
          // Display the result.
          $('#response_status').html(result_message);
          $('#response_uuid').html(result_uuid);
          $('#text-uid').val('');  // Clear the uid field.
          $('#text-pwd').val('');  // Clear the password field.
          parameter_set.removeAll();  // Clear parameter set.
          area_descriptions = [];  // Clear area descriptions.
          // And after delay, loop back to the "Current Alerts" screen.
          setTimeout(function() { window.location.href = '/'; }, 3000);
        },
        error: function(data, textStatus, errorThrown) {
          setTimeout(function() {
            $('#sending-alert-indicator').addClass('hidden');
            $('#sending-alert-button').removeClass('hidden');
            $(element).click(function() {
              sendAlert.call(csrfToken, element);
            });
            if (data.status == 400) {
              result_message = gettext(
                  'Please enter valid login and password.');
              $('#response_status').html(result_message);
              return;
            } else if (data.status == 403) {
              result_message = gettext(
                  'You are not authorized to release alerts. ' +
                  'Ask your app administrator to be added to the ' +
                  '"can release alerts" group.');
              $('#response_status').html(result_message);
              return;
            } else {
              result_message = result_message +
                               gettext('POSSIBLE ERROR IN TRANSMISSION.');
              result_message = result_message + ' ' +
                               gettext('Check active alerts before resending.');
              // Display the results.
              $('#response_status').html(result_message);
              console.log('Error: ' + data.status + ' ' + data.responseText);
            }
          }, 300);
        }
    });
}


// update the screens with values from an Alert object
function alert2view(alert) {
  var info = alert.infos[0];
  var area = info.areas[0];
  $('#select-status').val(alert.status).selectmenu('refresh');
  $('#select-msgType').val(alert.msgType).selectmenu('refresh');
  $('#select-scope').val(alert.scope).selectmenu('refresh');
  $('#hidden-references').val(alert.references);
  // only the first value is imported
  $('#select-categories').val(info.categories[0]).selectmenu('refresh');
  // only the first value is imported
  $('#select-responseTypes').val(info.responseTypes[0]).selectmenu('refresh');
  $('#select-urgency').val(info.urgency).selectmenu('refresh');
  $('#select-severity').val(info.severity).selectmenu('refresh');
  $('#select-certainty').val(info.certainty).selectmenu('refresh');
  // expiration is not imported
  $('#select-language').val(info.language).selectmenu('refresh');
  $('#text-senderName').val(info.senderName);
  $('#text-event').val(info.event);
  $('#text-headline').val(info.headline);
  $('#textarea-description').val(info.description);
  $('#textarea-instruction').val(info.instruction);
  $('#text-contact').val(info.contact);
  $('#text-source').val(info.source);
  $('#text-web').val(info.web);
  $('#textarea-note').val(area.note);

  // clear and reload parameter set in widget
  if (parameter_set) {
    parameter_set.removeAll();
  }
  $(info.parameters).each(function() {
    parameter_set.addAndPopulate(this.valueName, this.value);
  });

  // resources currently not implemented

  $('#textarea-areaDesc').val(area.areaDesc);

  // clear and reload geocode set in widget
  if (geocode_set) {
    geocode_set.removeAll();
  }
  $(area.geocodes).each(function() {
    geocode_set.addAndPopulate(this.valueName, this.value);
  });

  // clear and reload polygons in map
  if (drawingLayer) {
    drawingLayer.destroyFeatures();
  }
  $(area.polygons).each(function() {
    addCapPolygonToMap(String(this));
  });
  // clear and reload circles in map
  $(area.circles).each(function() {
    addCapCircleToMap(String(this));
  });
  // altitude is not imported
  // ceiling is not imported

  if (area.areaDesc) {
    area_descriptions = area.areaDesc.split(', ');
    $('#clear-area-templates').show();
  }
}


// style CAP XML string as HTML
function cap2html(cap_xml) {
  var xml = $.parseXML(cap_xml);
  var alert = parseCAP2Alert(cap_xml);
  var info = alert.infos[0];
  var area = info.areas[0];
  // create HTML fragment (suitable to insert into a div)
  var html = "<table class='html_table'>\n" +
      "<tr><td class='html_label_cell'>headline</td><td colspan='5'>" +
      info.headline + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>senderName</td><td colspan='5'>" +
      info.senderName + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>sender</td><td>" + alert.sender +
      "</td><td class='html_label_cell'>sent</td>" +
      "<td colspan='3'>" + alert.sent + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>status</td><td>" + alert.status +
      "</td><td class='html_label_cell'>msgType</td>" +
      "<td colspan='3'>" + alert.msgType + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>urgency</td><td>" +
      info.urgency + '</td>' +
      "<td class='html_label_cell'>severity</td><td>" +
      info.severity + '</td>' +
      "<td class='html_label_cell'>certainty</td><td>" +
      info.certainty + '</td>' + '</tr>\n' +
      "<tr><td class='html_label_cell'>response</td><td colspan='5'>" +
      info.response + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>areaDesc</td><td colspan='5'>" +
      area.areaDesc + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>description</td><td colspan='5'>" +
      info.description + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>instruction</td><td colspan='5'>" +
      info.instruction + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>expires</td><td colspan='5'>" +
      info.expires + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>identifier</td><td colspan='5'>" +
      alert.identifier + '</td></tr>\n' +
      "<tr><td class='html_label_cell'>category</td><td>" +
      info.categories[0] + '</td>' +
      "<td class='html_label_cell'>event</td><td colspan='3'>" +
      info.event + '</td>' +
      '</tr>\n' + '</table>\n';
  return html;
}


function resetAllFields() {
  var blankAlert = new Alert();
  var blankInfo = blankAlert.addInfo();
  var blankArea = blankInfo.addArea();

  // Clear template selections.
  $('#select-message-template').val('None').selectmenu('refresh');
  $('#select-area-template').val('None').selectmenu('refresh');

  // Remove styles.
  $('.indicate-required-select').removeClass('indicate-required-select');
  $('.prepopulated').removeClass('prepopulated');
  $('.invalid-placeholder').addClass('hidden');
  $('.required-combined-placeholder').addClass('hidden');
  $('.required-placeholder').hide();
  $('#reapply-message-template').hide();

  alert2view(blankAlert);
}


$(document).on('click', '#current-next-button', function() {
  resetAllFields();
  $.mobile.navigate('#alert');
});


function validate(elementId) {
  // Hide error messages.
  $('.invalid-placeholder-message').addClass('hidden');
  $('.invalid-placeholder-message-error').text('');

  // Required fields validation.
  var requiredFieldsValid = true;
  var requiredFields = $(elementId + ' .required-field');
  var requiredPlaceholder = $(elementId + ' .required-placeholder');

  $.each(requiredFields, function() {
    var tagName = $(this).prop('tagName').toLowerCase();
    if (tagName == 'select' && !$(this).find(':selected').val()) {
      $(this).closest('.ui-btn-up-c').addClass('indicate-required-select');
      requiredFieldsValid = false;
    } else if ((tagName == 'input' || tagName == 'textarea') &&
        !$(this).val()) {
      $(this).parents('div.form_row_div').find(
          '.ui-input-text').addClass('indicate-required-input');
      requiredFieldsValid = false;
    }
    requiredPlaceholder.show();
  });

  if (requiredFieldsValid) {
    requiredPlaceholder.hide();
  }

  // Template placeholders validation.
  var templateFieldsValid = true;
  var templateFields = $(elementId + ' .placeholder-field');
  var templatePlaceholder = $(elementId + ' .invalid-placeholder');

  $.each(templateFields, function() {
    var fieldValue = $(this).val();
    var templateRegExp = new RegExp('{{.*?}}', 'g');
    var matchArray = fieldValue.match(templateRegExp);

    var validateTemplatesPlaceholder = $(this).parents('.form_row_div').find(
        '.invalid-placeholder-message');
    var validateTemplatesError = validateTemplatesPlaceholder.find(
        '.invalid-placeholder-message-error');

    if (matchArray) {
      templateFieldsValid = false;
      var elementName = $(this).attr('name');

      if (elementName == 'valueName' || elementName == 'value') {
        var parentDiv = $(this).parents('.cap-parameter');
        parentDiv.find('div.tuple-text').addClass(
            'indicate-invalid-placeholder');
        validateTemplatesPlaceholder = parentDiv.find(
            '.invalid-placeholder-message');
        validateTemplatesError = validateTemplatesPlaceholder.find(
            '.invalid-placeholder-message-error');
      } else {
        validateTemplatesError = validateTemplatesPlaceholder.find(
            '.invalid-placeholder-message-error');
        $(this).parents('div.form_row_div').find('.ui-input-text').addClass(
            'indicate-invalid-placeholder');
      }

      validateTemplatesPlaceholder.removeClass('hidden');
      validateTemplatesError.text(matchArray[0]);
      templatePlaceholder.show();
    }
  });

  if (templateFieldsValid) {
    templatePlaceholder.hide();
  }

  return requiredFieldsValid && templateFieldsValid;
}


function validateBeforeNavigate(buttonId, currentTab, nextTab) {
  $(document).on('click', buttonId, function() {
    var inputIsValid = validate(currentTab);  // Input validation goes first.
    var tabSpecificIsValid = true;

    // Tab specific validations.
    if (currentTab == '#area') {  // Area tab.
      var area = alert.infos[0].areas[0];
      var requiredAreaPlaceholder = $('.required-combined-placeholder');
      var validGeocode = false;
      if (area.geocodes.length) {
        validGeocode = area.geocodes[0][0] && area.geocodes[0][1];
      }
      if (!area.circles.length && !area.polygons.length && !validGeocode) {
        requiredAreaPlaceholder.removeClass('hidden');
        tabSpecificIsValid = false;
      } else {
        requiredAreaPlaceholder.addClass('hidden');
        tabSpecificIsValid = true;
      }
    }

    if (inputIsValid && tabSpecificIsValid) {
      $.mobile.navigate(nextTab);
    }
  });
}


validateBeforeNavigate('#alert-next-button', '#alert', '#info');
validateBeforeNavigate('#info-next-button', '#info', '#area');
validateBeforeNavigate('#area-next-button', '#area', '#release');
