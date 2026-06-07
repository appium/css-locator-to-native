import {expect} from 'chai';
import {
  InvalidSelectorError,
  UnsupportedSelectorError,
  normalizeCssSelector,
} from '../../lib/index.js';
import {zeroOneSchema} from '../fixtures/schemas.js';

describe('parser adapter', function () {
  it('should parse tags, ids, classes, and attributes', function () {
    const parsed = normalizeCssSelector('window#foo.bar[visible="true"]', zeroOneSchema);
    expect(parsed.rule.tag).to.equal('window');
    expect(parsed.rule.id).to.equal('foo');
    expect(parsed.rule.classes).to.deep.equal(['bar']);
    expect(parsed.rule.attributes).to.deep.equal([{name: 'visible', value: '1', implicit: false}]);
  });

  it('should parse wildcard tags', function () {
    const parsed = normalizeCssSelector('*', zeroOneSchema);
    expect(parsed.rule.tag).to.equal('*');
  });

  it('should parse nested child combinators', function () {
    const parsed = normalizeCssSelector('div > button', zeroOneSchema);
    expect(parsed.rule.tag).to.equal('div');
    expect(parsed.rule.nested?.tag).to.equal('button');
    expect(parsed.rule.nested?.combinator).to.equal('child');
  });

  it('should parse nested descendant combinators', function () {
    const parsed = normalizeCssSelector('div button', zeroOneSchema);
    expect(parsed.rule.tag).to.equal('div');
    expect(parsed.rule.nested?.tag).to.equal('button');
    expect(parsed.rule.nested?.combinator).to.equal('descendant');
  });

  it('should parse nth-child pseudo-classes as index', function () {
    const parsed = normalizeCssSelector('button:nth-child(2)', zeroOneSchema);
    expect(parsed.rule.pseudos).to.deep.equal([{name: 'index', value: '2'}]);
  });

  it('should throw InvalidSelectorError for invalid CSS syntax', function () {
    expect(() => normalizeCssSelector('[[[', zeroOneSchema)).to.throw(InvalidSelectorError);
  });

  it('should reject unsupported combinators', function () {
    expect(() => normalizeCssSelector('div + span', zeroOneSchema)).to.throw(
      UnsupportedSelectorError,
      /not a supported combinator/,
    );
  });

  it('should reject pseudo-elements', function () {
    expect(() => normalizeCssSelector('button::before', zeroOneSchema)).to.throw(
      UnsupportedSelectorError,
      /Pseudo-elements are not supported/,
    );
  });

  it('should use only the first comma-separated rule', function () {
    const parsed = normalizeCssSelector('button, window', zeroOneSchema);
    expect(parsed.rule.tag).to.equal('button');
  });
});
