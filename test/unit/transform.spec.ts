import assert from 'node:assert/strict';
import {
  UnresolvedStrategyError,
  createCssTransformer,
  type ParsedSelector,
  type StrategyEmitter,
  type StrategyKey,
} from '../../lib/index.js';
import {zeroOneSchema} from '../fixtures/schemas.js';
import {describe, it} from 'node:test';

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

    assert.deepStrictEqual(transform('button'), {
      strategy: '-ios class chain',
      selector: 'tag:button',
    });
    assert.deepStrictEqual(transform('#foo'), {
      strategy: 'accessibility id',
      selector: 'foo',
    });
    assert.deepStrictEqual(transform('window'), {
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

    assert.deepStrictEqual(transform('button', {prefix: 'ctx'}), {
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

    assert.throws(() => transform('button'), /No native strategy matched/);
  });

  for (const blockedKey of ['__proto__', 'constructor', 'prototype'] as const) {
    it(`should throw UnresolvedStrategyError when resolveStrategy returns '${blockedKey}'`, function () {
      const transform = createCssTransformer({
        schema: zeroOneSchema,
        emitters,
        resolveStrategy(): StrategyKey<typeof emitters> {
          return blockedKey as StrategyKey<typeof emitters>;
        },
      });

      assert.throws(() => transform('button'), /No native strategy matched/);
    });
  }

  it('should throw UnresolvedStrategyError when emitters registry is polluted with an own __proto__ entry', function () {
    const pollutedEmitters = Object.create(null) as typeof emitters & {
      __proto__: (typeof emitters)['chain'];
    };
    pollutedEmitters.chain = emitters.chain;
    pollutedEmitters.__proto__ = {
      strategy: 'polluted',
      emit() {
        return 'polluted';
      },
    };

    const transform = createCssTransformer({
      schema: zeroOneSchema,
      emitters: pollutedEmitters,
      resolveStrategy(): StrategyKey<typeof pollutedEmitters> {
        return '__proto__' as StrategyKey<typeof pollutedEmitters>;
      },
    });

    assert.throws(() => transform('button'), /No native strategy matched/);
  });

  it('should throw UnresolvedStrategyError when resolveStrategy returns a falsy key', function () {
    const transform = createCssTransformer({
      schema: zeroOneSchema,
      emitters,
      resolveStrategy(): StrategyKey<typeof emitters> {
        return '' as StrategyKey<typeof emitters>;
      },
    });

    assert.throws(() => transform('button'), UnresolvedStrategyError);
  });
});
