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
 * config.js -- configuration variables for CAPCreator
 * version 0.9.3 - 12 June 2014
 *
 * Copyright (c) 2013, Carnegie Mellon University
 * All rights reserved.
 *
 * See LICENSE.txt for license terms (Modified BSD)
 */


/**
 * Set these for local configuration.
 * @param {{centerLat: float, centerLon: float,
 *          centerZoom: int}} mapDefaultViewport
 * @param {string} defaultExpiresDurationMinutes Default expires
 *     duration in mintues. Can set to "Others" if input manually.
 * @param {boolean} useDatetimePicker Whether to use datetime picker for
 *     for alert expiration field when "Other" option is selected.
 * @param {string} timeZone The time zone used for this installation.
 * @constructor
 */
var CAPCreatorConfiguration = function(mapDefaultViewport,
    defaultExpiresDurationMinutes,
    useDatetimePicker,
    timeZone) {
  this.CAPCollectorBaseURL = "/";
  this.CAPCollectorSubmitURL = "/post/";
  /* Relative path to the "img" subdirectory of OpenLayers install. */
  this.OpenLayersImgPath = "client/img/";
  this.mapDefaultViewport = mapDefaultViewport;
  this.atomUrl = "/feed.xml";
  this.defaultExpiresDurationMinutes = defaultExpiresDurationMinutes;
  this.maxHeadlineLength = 140;
  this.versionID = "0.9.3";
  this.useDatetimePicker = useDatetimePicker;
  this.timeZone = timeZone;
}
