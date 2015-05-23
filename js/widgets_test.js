/**
 * @fileoverview widgets.js unit tests.
 */


/* Define unit test module for caplib tests. */
QUnit.module('widgets.js Unit Tests');

/** Test CapTupleSetWidget */
QUnit.test('Test CapTupleSetWidget', function(assert) {
  var changes = [];
  var previous = [];
  var onChange = function(tuple, prevTuple) {
    changes.push(tuple);
    previous.push(prevTuple);
  };

  var deletes = [];
  var onDelete = function(tuple) {
    deletes.push(tuple);
  };

  var area = new Area('Fake area');

  var tupleSet = new CapTupleSetWidget('Fake', area,
      $('#tuple-set-container'), onChange, onDelete);

  assert.equal(tupleSet.tuples.length, 0);
  tupleSet.addItem();
  assert.equal(tupleSet.tuples.length, 1);
  assert.equal(changes.length, 0);

  tupleSet.addAndPopulate('testValueName', 'testValue');
  assert.equal(tupleSet.tuples.length, 2);

  var tuple = tupleSet.tuples[tupleSet.tuples.length - 1];
  tuple.value.find('input').change();
  assert.deepEqual(tuple.getValue(),
      {valueName:'testValueName', value: 'testValue'});
  assert.deepEqual(changes[0],
      {valueName:'testValueName', value: 'testValue'});
  assert.deepEqual(previous[0], {valueName:'', value: ''});
  assert.equal(tupleSet.contains('testValueName', 'newTestValue'), false);
  assert.equal(tupleSet.contains('testValueName', 'testValue'), true);

  tuple.value.find('input').val('newTestValue').change();
  assert.deepEqual(tuple.getValue(),
      {valueName:'testValueName', value: 'newTestValue'});
  assert.deepEqual(changes[1],
      {valueName:'testValueName', value: 'newTestValue'});
  assert.deepEqual(previous[1],
      {valueName:'testValueName', value: 'testValue'});
  assert.equal(tupleSet.contains('testValueName', 'newTestValue'), true);
  assert.equal(tupleSet.contains('testValueName', 'testValue'), false);

  tupleSet.deleteItem({data: tuple});assert.equal(1, tupleSet.tuples.length);
  assert.equal(tupleSet.tuples.length, 1);
  assert.equal(deletes.length, 1);

  tuple = tupleSet.tuples[0];
  tuple.valueName.find('input').val('foo').change();
  tuple.value.find('input').val('bar').change();
  assert.deepEqual(tuple.getValue(), {valueName:'foo', value: 'bar'});
  tupleSet.deleteByValue('foo', 'bar');
  assert.equal(tupleSet.tuples.length, 0);
  assert.equal(deletes.length, 2);
});
