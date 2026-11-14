import {createParser} from 'css-selector-parser';
import type {AstAttribute, AstFormula, AstPseudoClass, AstRule, AstSelector, AstString} from 'css-selector-parser';

import {InvalidSelectorError, UnsupportedSelectorError} from '../../public/errors.js';
import type {
  CssParserAdapter,
  InternalCssAttribute,
  InternalCssPseudoClass,
  InternalCssRule,
  InternalCssSelector,
} from './types.js';

const SUPPORTED_OPERATORS = new Set(['=', '*=', '^=', '$=', '~=']);
const FORMULA_PSEUDOS = ['nth-of-type', 'nth-last-of-type', 'nth-col', 'nth-last-col'] as const;
const FORMULA_OF_SELECTOR_PSEUDOS = ['nth-child', 'nth-last-child'] as const;
const SELECTOR_PSEUDOS = ['has'] as const;
const REGISTERED_PSEUDO_CLASSES = new Set<string>([
  ...SELECTOR_PSEUDOS,
  ...FORMULA_OF_SELECTOR_PSEUDOS,
  ...FORMULA_PSEUDOS,
]);

const parseCssSelector = createParser({
  syntax: {
    pseudoClasses: {
      unknown: 'accept',
      definitions: {
        Selector: [...SELECTOR_PSEUDOS],
        Formula: [...FORMULA_PSEUDOS],
        FormulaOfSelector: [...FORMULA_OF_SELECTOR_PSEUDOS],
      },
    },
    combinators: ['>', '+', '~'],
    attributes: {
      operators: ['^=', '$=', '*=', '~=', '='],
    },
    ids: true,
    classNames: true,
    tag: {
      wildcard: true,
    },
    pseudoElements: {
      unknown: 'accept',
    },
  },
  substitutes: true,
});

function readStringValue(
  value: AstString | {type: 'Substitution'; name: string} | undefined,
  context: string,
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.type === 'String') {
    return value.value;
  }
  throw new UnsupportedSelectorError(`${context} does not support substitution values.`);
}

function normalizePseudoArgument(pseudo: AstPseudoClass): AstPseudoClass['argument'] {
  const lowerName = pseudo.name.toLowerCase();
  const {argument} = pseudo;
  if (
    pseudo.name === lowerName ||
    !REGISTERED_PSEUDO_CLASSES.has(lowerName) ||
    (argument && argument.type !== 'String')
  ) {
    return argument;
  }

  const rawArg = argument ? `(${argument.value})` : '';
  const reparsed = parseCssSelector(`:${lowerName}${rawArg}`);
  const rule = reparsed.rules[0];
  const item = rule?.items[0];
  if (
    reparsed.rules.length !== 1 ||
    !rule ||
    rule.nestedRule ||
    rule.items.length !== 1 ||
    item?.type !== 'PseudoClass'
  ) {
    throw new Error(`Invalid pseudo-class argument for ':${pseudo.name}'.`);
  }
  return item.argument;
}

function readPseudoValue(pseudo: AstPseudoClass): string | undefined {
  const argument = normalizePseudoArgument(pseudo);
  if (!argument) {
    return undefined;
  }
  if (argument.type === 'String') {
    return argument.value;
  }
  if (argument.type === 'Formula') {
    return readFormulaValue(argument);
  }
  throw new UnsupportedSelectorError(`Unsupported pseudo-class argument for ':${pseudo.name}'.`);
}

function readFormulaValue(formula: AstFormula): string {
  if (formula.a !== 0) {
    throw new UnsupportedSelectorError(`Unsupported nth formula '${formula.a}n + ${formula.b}'.`);
  }
  return String(formula.b);
}

function mapAttribute(attr: AstAttribute): InternalCssAttribute {
  if (attr.namespace) {
    throw new UnsupportedSelectorError(`Attribute namespace selectors are not supported.`);
  }
  if (attr.caseSensitivityModifier) {
    throw new UnsupportedSelectorError(`Attribute case sensitivity modifiers are not supported.`);
  }
  const operator = attr.operator;
  if (operator && !SUPPORTED_OPERATORS.has(operator)) {
    throw new UnsupportedSelectorError(`Unsupported CSS attribute operator '${operator}'.`);
  }
  return {
    name: attr.name,
    operator: operator as InternalCssAttribute['operator'],
    value: readStringValue(attr.value, `Attribute '${attr.name}'`),
  };
}

function mapRule(rule: AstRule): InternalCssRule {
  let tag: string | undefined;
  const classNames: string[] = [];
  const ids: string[] = [];
  const attributes: InternalCssAttribute[] = [];
  const pseudoClasses: InternalCssPseudoClass[] = [];

  for (const item of rule.items) {
    switch (item.type) {
      case 'TagName':
        if (item.namespace) {
          throw new UnsupportedSelectorError(`Tag namespace selectors are not supported.`);
        }
        tag = item.name;
        break;
      case 'WildcardTag':
        if (item.namespace) {
          throw new UnsupportedSelectorError(`Tag namespace selectors are not supported.`);
        }
        tag = '*';
        break;
      case 'ClassName':
        classNames.push(item.name);
        break;
      case 'Id':
        ids.push(item.name);
        break;
      case 'Attribute':
        attributes.push(mapAttribute(item));
        break;
      case 'PseudoClass':
        pseudoClasses.push({
          name: item.name,
          value: readPseudoValue(item),
        });
        break;
      case 'PseudoElement':
        throw new UnsupportedSelectorError(`Pseudo-elements are not supported.`);
      case 'NestingSelector':
        throw new UnsupportedSelectorError(`Nesting selectors are not supported.`);
      default:
        throw new UnsupportedSelectorError(`Unsupported CSS selector item.`);
    }
  }

  return {
    combinator: rule.combinator,
    tag,
    classNames,
    ids,
    attributes,
    pseudoClasses,
    nestedRule: rule.nestedRule ? mapRule(rule.nestedRule) : undefined,
  };
}

function mapSelector(selector: AstSelector): InternalCssSelector {
  return {
    rules: selector.rules.map(mapRule),
  };
}

export const cssSelectorParserAdapter: CssParserAdapter = {
  parse(selector: string): InternalCssSelector {
    try {
      return mapSelector(parseCssSelector(selector));
    } catch (err) {
      if (err instanceof UnsupportedSelectorError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new InvalidSelectorError(`Invalid CSS selector '${selector}'. Reason: '${message}'`);
    }
  },
};
