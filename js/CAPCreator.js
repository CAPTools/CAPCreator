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
 * OpenLayers, jQuery, jQuery Mobile and Moment.js, as well as local libraries
 * config.js, caplib.js cap_map.js and widgets.js must be loaded in the HTML first
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

var area_templates;
var message_templates;


// When initializing pages, apply data-set widgets
$(document).on('pageinit', '#info', function() {
  parameter_set = new CapTupleSetWidget(
    'Parameter (optional)', area, $('#parameter_div'));
  $('.tm').html('CAPCreator&trade; ' + versionID);
  $('#textarea-note').val('Using CAPCreator' + versionID);
  // On initialization pick up default language.
  $('#select-language').val($('#ui-language').val()).selectmenu('refresh');
  info.language = $('#ui-language').val();
});
$(document).on('pageinit', '#area', function() {
  geocode_set = new CapTupleSetWidget(
    'Geocode (optional)', area, $('#geocode_div'));
});


$(document).on('pageinit', '#alert', function() {
  // Hide custom expiration time input on page init.
  $('#custom-expiration-time-block').hide();
});


// Any time we enter the Current Alerts page, get ATOM feed and update display
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
        var updated = moment($this.find('updated').text()).format(
            'YYYY-MM-DD <b>HH:mm</b> (Z)');
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
        alert2view(alert);
        $.mobile.navigate('#alert');
      });
      $('#update_button').click(function(e) {
        $('#select-message-template').val('None').selectmenu('refresh');
        $('#select-area-template').val('None').selectmenu('refresh');
        alert.msgType = 'Update';
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


function handleAreaTemplateChange(urlPrefix, adminUrl) {
  handleTemplateChange(urlPrefix, '#select-area-template',
                       'CreateNewAreaTemplate', adminUrl, function(alert) {
    var info = alert.infos[0];
    var area = info.areas[0];
    $('#textarea-areaDesc').text(area.areaDesc);
    geocode_set.removeAll();
    $(area.geocodes).each(function() {
      geocode_set.addAndPopulate(this.valueName, this.value);
    });
    drawingLayer.destroyFeatures();
    $(area.polygons).each(function() {
      addCapPolygonToMap(String(this));
    });
    $(area.circles).each(function() {
      addCapCircleToMap(String(this));
    });
  });
}


function handleMessageTemplateChange(urlPrefix, adminUrl) {
  handleTemplateChange(urlPrefix, '#select-message-template',
                       'CreateNewMessageTemplate', adminUrl, function(alert) {
    var info = alert.infos[0];
    // load message fields into the current view
    if ((alert.msgType != 'Update') && (alert.msgType != 'Cancel')) {
      $('#select-status').val(alert.status).selectmenu('refresh');
    }
    $('#select-msgType').val(alert.msgType).selectmenu('refresh');
    $('#select-scope').val(alert.scope).selectmenu('refresh');

    // only the first value is imported
    $('#select-categories').val(info.categories[0]).selectmenu('refresh');
    // only the first value is imported
    $('#select-responseTypes').val(
        info.responseTypes[0]).selectmenu('refresh');
    $('#select-urgency').val(info.urgency).selectmenu('refresh');
    $('#select-severity').val(info.severity).selectmenu('refresh');
    $('#select-certainty').val(info.certainty).selectmenu('refresh');
    $('#select-language').val(info.language).selectmenu('refresh');

    if (!$('#select-language').val()) {
      $('#select-language').val(
          $('#ui-language').val()).selectmenu('refresh');
    }

    $('#text-senderName').val(info.senderName);
    $('#text-headline').val(info.headline);
    $('#textarea-description').text(info.description);
    $('#textarea-instruction').text(info.instruction);
    $('#text-web').val(info.web);
    $('#text-contact').val(info.contact);
    $('#text-source').val(info.source);
    $('#textarea-note').text(alert.note);
    // clear and reload parameter set in widget
    parameter_set.removeAll();
    $(info.parameters).each(function() {
      parameter_set.addAndPopulate(this.valueName, this.value);
    });
  });
}

function handleTemplateChange(urlPrefix, selectId,
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
    var newTab = createPopupWindow(createNewTemplateUrl, 800, 400);
  } else if (templateId && templateId != 'None') {
    var link = urlPrefix + '?template_id=' + templateId;
    $.ajax({
      url: link,
      dataType: 'xml',
      cache: false,
      success: function(data, status, jqXHR) {
        var xml = jqXHR.responseText;
        var alert = parseCAP2Alert(xml);
        onSuccess(alert);
      }
    });
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

// update model with values from screen
function view2model() {
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
  info.event = escape_text($('#text-headline').val());
  info.categories = [];
  info.addCategory($('#select-categories').val());
  info.responseTypes = [];
  info.addResponseType($('#select-responseTypes').val());
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
}


// submit alert JSON to server
function sendAlert(csrfToken) {
  var result_message = '';
  var uid = $('#text-uid').val();
  var password = $('#text-pwd').val();
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

          var isAuthenticated = response_json['authenticated'];
          if (! isAuthenticated) {
            result_message = result_message +
                             'FAILED: Wrong User ID or Password<br>\n';
            $('#response_status').html(result_message);
            return;
          }
          var isValid = response_json['valid'];
          if (isValid) {
            result_message = result_message +
                             'Success: Valid CAP 1.2 MESSAGE SENT<br>\n';
          } else {
            result_message = result_message + 'INVALID CAP 1.2<br>\n';
            result_message = result_message + 'SERVER MESSAGE: ' +
                             response_json.error + '\n';
          }
          result_uuid = 'UUID: ' + response_json['uuid'];
          // display the result
          $('#response_status').html(result_message);
          $('#response_uuid').html(result_uuid);
          $('#text-uid').val(''); // clear the uid field
          $('#text-pwd').val(''); // clear the password field
          // and after delay, loop back to the Current Alerts screen
          setTimeout(function() { $.mobile.navigate('#current'); }, 3000);
        },
        error: function(data, textStatus, errorThrown) {
          result_message = result_message +
                           'POSSIBLE ERROR IN TRANSMISSION<br>\n';
          result_message = result_message +
                           'Check active alerts before resending.<br>\n';
          console.log('Error: ' + data.status + ' ' + data.responseText);
          result_message += data.responseText;
          // display the results
          $('#response_status').html(result_message);
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
  $('#select-language').val(info.language);
  $('#text-senderName').val(info.senderName);
  $('#text-headline').val(info.headline);
  $('#textarea-description').text(info.description);
  $('#textarea-instruction').text(info.instruction);
  $('#text-contact').val(info.contact);
  $('#text-source').val(info.source);
  $('#textarea-note').text(area.note);

  // clear and reload parameter set in widget
  parameter_set.removeAll();
  $(info.parameters).each(function() {
    parameter_set.addAndPopulate(this.valueName, this.value);
  });

  // resources currently not implemented

  $('#textarea-areaDesc').text(area.areaDesc);

  // clear and reload geocode set in widget
  geocode_set.removeAll();
  $(area.geocodes).each(function() {
    geocode_set.addAndPopulate(this.valueName, this.value);
  });

  // clear and reload polygons in map
  drawingLayer.destroyFeatures();
  $(area.polygons).each(function() {
    addCapPolygonToMap(String(this));
  });
  // clear and reload circles in map
  $(area.circles).each(function() {
    addCapCircleToMap(String(this));
  });
  // altitude is not imported
  // ceiling is not imported
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
