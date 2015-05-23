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
 * caplib.js -- Common Alerting Protocol 1.2 helper library
 * version 1.1.3 - 20 April 2015
 *
 * Copyright (c) 2013, Carnegie Mellon University
 * All rights reserved.
 *
 * See LICENSE.txt for license terms (Modified BSD)
 *
 * API (see trivial usage example at end of file):
 *  new Alert() - returns an uninitialized Alert object
 *  parseCAP2Alert() - turn a CAP XML string into an Alert object
 *  Alert.getJSON() - returns the Alert (including included Infos, Resources and Elements) as a JSON string
 *  Alert.getCAP() - returns the Alert as CAP 1.2 XML
 *  Alert.addInfo() - adds an Info object to the Alert.infos array and returns the new Info object
 *  Info.addCategory(string) - adds a category value string to the Info.categories array (values are constrained in spec)
 *  Info.addResponseType(string) - adds a responseType value string to the Info.responseTypes array (values are constrained in spec)
 *  Info.addEventCode(string, string) - adds an eventCode valueName/value pair to the Info.eventCodes array (values may be constrained in 'valueName' namespace)
 *  Info.addParameter(string, string) - adds a parameter valueName/value pair to the Info.parameters array (values may be constrained in 'valueName' namespace)
 *  Alert.addArea(string) - adds an Area object to the Info.areas array, initializes the areaDesc field from argument and returns the new Area object
 *  Alert.addResource(string) - adds a Resource object to the Info.resources array, initializes the resourceDesk field from argument and returns the new Resource object
 *  All other properties are populated by direct assignment.  All reads are performed by direct reference.
 */

function xmlEscape(str) {
  if (str.indexOf('&') != -1) {
    str = str.replace(/&/g, '&amp;');
  }
  if (str.indexOf('<') != -1) {
    str = str.replace(/</g, '&lt;');
  }
  if (str.indexOf('>') != -1) {
    str = str.replace(/>/g, '&gt;');
  }
  return str;
}

function xmlUnescape(str) {
  if (str.indexOf('&lt;') != -1) {
    str = str.replace(/&lt;/g, '<');
  }
  if (str.indexOf('&gt;') != -1) {
    str = str.replace(/&gt;/g, '>');
  }
  if (str.indexOf('&amp;') != -1) {
    str = str.replace(/&amp;/g, '&');
  }
  return str;
}

//////////////////////////////////////////////////
// ALERT Object
var Alert = function() {
  this.identifier = '';  // REQUIRED
  this.sender = '';  // REQUIRED
  this.sent = '';  // REQUIRED
  this.status = 'Actual';  // REQUIRED: values Actual, Exercise, System, Test, Draft
  this.msgType = 'Alert';  // REQUIRED: values Alert, Update, Cancel, Ack, Error
  this.scope = 'Public';  // REQUIRED: values Public, Restricted, Private
  this.source = '';
  this.restriction;
  this.addresses;
  this.code;
  this.note = '';
  this.references = '';
  this.incidents;
  this.infos = [];
};

Alert.prototype.addInfo = function() {
  newInfo = new Info();
  this.infos.push(newInfo);
  return newInfo;
};

Alert.prototype.getJSON = function() {
  return JSON.stringify(this, undefined, 2);
};

Alert.prototype._xmlTag = function(tagName, value, indent) {
  return indent +
      '<' + tagName + '>' +
      xmlEscape(xmlUnescape(value)) +
      '</' + tagName + '>\n';
}

Alert.prototype._xmlNameValueTag = function(tagName, name, value, indent) {
  var indent2 = indent + '  ';
  return indent + '<' + tagName + '>\n' +
    this._xmlTag('valueName', name, indent2) +
    this._xmlTag('value', value, indent2) +
    indent + '</' + tagName + '>\n'
}

Alert.prototype.getCAP = function() {
  var xml = '<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">\n';
  var indent = '  ';
  xml += this._xmlTag('identifier', this.identifier, indent);
  xml += this._xmlTag('sender', this.sender, indent);
  xml += this._xmlTag('sent', this.sent, indent);
  xml += this._xmlTag('status', this.status, indent);
  xml += this._xmlTag('msgType', this.msgType, indent);
  if (this.source && this.source != '') {
    xml += this._xmlTag('source', this.source, indent);
  }
  xml += this._xmlTag('scope', this.scope, indent);
  if (this.restriction && this.restriction != '') {
    xml += this._xmlTag('restriction', this.restriction, indent);
  }
  if (this.addresses && this.addresses != '') {
    xml += this._xmlTag('addresses', this.addresses, indent);
  }
  if (this.code && this.code != '') {
    xml += this._xmlTag('code', this.code, indent);
  }
  if (this.note && this.note != '') {
    xml += this._xmlTag('note', this.note, indent);
  }
  if (this.references && this.references != '') {
    xml += this._xmlTag('references', this.references, indent);
  }
  if (this.incidents && this.incidents != '') {
    xml += this._xmlTag('incidents', this.incidents, indent);
  }
  if (this.infos && this.infos.length > 0) {
    for (var i = 0; i < this.infos.length; i++) {
      var info = this.infos[i];
      xml += indent + '<info>\n';
      indent = '    ';
      xml += this._xmlTag('language', info.language, indent);
      if (info.categories.length) {
        for (var i = 0; i < info.categories.length; i++) {
          xml += this._xmlTag('category', info.categories[i], indent);
        }
      }
      xml += this._xmlTag('event', info.event, indent);
      if (info.responseTypes && info.responseTypes.length) {
        for (var i = 0; i < info.responseTypes.length; i++) {
          xml += this._xmlTag('responseType', info.responseTypes[i], indent);
        }
      }
      xml += this._xmlTag('urgency', info.urgency, indent);
      xml += this._xmlTag('severity', info.severity, indent);
      xml += this._xmlTag('certainty', info.certainty, indent);
      if (info.audience && info.audience != '') {
        xml += this._xmlTag('audience', info.audience, indent);
      }

      if (info.eventCodes && info.eventCodes.length) {
        for (var i = 0; i < info.eventCodes.length; i++) {
          var ec = info.eventCodes[i];
          xml += this._xmlNameValueTag(
              'eventCode', ec.valueName, ec.value, indent);
        }
      }
      if (info.effective && info.effective != '') {
        xml += this._xmlTag('effective', info.effective, indent);
      }
      if (info.onset && info.onset != '') {
        xml += this._xmlTag('onset', info.onset, indent);
      }
      if (info.expires && info.expires != '') {
        xml += this._xmlTag('expires', info.expires, indent);
      }
      if (info.senderName && info.senderName != '') {
        xml += this._xmlTag('senderName', info.senderName, indent);
      }
      if (info.headline && info.headline != '') {
        xml += this._xmlTag('headline', info.headline, indent);
      }
      if (info.description && info.description != '') {
        xml += this._xmlTag('description', info.description, indent);
      }
      if (info.instruction && info.instruction != '') {
        xml += this._xmlTag('instruction', info.instruction, indent);
      }
      if (info.web && info.web != '') {
        xml += this._xmlTag('web', info.web, indent);
      }
      if (info.contact && info.contact != '') {
        xml += this._xmlTag('contact', info.contact, indent);
      }
      if (info.parameters && info.parameters.length) {
        for (var i = 0; i < info.parameters.length; i++) {
          var param = info.parameters[i];
          xml += this._xmlNameValueTag(
              'parameter', param.valueName, param.value, indent);
        }
      }
      if (info.resources && info.resources.length > 0) {
        for (var i = 0; i < info.resources.length; i++) {
          var resource = info.resources[i];
          xml += indent + '<resource>\n';
          indent = '      ';
          xml += this._xmlTag('resourceDesc', resource.resourceDesc, indent);
          if (resource.mimeType && resource.mimeType != '') {
            xml += this._xmlTag('mimeType', resource.mimeType, indent);
          }
          if (resource.size && resource.size != '') {
            xml += this._xmlTag('size', resource.size, indent);
          }
          if (resource.uri && resource.uri != '') {
            xml += this._xmlTag('uri', resource.uri, indent);
          }
          if (resource.digest && resource.digest != '') {
            xml += this._xmlTag('digest', resource.digest, indent);
          }
          indent = '    ';
          xml += indent + '</resource>\n';
        }
      }
      if (info.areas && info.areas.length > 0) {
        for (var i = 0; i < info.areas.length; i++) {
          var area = info.areas[i];
          xml += indent + '<area>\n';
          indent = '      ';
          if (area.areaDesc == '') {
            area.areaDesc = 'Unspecified Area';
          }
          xml += this._xmlTag('areaDesc', area.areaDesc, indent);
          if (area.polygons && area.polygons.length) {
            for (var i = 0; i < area.polygons.length; i++) {
              xml += this._xmlTag('polygon', area.polygons[i], indent);
            }
          }
          if (area.circles && area.circles.length) {
            for (var i = 0; i < area.circles.length; i++) {
              xml += this._xmlTag('circle', area.circles[i], indent);
            }
          }
          if (area.geocodes && area.geocodes.length) {
            for (var i = 0; i < area.geocodes.length; i++) {
              var gc = area.geocodes[i];
              xml += this._xmlNameValueTag(
                  'geocode', gc.valueName, gc.value, indent);
            }
          }
          if (area.altitude && area.altitude != '') {
            xml += this._xmlTag('altitude', area.altitude, indent);
          }
          if (area.ceiling && area.ceiling != '') {
            xml += this._xmlTag('ceiling', area.ceiling, indent);
          }
          indent = '    ';
          xml += indent + '</area>\n';
        }
      }
      indent = '  ';
      xml += indent + '</info>\n';
    }
  }
  xml += '</alert>';
  return xml;
};


/////////////////////////////////////////////
// INFO Object
var Info = function() {
  this.language = '';
  // Values: Geo, Met, Safety, Security, Rescue, Fire, Health, Env, Transport,
  // Infra, CBRNE, Other.
  this.categories = [];  // REQUIRED
  this.event = '';  // REQUIRED
  this.responseTypes = [];
  // Values: Immediate, Expected, Future, Past, Unknown.
  this.urgency = '';  // REQUIRED
  // Values: Extreme, Severe, Moderate, Minor, Unknown.
  this.severity = '';  // REQUIRED
  // Values: Observed, Likely, Possible, Unlikely, Unknown.
  this.certainty = '';  // REQUIRED
  this.audience = '';
  this.eventCodes = [];
  this.effective = '';
  this.onset = '';
  this.expires = '';
  this.senderName = '';
  this.headline = '';
  this.description = '';
  this.instruction = '';
  this.web = '';
  this.contact = '';
  this.resources = [];
  this.parameters = [];
  this.areas = [];
};

// Geo, Met, Safety, Security, Rescue, Fire, Health, Env, Transport, Infra,
// CBRNE, Other.
Info.prototype.addCategory = function(category) {
  this.categories.push(category);
};

// Shelter, Evacuate, Prepare,  Execute, Avoid, Monitor, Assess, AllClear
Info.prototype.addResponseType = function(responseType) {
  this.responseTypes.push(responseType);
};
Info.prototype.addEventCode = function(valueName, value) {
  var eventCode = new EventCode(valueName, value);
  this.eventCodes.push(eventCode);
};

Info.prototype.addParameter = function(valueName, value) {
  var parameter = new Parameter(valueName, value);
  this.parameters.push(parameter);
};
Info.prototype.addArea = function(areaDesc) {
  var area = new Area(areaDesc);
  this.areas.push(area);
  return area;
};
Info.prototype.addResource = function(resourceDesc) {
  var resource = new Resource(resourceDesc);
  this.resources.push(resource);
  return resource;
};

var EventCode = function(valueName, value) {
  this.valueName = valueName;
  this.value = value;
};

var Parameter = function(valueName, value) {
  this.valueName = valueName;
  this.value = value;
};


//RESOURCE Object
var Resource = function(resourceDesc) {
  this.resourceDesc = resourceDesc;  // REQUIRED
  this.mimeType;
  this.size;
  this.uri;
  this.digest;
  // note: derefURI is not implemented in this tool
};
Resource.prototype.getJSON = function() {
  return JSON.stringify(this);
};


// AREA Object
var Area = function() {
  this.areaDesc = '';  // REQUIRED
  this.polygons = [];
  this.circles = [];
  this.geocodes = [];
  this.altitude = '';
  this.ceiling = '';
};

Area.prototype.addPolygon = function(polygon) {
  this.polygons.push(polygon);
};

Area.prototype.addCircle = function(circle) {
  this.circles.push(circle);
};

Area.prototype.addGeocode = function(valueName, value) {
  var geocode = new Geocode(valueName, value);
  this.geocodes.push(geocode);
};

var Geocode = function(valueName, value) {
  this.valueName = valueName;
  this.value = value;
};

// UTILITIES

//parse XML string into an Alert object
function parseCAP2Alert(cap_xml) {
  var xml = typeof cap_xml === 'object' ? cap_xml : $.parseXML(cap_xml);
  // populate new alert with values from XML
  var alert = new Alert();
  alert.identifier = $(xml).find('identifier').text();
  alert.sender = $(xml).find('sender').text();
  alert.sent = $(xml).find('sent').text();
  alert.status = $(xml).find('status').text();
  alert.msgType = $(xml).find('msgType').text();
  alert.source = $(xml).find('source').text();
  alert.scope = $(xml).find('scope').text();
  alert.restriction = $(xml).find('restriction').text();
  alert.addresses = $(xml).find('addresses').text();
  alert.code = $(xml).find('code').text();
  alert.note = $(xml).find('note').text();
  alert.references = $(xml).find('references').text();
  alert.incidents = $(xml).find('incidents').text();
  var info = alert.addInfo();  // only one Info is supported in current version!
  info.language = $(xml).find('language').text();
  $(xml).find('category').each(function() {
    info.addCategory($(this).text());
  });
  info.event = $(xml).find('event').text();
  $(xml).find('responseType').each(function() {
    info.addResponseType($(this).text());
  });
  info.urgency = $(xml).find('urgency').text();
  info.severity = $(xml).find('severity').text();
  info.certainty = $(xml).find('certainty').text();
  info.audience = $(xml).find('audience').text();
  $(xml).find('eventCode').each(function() {
    info.addEventCode(
        $(this).find('valueName').text(), $(this).find('value').text());
  });
  info.effective = $(xml).find('effective').text();
  info.onset = $(xml).find('onset').text();
  info.expires = $(xml).find('expires').text();
  info.senderName = $(xml).find('senderName').text();
  info.headline = $(xml).find('headline').text();
  info.description = $(xml).find('description').text();
  info.instruction = $(xml).find('instruction').text();
  info.web = $(xml).find('web').text();
  info.contact = $(xml).find('contact').text();
  $(xml).find('resource').each(function() {
    var resourceDesc = $(this).find('resourceDesc').text();
    var resource = info.addResource(resourceDesc);
    resource.mimeType = $(this).find('mimeType').text();
    resource.size = $(this).find('size').text();
    resource.uri = $(this).find('uri').text();
    resource.digest = $(this).find('digest').text();
  });
  $(xml).find('parameter').each(function() {
    var parameter = info.addParameter(
        $(this).find('valueName').text(), $(this).find('value').text());
  });
  var area = info.addArea();  // Only one Area is supported in current version!
  area.areaDesc = $(xml).find('areaDesc').text();
  $(xml).find('polygon').each(function() {
    area.addPolygon($(this).text());
  });
  $(xml).find('circle').each(function() {
    area.addCircle($(this).text());
  });
  $(xml).find('geocode').each(function() {
    var geocode = area.addGeocode(
        $(this).find('valueName').text(), $(this).find('value').text());
  });
  area.altitude = $(xml).find('altitude').text();
  area.ceiling = $(xml).find('ceiling').text();
  return alert;
}


//////////////////////////////////////////////////////
// trivial example code (uncomment to test from command line)
/*
newAlert = new Alert();
info = newAlert.addInfo();
info.addParameter("parameter_type", "silly");
// testing unicode, that's Thai for Bangkok
area = info.addArea("กรุงเทพมหานคร");
area.addCircle("100.54386,13.81390 30.99990");
alert(newAlert.getJSON());
*/
