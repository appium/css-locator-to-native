import type {AttributeSchema} from '../../lib/public/types.js';

export const zeroOneSchema: AttributeSchema = {
  attributes: {
    visible: {type: 'boolean'},
    enabled: {type: 'boolean'},
    index: {type: 'numeric', aliases: ['nth-child']},
    label: {type: 'string'},
    name: {type: 'string', aliases: ['id']},
    value: {type: 'string'},
    type: {type: 'string'},
  },
  booleanFormat: 'zero-one',
};

export const trueFalseSchema: AttributeSchema = {
  attributes: {
    clickable: {type: 'boolean'},
    checked: {type: 'boolean'},
    index: {type: 'numeric', aliases: ['nth-child']},
    'resource-id': {type: 'string', aliases: ['id']},
    text: {type: 'string'},
    description: {type: 'string', aliases: ['content-desc']},
  },
  booleanFormat: 'true-false',
};
