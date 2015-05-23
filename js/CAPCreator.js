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
var timeZone = config.timeZone;

var alert = new Alert();
var info = alert.addInfo();
var area = info.addArea();

var parameter_set;
var geocodeSet;
var templateAreaDescriptions = [];
var selectedAreaTemplates = {};

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
  $('#select-area-template').select2({
    minimumResultsForSearch: Infinity,
    tags: true,
    tokenSeparators: [',']
  });
  geocodeSet = new CapTupleSetWidget(gettext('Geocode'), area,
      $('#geocode_div'), changeGeocode, deleteGeocode);
});

function changeGeocode(newTuple, previousTuple) {
  if (previousTuple.valueName && previousTuple.value) {
    clearGeocodePreview(previousTuple.valueName + '|' + previousTuple.value);
  }
  if (newTuple.valueName && newTuple.value) {
    maybeClearAreaTemplates(null);
    loadPreviewPolygons([newTuple]);
  }
}

function deleteGeocode(capTupleWidget) {
  var tuple = capTupleWidget.getValue();
  clearGeocodePreview(tuple.valueName + '|' + tuple.value);
  maybeClearAreaTemplates(tuple);
}

function maybeClearAreaTemplates(deletedTuple) {
  var areaDescriptionEditedManually =
      $('#textarea-areaDesc').val() != templateAreaDescriptions.join(', ');

  if (deletedTuple) {
    var matchingTemplateCount = 0;
    var matchingSingleGeocodeTemplateKey = null;
    // If the tuple being deleted matches exactly one template, remove that one
    // from the areaDesc and template list. Else, clear the areaDesc and
    // template list (since the user has changed what the templates
    // represented, they should fill in a new areaDesc).
    $.each(selectedAreaTemplates, function(key) {
      var template = this;
      $(template.geocodes).each(function() {
        if (this.valueName == deletedTuple.valueName
            && this.value == deletedTuple.value) {
          matchingTemplateCount++;
          if (template.geocodes.length == 1) {
            matchingSingleGeocodeTemplateKey = key;
          }
        }
      });
    });
    if (matchingTemplateCount == 1 && matchingSingleGeocodeTemplateKey) {
      if (!areaDescriptionEditedManually) {
        var removedAreaDesc =
            selectedAreaTemplates[matchingSingleGeocodeTemplateKey].areaDesc;
        templateAreaDescriptions.splice(
            templateAreaDescriptions.indexOf(removedAreaDesc), 1);
        $('#textarea-areaDesc').val(templateAreaDescriptions.join(', '));
      }
      delete selectedAreaTemplates[matchingSingleGeocodeTemplateKey];
      var value = $('#select-area-template').val();
      value.splice(value.indexOf(matchingSingleGeocodeTemplateKey), 1);
      $('#select-area-template').val(value).trigger("change");
      return;
    }
  }

  if (!areaDescriptionEditedManually) {
    templateAreaDescriptions = [];
    $('#textarea-areaDesc').val('');
  }
  selectedAreaTemplates = {};
  $('#select-area-template').val(null).trigger("change");
}

function initAlertPage() {
  // Hide custom expiration time input on page init.
  $('#custom-expiration-time-block').hide();
  // Set default expiration time.
  setDefaultAlertExpiration(config.defaultExpiresDurationMinutes, false);
  if (config.useDatetimePicker) {
    // init datetime picker
    // Since second selection is disabled, set minDateTime to be next whole
    // minute from now.
    var now = moment().tz(timeZone);
    var minDate = new Date(now.year(), now.month(), now.date(),
        now.hours(), now.minutes() + 1, 0, 0);

    $('#picker-expires').datetimepicker({
      minDateTime: minDate,
      timezone: now.format('Z'),
      showTimezone: false,
      controlType: 'select',
      dateFormat: 'yy-mm-dd\'T\'',
      timeFormat: 'HH:mm:ss Z',
      showSecond: false,
      second: 0,
      onSelect: function(dateText, inst) {
        // Force refresh to ensure drop down updates are picked up.
        $('#picker-expires').datetimepicker('refresh');
      }
    });
  }
}

$(document).on('pageinit', '#alert', initAlertPage);


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
        var link = escape_text($this.find('link').attr('href'));
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
        clearAreaTemplates();
        alert.msgType = 'Cancel';
        clearWebFieldIfAutopopulated(alert);
        alert2view(alert);
        $.mobile.navigate('#alert');
      });
      $('#update_button').click(function(e) {
        $('#select-message-template').val('None').selectmenu('refresh');
        clearAreaTemplates();
        alert.msgType = 'Update';
        clearWebFieldIfAutopopulated(alert);
        alert2view(alert);
        $.mobile.navigate('#alert');
        loadPreviewPolygons(geocodeSet.getAll());
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

function handleAreaTemplateChange(urlPrefix) {
  var selectedArr = $('#select-area-template').val() || [];
  handleAddedAreaTemplates(urlPrefix, selectedArr);
  handleRemovedAreaTemplates(selectedArr);
}

function handleAddedAreaTemplates(urlPrefix, selectedArr) {
  var addedTemplates = [];
  $.each(selectedArr, function() {
    if (!selectedAreaTemplates[this]) {
      addedTemplates.push(this);
    }
  });
  if (addedTemplates.length > 0) {
    // NOTE: Currently only one template can be added at a time
    var addedTemplateId = addedTemplates[0];
    loadTemplate(urlPrefix, addedTemplateId, function(templateAlert) {
      var templateInfo = templateAlert.infos[0];
      var templateArea = templateInfo.areas[0];
      var geocodes = [];

      if (!selectedAreaTemplates[addedTemplateId]) {
        selectedAreaTemplates[addedTemplateId] = templateArea;
        templateAreaDescriptions.push(templateArea.areaDesc);
        $(templateArea.geocodes).each(function() {
          if (!geocodeSet.contains(this.valueName, this.value)) {
            geocodes.push({valueName: this.valueName, value: this.value});
            geocodeSet.addAndPopulate(this.valueName, this.value);
          }
        });
        $(templateArea.polygons).each(function() {
          addCapPolygonToMap(String(this), templateArea.areaDesc);
        });
        $(templateArea.circles).each(function() {
          addCapCircleToMap(String(this), templateArea.areaDesc);
        });
      }
      $('#textarea-areaDesc').val(templateAreaDescriptions.join(', '));
      loadPreviewPolygons(geocodes);
    });
  }
}

function handleRemovedAreaTemplates(selectedArr) {
  var removedTemplates = [];
  $.each(selectedAreaTemplates, function(key) {
    if (selectedArr.indexOf(key) == -1) {
      removedTemplates.push(key);
    }
  });
  $.each(removedTemplates, function() {
    var templateArea = selectedAreaTemplates[this];
    delete selectedAreaTemplates[this];
    $(templateArea.geocodes).each(function() {
      geocodeSet.deleteByValue(this.valueName, this.value, false);
      clearGeocodePreview(this.valueName + '|' + this.value);
    });
    clearDrawnAreaBySource(templateArea.areaDesc);
    templateAreaDescriptions.splice(
        templateAreaDescriptions.indexOf(templateArea.areaDesc), 1);
    $('#textarea-areaDesc').val(templateAreaDescriptions.join(', '));
  });
}

function clearAreaTemplates() {
  $('#select-area-template').val(null);
  selectedAreaTemplates = {};
  templateAreaDescriptions = [];
  $('#textarea-areaDesc').val('');
  geocodeSet.removeAll();
  clearAllDrawnAreas();
}

function loadPreviewPolygons(geocodes) {
  if (geocodes.length == 0) {
    return;
  }

  $.ajax({
    url: polygonPreviewUrl,
    type: 'POST',
    data: {
      'csrfmiddlewaretoken': csrfToken,
      'geocodes': JSON.stringify(geocodes)
    },
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      var responseJson = data;
      $(responseJson).each(function() {
        var id = this.id;
        var xml = $.parseXML('<x>' + this.content + '</x>');
        $(xml).find('polygon').each(function() {
          addCapPolygonToMap($(this).text(), 'geocodepreview', id);
        });
      });
    }
  });
}

function prepopulateValue(elementId, elementValue) {
  if (elementValue) {
    messageTemplatePrepopulatedFieldIds.push(elementId);
    var element = $(elementId);
    element.addClass('prepopulated');
    element.val(elementValue);
  }
}

function prepopulateMenu(elementId, elementValue, opt_highlightPrepopulated) {
  if (opt_highlightPrepopulated === undefined) {
    opt_highlightPrepopulated = true;
  }
  var element = $(elementId);
  if (elementValue) {
    messageTemplatePrepopulatedFieldIds.push(elementId);
    element.val(elementValue);
  }
  if (opt_highlightPrepopulated) {
    element.find(':selected').addClass('prepopulated');
  }
  element.selectmenu('refresh');
}

function setDefaultAlertExpiration(expiresMinutes, highlightPrepopulated) {
  prepopulateMenu('#select-expires-min', expiresMinutes, highlightPrepopulated);
  if (expiresMinutes == 'Other') {
    $('#custom-expiration-time-block').show();
  } else if ($('#select-expires-min').val() != expiresMinutes) {
    // If default expiration minutes not in dropdown, select 'Other' and
    // populate default.
    prepopulateMenu('#select-expires-min', 'Other', highlightPrepopulated);
    $('#custom-expiration-time-block').show();
    if (config.useDatetimePicker) {
      var alertDate = moment(moment().unix() * 1000 +
          expiresMinutes * 60 * 1000).tz(timeZone);
      var alertDateStr = alertDate.format('YYYY-MM-DD') +
          'T ' + $.datepicker.formatTime('HH:mm:ss Z', {
              hour: alertDate.hours(),
              minute: alertDate.minutes(),
              second: 0,
              timezone: alertDate.format('Z')});
      prepopulateValue('#picker-expires', alertDateStr);
    } else {
      prepopulateValue('#text-expires', expiresMinutes);
    }
  }
}

function handleMessageTemplateChange(urlPrefix, adminUrl) {
  var templateId = $('#select-message-template').find(':selected').val();
  if (templateId == 'CreateNewMessageTemplate') {
    $('#reapply-message-template').hide();
    createPopupWindow(adminUrl, 800, 400);
    return;
  }
  if (!templateId || templateId == 'None') {
    $('.prepopulated').removeClass('prepopulated');
    $('#reapply-message-template').hide();
    return;
  }

  loadTemplate(urlPrefix, templateId, function(templateAlert) {
    messageTemplatePrepopulatedFieldIds = [];

    $('#custom-expiration-time-block').hide();
    $('#reapply-message-template').hide();
    $('.prepopulated').removeClass('prepopulated');
    prepopulateMenu('#select-message-template');

    var templateInfo = templateAlert.infos[0];
    // Load message fields into the current view.

    prepopulateMenu('#select-status', templateAlert.status);
    // Don't change message type for 'Update' and 'Cancel'.
    if (templateAlert.msgType != 'Update' &&
        templateAlert.msgType != 'Cancel') {
      prepopulateMenu('#select-msgType', templateAlert.msgType);
    }
    prepopulateMenu('#select-scope', templateAlert.scope);
    prepopulateValue('#textarea-note', templateAlert.note);
    // Only the first value is imported.
    if (templateInfo.categories && templateInfo.categories[0]) {
      prepopulateMenu('#select-categories', templateInfo.categories[0]);
    }
    // Only the first value is imported.
    if (templateInfo.responseTypes && templateInfo.responseTypes[0]) {
      prepopulateMenu('#select-responseTypes', templateInfo.responseTypes[0]);
    }
    prepopulateMenu('#select-urgency', templateInfo.urgency);
    prepopulateMenu('#select-severity', templateInfo.severity);
    prepopulateMenu('#select-certainty', templateInfo.certainty);
    if (templateAlert.expiresDurationMinutes) {
      setDefaultAlertExpiration(templateAlert.expiresDurationMinutes, true);
    } else {
      setDefaultAlertExpiration(config.defaultExpiresDurationMinutes, false);
    }
    prepopulateMenu('#select-language', templateInfo.language);

    if (!$('#select-language').val()) {
      $('#select-language').val(
          $('#ui-language').val()).selectmenu('refresh');
    }
    prepopulateValue('#text-senderName', templateInfo.senderName);
    prepopulateValue('#text-headline', templateInfo.headline);
    prepopulateValue('#text-event', templateInfo.event);
    prepopulateValue('#textarea-description', templateInfo.description);
    prepopulateValue('#textarea-instruction', templateInfo.instruction);
    prepopulateValue('#text-web', templateInfo.web);
    prepopulateValue('#text-contact', templateInfo.contact);
    prepopulateValue('#text-source', templateInfo.source);

    if (templateInfo.parameters) {
      // Clear and reload parameter set in widget.
      parameter_set.removeAll();
      $(templateInfo.parameters).each(function() {
        parameter_set.addAndPopulate(this.valueName, this.value);
      });
      $('.tuple_text_input').addClass('prepopulated');
    }

    // Handle params not visible in the UI
    alert.source = templateAlert.source;
    alert.restriction = templateAlert.restriction;
    alert.addresses = templateAlert.addresses;
    alert.code = templateAlert.code;
    alert.incidents = templateAlert.incidents;
    info.audience = templateInfo.audience;
    info.eventCodes = templateInfo.eventCodes;
  });
}

function createPopupWindow(url, width, height) {
  var left = screen.width / 2 - width / 2;
  var top = screen.height / 2 - height / 2;
  var dimenstions = 'height=' + height + ', width=' + width;
  var position = 'top=' + top + ', left=' + left;
  var params = dimenstions + ' ' + position;
  var newTab = window.open(url, '_blank', params);
  newTab.focus();
}

function loadTemplate(urlPrefix, templateId, onSuccess) {
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
}

function setLanguage(language) {
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
  alert.sent = moment().tz(timeZone).format();
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

  var expiresInMinutes = $('#select-expires-min').val();
  if (expiresInMinutes == 'Other') {
    $('#custom-expiration-time-block').show();
    expiresInMinutes = $('#text-expires').val();
  } else {
    $('#custom-expiration-time-block').hide();
  }
  var expiresString;
  if (!expiresInMinutes) {
    if ($('#picker-expires').val()) {
      pickedDate = new Date($('#picker-expires').datetimepicker('getDate'));
      expiresString = moment(pickedDate).tz(timeZone).format();
    } else {
      expiresInMinutes = 60;
    }
  }
  if (!expiresString) {
    var expiresInMillis = moment().unix() * 1000 + (expiresInMinutes * 60000);
    expiresString = moment(expiresInMillis).tz(timeZone).format();
  }
  info.expires = expiresString;

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
  if (geocodeSet) {
    area.geocodes = geocodeSet.getAll();
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
function sendAlert(element) {
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
            result_message +=
                gettext('Success: Valid CAP 1.2 MESSAGE SENT') + '<br>\n';
          } else {
            result_message += gettext('INVALID CAP 1.2') + '<br>\n';
            result_message += gettext('SERVER MESSAGE') + ': ' +
                escape_text(response_json.error) + '\n';
          }
          result_uuid = 'UUID: ' + escape_text(response_json['uuid']);
          $(element).hide();
          // Display the result.
          $('#response_status').html(result_message);
          $('#response_uuid').html(result_uuid);
          $('#text-uid').val('');  // Clear the uid field.
          $('#text-pwd').val('');  // Clear the password field.
          parameter_set.removeAll();  // Clear parameter set.
          templateAreaDescriptions = [];  // Clear area descriptions.
          // And after delay, loop back to the "Current Alerts" screen.
          setTimeout(function() { window.location.href = '/'; }, 3000);
        },
        error: function(data, textStatus, errorThrown) {
          setTimeout(function() {
            $('#sending-alert-indicator').addClass('hidden');
            $('#sending-alert-button').removeClass('hidden');
            $(element).click(function() {
              sendAlert.call(element);
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
              result_message += gettext('POSSIBLE ERROR IN TRANSMISSION.');
              result_message +=
                  ' ' + gettext('Check active alerts before resending.');
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
  if (geocodeSet) {
    geocodeSet.removeAll();
  }
  $(area.geocodes).each(function() {
    geocodeSet.addAndPopulate(this.valueName, this.value);
  });

  // clear and reload polygons in map
  if (drawingLayer) {
    drawingLayer.destroyFeatures();
  }
  $(area.polygons).each(function() {
    addCapPolygonToMap(String(this), area.areaDesc);
  });
  // clear and reload circles in map
  $(area.circles).each(function() {
    addCapCircleToMap(String(this), area.areaDesc);
  });
  // altitude is not imported
  // ceiling is not imported

  if (area.areaDesc) {
    templateAreaDescriptions = area.areaDesc.split(', ');
  }
}

function cap2htmlcells(name, value, opt_colspan) {
  return "<td class='html_label_cell'>" + name +
      '</td><td' + (opt_colspan ? " colspan='" + opt_colspan + "'" : '') + '>' +
      escape_text(value) + '</td>\n';
}

function cap2htmlrow(name, value) {
  return '<tr>' + cap2htmlcells(name, value, 5) + '</tr>\n';
}

function cap2htmlrow2(name1, value1, name2, value2) {
  return '<tr>' + cap2htmlcells(name1, value1) +
      cap2htmlcells(name2, value2, 3) + '</tr>\n';
}

// style CAP XML string as HTML
function cap2html(cap_xml) {
  var xml = $.parseXML(cap_xml);
  var alert = parseCAP2Alert(cap_xml);
  var info = alert.infos[0];
  var area = info.areas[0];
  // create HTML fragment (suitable to insert into a div)
  var html = "<table class='html_table'>\n" +
      cap2htmlrow('headline', info.headline) +
      cap2htmlrow('senderName', info.senderName) +
      cap2htmlrow2('sender', alert.sender, 'sent', alert.sent) +
      cap2htmlrow2('status', alert.status, 'msgType', alert.msgType) +
      '<tr>' + cap2htmlcells('urgency', info.urgency) +
          cap2htmlcells('severity', info.severity) +
          cap2htmlcells('certainty', info.certainty) + '</tr>\n' +
      cap2htmlrow('response', info.response) +
      cap2htmlrow('areaDesc', area.areaDesc) +
      cap2htmlrow('description', info.description) +
      cap2htmlrow('instruction', info.instruction) +
      cap2htmlrow('expires', info.expires) +
      cap2htmlrow('identifier', alert.identifier) +
      cap2htmlrow2('category', info.categories[0], 'event', info.event) +
      '</table>\n';
  return html;
}


function resetAllFields() {
  var blankAlert = new Alert();
  var blankInfo = blankAlert.addInfo();
  var blankArea = blankInfo.addArea();

  // Clear template selections.
  $('#select-message-template').val('None').selectmenu('refresh');
  clearAreaTemplates();

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
  var requiredFields = $(elementId + ' .required-field:visible');
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
        validGeocode = area.geocodes[0].valueName && area.geocodes[0].value;
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
