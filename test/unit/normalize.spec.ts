import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {normalizeCssSelector} from '../../lib/index.js';
import {literalSchema, trueFalseSchema, zeroOneSchema} from '../fixtures/schemas.js';

describe('normalizeCssSelector', function () {
  describe('boolean coercion', function () {
    it('should coerce implicit booleans to 1 with zero-one format', function () {
      const parsed = normalizeCssSelector('[visible]', zeroOneSchema);
      assert.deepStrictEqual(parsed.rule.attributes[0], {
        name: 'visible',
        value: '1',
        implicit: true,
      });
    });

    it('should coerce explicit booleans to 0/1 with zero-one format', function () {
      const parsed = normalizeCssSelector('[visible="false"]', zeroOneSchema);
      assert.strictEqual(parsed.rule.attributes[0].value, '0');
    });

    it('should coerce booleans to true/false format', function () {
      const parsed = normalizeCssSelector('[clickable="false"]', trueFalseSchema);
      assert.strictEqual(parsed.rule.attributes[0].value, 'false');
    });

    it('should reject invalid boolean values for zero-one format', function () {
      assert.throws(() => normalizeCssSelector('[visible="maybe"]', zeroOneSchema), /must be true\/1 or false\/0/);
    });

    it('should keep raw boolean values with literal format', function () {
      const parsed = normalizeCssSelector('[visible="FALSE"]', literalSchema);
      assert.deepStrictEqual(parsed.rule.attributes[0], {
        name: 'visible',
        value: 'FALSE',
        implicit: false,
      });
    });

    it('should preserve explicit empty boolean values with literal format', function () {
      const parsed = normalizeCssSelector('[visible=""]', literalSchema);
      assert.deepStrictEqual(parsed.rule.attributes[0], {
        name: 'visible',
        value: '',
        implicit: false,
      });
    });

    it('should leave implicit booleans unset with literal format', function () {
      const parsed = normalizeCssSelector('[visible]', literalSchema);
      assert.deepStrictEqual(parsed.rule.attributes[0], {
        name: 'visible',
        implicit: true,
      });
    });
  });

  describe('attribute aliases', function () {
    it('should resolve attribute aliases to canonical names', function () {
      const parsed = normalizeCssSelector('[id="foo"]', zeroOneSchema);
      assert.strictEqual(parsed.rule.attributes[0].name, 'name');
    });

    it('should resolve pseudo-class aliases', function () {
      const parsed = normalizeCssSelector(':nth-child(3)', zeroOneSchema);
      assert.strictEqual(parsed.rule.pseudos[0].name, 'index');
      assert.strictEqual(parsed.rule.pseudos[0].value, '3');
    });
  });

  describe('string attributes', function () {
    it('should preserve string operators', function () {
      const parsed = normalizeCssSelector('[label^="Sign"]', zeroOneSchema);
      assert.deepStrictEqual(parsed.rule.attributes[0], {
        name: 'label',
        operator: '^=',
        value: 'Sign',
      });
    });

    it('should default empty string attribute values to empty string', function () {
      const parsed = normalizeCssSelector('[label]', zeroOneSchema);
      assert.strictEqual(parsed.rule.attributes[0].value, '');
    });
  });

  describe('validation', function () {
    it('should reject unknown attributes', function () {
      assert.throws(() => normalizeCssSelector('[unknown="x"]', zeroOneSchema), /not a valid attribute/);
    });

    it('should preserve raw id values without platform mapping', function () {
      const parsed = normalizeCssSelector('#my-id', zeroOneSchema);
      assert.strictEqual(parsed.rule.id, 'my-id');
      assert.deepStrictEqual(parsed.rule.attributes, []);
    });

    it('should preserve raw class tokens without platform mapping', function () {
      const parsed = normalizeCssSelector('.foo.bar', zeroOneSchema);
      assert.deepStrictEqual(parsed.rule.classes, ['foo', 'bar']);
    });
  });
});
