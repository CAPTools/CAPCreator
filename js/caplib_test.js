/**
 * @fileoverview caplib.js unit tests.
 */


/* Define unit test module for caplib tests. */
QUnit.module('caplib.js Unit Tests');

/** Test to/from XML */
QUnit.test('Test to/from XML', function(assert) {
  var expected = getFullAlertXml();
  var alert = parseCAP2Alert(expected);
  var actual = alert.getCAP();
  assert.equal(expected, actual);
});

function getFullAlertXml(value) {
  return '<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">\n' +
      '  <identifier>id2</identifier>\n' +
      '  <sender>test@example.com</sender>\n' +
      '  <sent>2015-04-21T19:19:08+00:00</sent>\n' +
      '  <status>Actual</status>\n' +
      '  <msgType>Update</msgType>\n' +
      '  <source>source</source>\n' +
      '  <scope>Public</scope>\n' +
      '  <restriction>restriction</restriction>\n' +
      '  <addresses>addresses</addresses>\n' +
      '  <code>code</code>\n' +
      '  <note>note</note>\n' +
      '  <references>test@example.com,id1,2015-04-21T19:15:00+00:00</references>\n' +
      '  <incidents>incidents</incidents>\n' +
      '  <info>\n' +
      '    <language>en-US</language>\n' +
      '    <category>Met</category>\n' +
      '    <category>Safety</category>\n' +
      '    <event>Event</event>\n' +
      '    <responseType>Evacuate</responseType>\n' +
      '    <urgency>Immediate</urgency>\n' +
      '    <severity>Extreme</severity>\n' +
      '    <certainty>Observed</certainty>\n' +
      '    <audience>audience</audience>\n' +
      '    <eventCode>\n' +
      '      <valueName>eventCodeName</valueName>\n' +
      '      <value>eventCodeValue</value>\n' +
      '    </eventCode>\n' +
      '    <eventCode>\n' +
      '      <valueName>eventCodeName2</valueName>\n' +
      '      <value>eventCodeValue2</value>\n' +
      '    </eventCode>\n' +
      '    <effective>2015-04-21T19:19:09+00:00</effective>\n' +
      '    <onset>2015-04-21T19:19:00+00:00</onset>\n' +
      '    <expires>2015-04-21T20:20:08+00:00</expires>\n' +
      '    <senderName>Sender Name</senderName>\n' +
      '    <headline>Headline</headline>\n' +
      '    <description>Description &amp; stuff</description>\n' +
      '    <instruction>Instruction</instruction>\n' +
      '    <web>http://www.example.com</web>\n' +
      '    <contact>contact</contact>\n' +
      '    <parameter>\n' +
      '      <valueName>paramName</valueName>\n' +
      '      <value>paramValue</value>\n' +
      '    </parameter>\n' +
      '    <parameter>\n' +
      '      <valueName>paramName2</valueName>\n' +
      '      <value>paramValue2</value>\n' +
      '    </parameter>\n' +
      '    <resource>\n' +
      '      <resourceDesc>resourceDesc</resourceDesc>\n' +
      '      <mimeType>text/html</mimeType>\n' +
      '      <size>1024</size>\n' +
      '      <uri>http://example.com/foo</uri>\n' +
      '      <digest>digest</digest>\n' +
      '    </resource>\n' +
      '    <resource>\n' +
      '      <resourceDesc>resourceDesc2</resourceDesc>\n' +
      '      <mimeType>text/html</mimeType>\n' +
      '      <uri>http://example.com/foo2</uri>\n' +
      '    </resource>\n' +
      '    <area>\n' +
      '      <areaDesc>areaDesc2</areaDesc>\n' +
      '      <polygon>1,1 2,1 2,2 1,2 1,1</polygon>\n' +
      '      <circle>0,0,1000</circle>\n' +
      '      <geocode>\n' +
      '        <valueName>geoName2</valueName>\n' +
      '        <value>geoValue2</value>\n' +
      '      </geocode>\n' +
      '      <geocode>\n' +
      '        <valueName>geoName3</valueName>\n' +
      '        <value>geoValue3</value>\n' +
      '      </geocode>\n' +
      '      <altitude>500</altitude>\n' +
      '      <ceiling>800</ceiling>\n' +
      '    </area>\n' +
      '  </info>\n' +
      '</alert>';
}
