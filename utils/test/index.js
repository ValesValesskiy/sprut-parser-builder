let results = {};

function test(blockTitle, testTitle, expected, fn, ...args) {
    if (!results[blockTitle]) {
        results[blockTitle] = [];
    }

    const t = new Date().getTime();
    const result = fn(...args);
    const timeInterval = new Date().getTime() - t;
    let description = testTitle;

    for(let a in args) {
        description = description.replace(new RegExp(`\\$${Number(a) + 1}`, 'g'), args[a]);
    }

    const testResult = {
        timeInterval,
        description,
        result,
        testResult: result === expected,
        expected
    };

    results[blockTitle].push(testResult);

    return testResult;
};

function getResults() {
    return results;
}

function clearResults() {
    results = {};
}

module.exports = {
    test,
    getResults,
    clearResults
}