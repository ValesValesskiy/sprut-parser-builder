require('../../../test');
const { getResults } = require('../../../utils/test');

/** Подведение результатов */

const results = getResults();
let readme = '';
let testSuccess = true;

for(let block in results) {
    const tests = results[block];

    readme += block + '\n\n';
    tests.forEach(({
        timeInterval,
        description,
        result,
        testResult,
        expected
    }) => {
        readme +=
            '```js\n' +
            (!testResult ? 'Ошибка!\n\n' : '') +
            description +
            ` "${result}"\nВремя выполнения: ${timeInterval}мс` + `${testResult ? '' : `\nОжидается: "${expected}"`}` +
            '\n```\n';
        
        if (!testResult) {
            testSuccess = false;
        }
    });

    readme += '\n\n<br>\n\n';
}

readme = (!testSuccess ? '### <span style="color: #F22;">В тестах есть ошибки!</span>\n\n<br>\n\n' : '') + readme + '\n\n<br>\n\n';

/** Конфигурация readme.md */

const { writeFileSync, readFileSync } = require('fs');
const readmeContent = readFileSync('./base.readme.md');

writeFileSync('./readme.md', readmeContent + readme);