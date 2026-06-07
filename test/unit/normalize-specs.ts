import {expect} from 'chai';
import {UnsupportedSelectorError, normalizeCssSelector} from '../../lib/index.js';
import {trueFalseSchema, zeroOneSchema} from '../fixtures/schemas.js';

describe('normalizeCssSelector', function () {
  describe('boolean coercion', function () {
    it('should coerce implicit booleans to 1 with zero-one format', function () {
      const parsed = normalizeCssSelector('[visible]', zeroOneSchema);
      expect(parsed.rule.attributes[0]).to.deep.equal({
        name: 'visible',
        value: '1',
        implicit: true,
      });
    });

    it('should coerce explicit booleans to 0/1 with zero-one format', function () {
      const parsed = normalizeCssSelector('[visible="false"]', zeroOneSchema);
      expect(parsed.rule.attributes[0].value).to.equal('0');
    });

    it('should coerce booleans to true/false format', function () {
      const parsed = normalizeCssSelector('[clickable="false"]', trueFalseSchema);
      expect(parsed.rule.attributes[0].value).to.equal('false');
    });

    it('should reject invalid boolean values for zero-one format', function () {
      expect(() => normalizeCssSelector('[visible="maybe"]', zeroOneSchema)).to.throw(
        UnsupportedSelectorError,
        /must be true\/1 or false\/0/,
      );
    });
  });

  describe('attribute aliases', function () {
    it('should resolve attribute aliases to canonical names', function () {
      const parsed = normalizeCssSelector('[id="foo"]', zeroOneSchema);
      expect(parsed.rule.attributes[0].name).to.equal('name');
    });

    it('should resolve pseudo-class aliases', function () {
      const parsed = normalizeCssSelector(':nth-child(3)', zeroOneSchema);
      expect(parsed.rule.pseudos[0].name).to.equal('index');
      expect(parsed.rule.pseudos[0].value).to.equal('3');
    });
  });

  describe('string attributes', function () {
    it('should preserve string operators', function () {
      const parsed = normalizeCssSelector('[label^="Sign"]', zeroOneSchema);
      expect(parsed.rule.attributes[0]).to.deep.include({
        name: 'label',
        operator: '^=',
        value: 'Sign',
      });
    });

    it('should default empty string attribute values to empty string', function () {
      const parsed = normalizeCssSelector('[label]', zeroOneSchema);
      expect(parsed.rule.attributes[0].value).to.equal('');
    });
  });

  describe('validation', function () {
    it('should reject unknown attributes', function () {
      expect(() => normalizeCssSelector('[unknown="x"]', zeroOneSchema)).to.throw(
        UnsupportedSelectorError,
        /not a valid attribute/,
      );
    });

    it('should preserve raw id values without platform mapping', function () {
      const parsed = normalizeCssSelector('#my-id', zeroOneSchema);
      expect(parsed.rule.id).to.equal('my-id');
      expect(parsed.rule.attributes).to.deep.equal([]);
    });

    it('should preserve raw class tokens without platform mapping', function () {
      const parsed = normalizeCssSelector('.foo.bar', zeroOneSchema);
      expect(parsed.rule.classes).to.deep.equal(['foo', 'bar']);
    });
  });
});
