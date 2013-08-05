CAPCreator&trade;
==========

<b>CAPCreator&trade;</b> is a simple tool for authoring alerts and other messages using the 
<a href="http://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html" target="_blank">Common Alerting Protocol (v1.2)</a>. 
A few notable limits on the current version:
<ul>
  <li>Only one language can be used in a single message (however multiple messages can be authored to address multilingual
alerting requirements);
  <li>Only one target area can be specified for an individual alert message (but it may include multiple polygons and/or 
circles); and,
  <li>All alerts are assumed to be effective immediately; the "effective" and "onset" elements are not supported.
</ul>
<p><b>CAPCreator</b> is part of the <b>CAPTools&trade;</b> collection and is designed to integrate with the 
<b>CAPCollector&trade;</b> server for XML serialization, sender authentication, digital signature, alert forwarding 
and local alert aggregation, and with the <b>CAPConsumer&trade;</b> framework for CAP message injestion and display.</p>
 <b>CAPTools</b>, <b>CAPCreator</b>, <b>CAPCollector</b> and <b>CAPConsumer</b> are trademarks of Carnegie Mellon 
 University.
