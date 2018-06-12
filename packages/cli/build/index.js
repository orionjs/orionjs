#!/usr/bin/env node
'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _start = require('./start');

var _start2 = _interopRequireDefault(_start);

var _build = require('./build');

var _build2 = _interopRequireDefault(_build);

var _safe = require('colors/safe');

var _safe2 = _interopRequireDefault(_safe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var run = function run(action) {
  return (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
    var _args = arguments;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return action.apply(undefined, _args);

          case 3:
            _context.next = 8;
            break;

          case 5:
            _context.prev = 5;
            _context.t0 = _context['catch'](0);

            console.error(_safe2.default.red('Error: ' + _context.t0.message));

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 5]]);
  }));
};

_commander2.default.command('start').description('Run the orionjs app').option('-s, --shell', 'Opens a shell in Chrome developer tools').action(run(_start2.default));

_commander2.default.command('build').description('Build a orionjs, exports it to a simple nodejs app').option('-o, --output [output]', 'Output directory').action(run(_build2.default));

_commander2.default.parse(process.argv);