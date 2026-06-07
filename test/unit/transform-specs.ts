import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  UnresolvedStrategyError,
  createCssTransformer,
  type ParsedSelector,
  type StrategyEmitter,
  type StrategyKey,
} from '../../lib/index.js';
import {zeroOneSchema} from '../fixtures/schemas.js';

use(chaiAsPromised);

describe('createCssTransformer', function () {
  const emitters = {
    chain: {
      strategy: '-ios class chain',
      emit(parsed: ParsedSelector) {
        return `tag:${parsed.rule.tag ?? '*'}`;
      },
    },
    id: {
      strategy: 'accessibility id',
      emit(parsed: ParsedSelector) {
        return parsed.rule.id ?? '';
      },
    },
  };

  it('should return strategy and selector from the resolved emitter', function () {
    const transform = createCssTransformer({
      schema: zeroOneSchema,
      emitters,
      resolveStrategy(parsed): StrategyKey<typeof emitters> {
        return parsed.rule.id ? 'id' : 'chain';
      },
    });

    expect(transform('button')).to.deep.equal({
      strategy: '-ios class chain',
      selector: 'tag:button',
    });
    expect(transform('#foo')).to.deep.equal({
      strategy: 'accessibility id',
      selector: 'foo',
    });
    expect(transform('window')).to.deep.equal({
      strategy: '-ios class chain',
      selector: 'tag:window',
    });
  });

  it('should pass context to resolveStrategy and emitters', function () {
    type EchoContext = {prefix: string};
    const echoEmitters = {
      echo: {
        strategy: 'echo',
        emit(_parsed: ParsedSelector, ctx?: EchoContext) {
          return ctx?.prefix ?? '';
        },
      } satisfies StrategyEmitter<EchoContext>,
    };
    const transform = createCssTransformer<typeof echoEmitters, EchoContext>({
      schema: zeroOneSchema,
      emitters: echoEmitters,
      resolveStrategy(): StrategyKey<typeof echoEmitters> {
        return 'echo';
      },
    });

    expect(transform('button', {prefix: 'ctx'})).to.deep.equal({
      strategy: 'echo',
      selector: 'ctx',
    });
  });

  it('should throw UnresolvedStrategyError when resolveStrategy returns an unknown key', function () {
    const transform = createCssTransformer({
      schema: zeroOneSchema,
      emitters,
      resolveStrategy(): StrategyKey<typeof emitters> {
        return 'missing' as StrategyKey<typeof emitters>;
      },
    });

    expect(() => transform('button')).to.throw(
      UnresolvedStrategyError,
      /No native strategy matched/,
    );
  });

  it('should throw UnresolvedStrategyError when resolveStrategy returns a falsy key', function () {
    const transform = createCssTransformer({
      schema: zeroOneSchema,
      emitters,
      resolveStrategy(): StrategyKey<typeof emitters> {
        return '' as StrategyKey<typeof emitters>;
      },
    });

    expect(() => transform('button')).to.throw(UnresolvedStrategyError);
  });
});
