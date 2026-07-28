import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {InvalidSelectorError, normalizeCssSelector} from '../../lib/index.js';
import {zeroOneSchema} from '../fixtures/schemas.js';

describe('parser adapter', function () {
  it('should parse tags, ids, classes, and attributes', function () {
    const parsed = normalizeCssSelector('window#foo.bar[visible="true"]', zeroOneSchema);
    assert.strictEqual(parsed.rule.tag, 'window');
    assert.strictEqual(parsed.rule.id, 'foo');
    assert.deepStrictEqual(parsed.rule.classes, ['bar']);
    assert.deepStrictEqual(parsed.rule.attributes, [{name: 'visible', value: '1', implicit: false}]);
  });

  it('should parse wildcard tags', function () {
    const parsed = normalizeCssSelector('*', zeroOneSchema);
    assert.strictEqual(parsed.rule.tag, '*');
  });

  it('should parse nested child combinators', function () {
    const parsed = normalizeCssSelector('div > button', zeroOneSchema);
    assert.strictEqual(parsed.rule.tag, 'div');
    assert.strictEqual(parsed.rule.nested?.tag, 'button');
    assert.strictEqual(parsed.rule.nested?.combinator, 'child');
  });

  it('should parse nested descendant combinators', function () {
    const parsed = normalizeCssSelector('div button', zeroOneSchema);
    assert.strictEqual(parsed.rule.tag, 'div');
    assert.strictEqual(parsed.rule.nested?.tag, 'button');
    assert.strictEqual(parsed.rule.nested?.combinator, 'descendant');
  });

  it('should parse nth-child pseudo-classes as index', function () {
    const parsed = normalizeCssSelector('button:nth-child(2)', zeroOneSchema);
    assert.deepStrictEqual(parsed.rule.pseudos, [{name: 'index', value: '2'}]);
  });

  it('should throw InvalidSelectorError for invalid CSS syntax', function () {
    assert.throws(() => normalizeCssSelector('[[[', zeroOneSchema), InvalidSelectorError);
  });

  it('should reject unsupported combinators', function () {
    assert.throws(() => normalizeCssSelector('div + span', zeroOneSchema), /not a supported combinator/);
  });

  it('should reject pseudo-elements', function () {
    assert.throws(() => normalizeCssSelector('button::before', zeroOneSchema), /Pseudo-elements are not supported/);
  });

  it('should use only the first comma-separated rule', function () {
    const parsed = normalizeCssSelector('button, window', zeroOneSchema);
    assert.strictEqual(parsed.rule.tag, 'button');
  });
});
