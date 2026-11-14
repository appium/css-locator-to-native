import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {InvalidSelectorError, UnsupportedSelectorError, normalizeCssSelector} from '../../lib/index.js';
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
    const upperParsed = normalizeCssSelector('button:NTH-CHILD(2)', zeroOneSchema);
    assert.deepStrictEqual(upperParsed.rule.pseudos, [{name: 'index', value: '2'}]);
  });

  it('should reject non-constant nth formulas regardless of pseudo-class casing', function () {
    for (const selector of [
      'button:nth-child(2n+1)',
      'button:nth-child(odd)',
      'button:nth-last-child(2n+1)',
      'button:nth-of-type(-n+3)',
      'button:nth-last-of-type(n)',
      'button:nth-col(2n)',
      'button:nth-last-col(even)',
      'button:NTH-CHILD(2n+1)',
      ':Nth-Child(odd)',
      'button:NTH-OF-TYPE(-n+3)',
    ]) {
      assert.throws(
        () => normalizeCssSelector(selector, zeroOneSchema),
        (err) => err instanceof UnsupportedSelectorError && /Unsupported nth formula/.test(err.message),
      );
    }
  });

  it('should reject FormulaOfSelector pseudo-class arguments as unsupported', function () {
    for (const selector of ['a:nth-child(2 of b)', 'a:nth-last-child(2n+1 of b)', 'a:NTH-CHILD(2 of b)']) {
      assert.throws(
        () => normalizeCssSelector(selector, zeroOneSchema),
        (err) => err instanceof UnsupportedSelectorError && /Unsupported pseudo-class argument/.test(err.message),
      );
    }
  });

  it('should throw InvalidSelectorError for invalid nth formula syntax', function () {
    for (const selector of [
      'button:nth-child(foo)',
      'button:nth-child("2")',
      'button:nth-child()',
      'button:NTH-CHILD(foo)',
      'button:NTH-CHILD',
    ]) {
      assert.throws(() => normalizeCssSelector(selector, zeroOneSchema), InvalidSelectorError);
    }
  });

  it('should reject selector-valued pseudo-class arguments', function () {
    for (const selector of ['button:has(span)', 'button:HAS(span)']) {
      assert.throws(
        () => normalizeCssSelector(selector, zeroOneSchema),
        (err) => err instanceof UnsupportedSelectorError && /Unsupported pseudo-class argument/.test(err.message),
      );
    }
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
