/**
 * SYNTH TOWN — Minimal Test Framework
 * Подключай перед test_stage_N.js
 *
 * Использование:
 *   STTest.suite('STAGE 1', function() {
 *     STTest.test('T1.1 Canvas exists', function() {
 *       STTest.assert(document.getElementById('game') !== null, 'Canvas element exists');
 *       STTest.assertEqual(typeof ST, 'object', 'ST namespace exists');
 *     });
 *   });
 *   STTest.run();
 */
(function(global) {
  'use strict';

  const _suites = [];
  let _currentSuite = null;

  const STTest = {
    /**
     * Определяет набор тестов
     * @param {string} name — название набора (e.g. 'STAGE 1')
     * @param {function} fn — функция с тестами
     */
    suite: function(name, fn) {
      _currentSuite = { name: name, tests: [], passed: 0, failed: 0, errors: [] };
      _suites.push(_currentSuite);
      fn();
      _currentSuite = null;
    },

    /**
     * Определяет один тест
     * @param {string} name — название теста (e.g. 'T1.1 Canvas exists')
     * @param {function} fn — функция-тест (sync или async)
     */
    test: function(name, fn) {
      if (!_currentSuite) {
        console.error('[TEST] test() called outside suite()');
        return;
      }
      _currentSuite.tests.push({ name: name, fn: fn });
    },

    /**
     * @param {boolean} condition
     * @param {string} [msg]
     */
    assert: function(condition, msg) {
      if (!condition) {
        throw new Error('Assertion failed: ' + (msg || 'no message'));
      }
    },

    /**
     * @param {*} actual
     * @param {*} expected
     * @param {string} [msg]
     */
    assertEqual: function(actual, expected, msg) {
      if (actual !== expected) {
        throw new Error(
          'assertEqual failed: ' + (msg || '') +
          ' — expected ' + JSON.stringify(expected) +
          ', got ' + JSON.stringify(actual)
        );
      }
    },

    /**
     * @param {*} actual
     * @param {*} notExpected
     * @param {string} [msg]
     */
    assertNotEqual: function(actual, notExpected, msg) {
      if (actual === notExpected) {
        throw new Error(
          'assertNotEqual failed: ' + (msg || '') +
          ' — got ' + JSON.stringify(actual)
        );
      }
    },

    /**
     * @param {*} value
     * @param {string} [msg]
     */
    assertTruthy: function(value, msg) {
      if (!value) {
        throw new Error('assertTruthy failed: ' + (msg || '') + ' — got ' + JSON.stringify(value));
      }
    },

    /**
     * @param {*} value
     * @param {string} [msg]
     */
    assertNull: function(value, msg) {
      if (value !== null) {
        throw new Error('assertNull failed: ' + (msg || '') + ' — got ' + JSON.stringify(value));
      }
    },

    /**
     * @param {number} actual
     * @param {number} min
     * @param {number} max
     * @param {string} [msg]
     */
    assertInRange: function(actual, min, max, msg) {
      if (actual < min || actual > max) {
        throw new Error(
          'assertInRange failed: ' + (msg || '') +
          ' — ' + actual + ' not in [' + min + ', ' + max + ']'
        );
      }
    },

    /**
     * @param {function} fn — должна бросить ошибку
     * @param {string} [msg]
     */
    assertThrows: function(fn, msg) {
      let threw = false;
      try { fn(); } catch(e) { threw = true; }
      if (!threw) {
        throw new Error('assertThrows failed: ' + (msg || 'expected error'));
      }
    },

    /**
     * @param {*} value
     * @param {string} expectedType
     * @param {string} [msg]
     */
    assertType: function(value, expectedType, msg) {
      if (typeof value !== expectedType) {
        throw new Error(
          'assertType failed: ' + (msg || '') +
          ' — expected typeof ' + expectedType +
          ', got ' + typeof value
        );
      }
    },

    /**
     * Запустить все зарегистрированные suites
     * @returns {Object} — {total, passed, failed, results}
     */
    run: function() {
      console.log('');
      console.log('%c[TEST] Running ' + _suites.length + ' suite(s)...', 'color: #64b5f6; font-weight: bold');

      let totalPassed = 0;
      let totalFailed = 0;
      const results = [];

      _suites.forEach(function(suite) {
        console.log('%c[TEST] ' + suite.name + ' — ' + suite.tests.length + ' tests', 'color: #ffa726');

        suite.tests.forEach(function(t) {
          try {
            t.fn();
            suite.passed++;
            totalPassed++;
            console.log('  %c✅ ' + t.name, 'color: #66bb6a');
            results.push({ suite: suite.name, test: t.name, status: 'pass' });
          } catch(e) {
            suite.failed++;
            totalFailed++;
            suite.errors.push({ test: t.name, error: e.message });
            console.log('  %c❌ ' + t.name + ' — ' + e.message, 'color: #ef5350');
            results.push({ suite: suite.name, test: t.name, status: 'fail', error: e.message });
          }
        });

        const color = suite.failed === 0 ? '#66bb6a' : '#ef5350';
        console.log(
          '%c[TEST] ' + suite.name + ' — ' + suite.passed + '/' + suite.tests.length + ' passed',
          'color: ' + color + '; font-weight: bold'
        );
      });

      console.log('');
      const summaryColor = totalFailed === 0 ? '#66bb6a' : '#ef5350';
      console.log(
        '%c[TEST] TOTAL: ' + totalPassed + '/' + (totalPassed + totalFailed) + ' passed',
        'color: ' + summaryColor + '; font-weight: bold; font-size: 14px'
      );

      // Render to DOM if container exists
      STTest._renderToDOM(results, totalPassed, totalFailed);

      return { total: totalPassed + totalFailed, passed: totalPassed, failed: totalFailed, results: results };
    },

    /**
     * Render results to #test-results if it exists
     */
    _renderToDOM: function(results, passed, failed) {
      let container = document.getElementById('test-results');
      if (!container) {
        container = document.createElement('div');
        container.id = 'test-results';
        container.style.cssText = 'position:fixed;top:0;right:0;width:400px;max-height:100vh;' +
          'overflow-y:auto;background:#12122a;color:#e0e0e0;font:12px monospace;padding:12px;' +
          'z-index:99999;border-left:2px solid ' + (failed === 0 ? '#66bb6a' : '#ef5350');
        document.body.appendChild(container);
      }

      let html = '<div style="font-size:14px;font-weight:bold;margin-bottom:8px;color:' +
        (failed === 0 ? '#66bb6a' : '#ef5350') + '">' +
        'TESTS: ' + passed + '/' + (passed + failed) + ' passed</div>';

      let currentSuite = '';
      results.forEach(function(r) {
        if (r.suite !== currentSuite) {
          currentSuite = r.suite;
          html += '<div style="color:#ffa726;margin-top:8px;font-weight:bold">' + r.suite + '</div>';
        }
        const icon = r.status === 'pass' ? '✅' : '❌';
        const color = r.status === 'pass' ? '#66bb6a' : '#ef5350';
        html += '<div style="color:' + color + ';margin-left:8px">' + icon + ' ' + r.test;
        if (r.error) html += '<br><span style="color:#999;margin-left:20px">' + r.error + '</span>';
        html += '</div>';
      });

      container.innerHTML = html;
    },

    /**
     * Сброс (для перезапуска)
     */
    reset: function() {
      _suites.length = 0;
    }
  };

  global.STTest = STTest;
})(typeof window !== 'undefined' ? window : global);
