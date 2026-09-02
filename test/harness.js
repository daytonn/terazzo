import System from 'system';

const results = {passed: 0, failed: 0};

export function test(name, fn) {
    try {
        fn();
        results.passed++;
        print(`  ok   ${name}`);
    } catch (e) {
        results.failed++;
        print(`  FAIL ${name}\n       ${e.message}`);
    }
}

export function assertEqual(actual, expected, msg = '') {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b)
        throw new Error(`${msg}\n       expected ${b}\n       actual   ${a}`);
}

export function assertThrows(fn, type, msg = '') {
    try {
        fn();
    } catch (e) {
        if (type && !(e instanceof type))
            throw new Error(`${msg} threw ${e.constructor.name}, expected ${type.name}`);
        return;
    }
    throw new Error(`${msg} did not throw`);
}

export function finish() {
    print(`\n${results.passed} passed, ${results.failed} failed`);
    System.exit(results.failed ? 1 : 0);
}
