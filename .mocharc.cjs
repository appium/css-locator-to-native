// Config must be CJS: with "type": "module", Mocha 11 only auto-loads .mocharc.cjs.
// Tests are compiled to build/test and run as native ESM (.js).
/** @type {import('mocha').MochaOptions} */
module.exports = {
  extension: ['js'],
  spec: ['build/test/unit/**/*-specs.js'],
  timeout: 60000,
  exit: true,
};
