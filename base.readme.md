```
> npm i sprut-parser-builder
```

# Sprut-parser-builder

Набор функция для построения парсеров и прохода по строке для посимвольной обработки.

---

Экспортируются `stringIterator`, `parserBuilder` и дополнительные инструменты для проверки эквиваленстоности и утилиты.

---

<br>

## <span id="contents">Оглавление</span>

- [Использование parserBuilder](#parser-builder)
- [Использование stringIterator](#string-iterator)

<br>

## <span id="parser-builder">Использование parserBuilder:</span>

- [К оглавлению](#contents)

<br>

Функция `parserBuilder` возвращает функция, принимающую строку для парсинга и, опционально, предыдущее состояние парсинга, если операция была прервана или завершена на строке, которая является частью большого целого, например.
`parserBuilder` принимает набор нод-настроек поиска всех искомых сущностей, стартовый набор нод, с которых будет начат поиск и обработчики конца и начала парсинга.
При обнаружении каждой ноды вызывается обработчик `handler`, для вызова необходимых действий и через обработчик `find`(либо это сразу массив имён следующих нод) получает список для дальнейшего поиска.

Контекст `handler` и `find` - это внутренний пустой объект, который можно предзаполнить в стартовом обработчике или закинуть с данными предыдущего состояния.
Возвращает функция парсинга тот самый объект данных и своё состояние парсинга.

<br>

Ниже будет приведён код бесполезного парсера для строк:

<br>

```js
import { parserBuilder } from './dist';

const parser = parserBuilder<{ html: boolean; css: boolean; js: boolean; }, 'html' | 'css' | 'js'>({
    html: {
        parseTo: 'html',
        handler() {
            this.html = true;
        },
        find: ['html', 'css', 'js']
    },
    css: {
        parseTo: [(str) => {
            return { match: str === 'css', partitionMatch: new RegExp(str).test('css') };
        }, 'cssS'],
        handler(substr, finded) {
            this.css = finded;
        },
        find: () => ['html', 'css', 'js']
    },
    js: {
        parseTo: ['js', 'ts'],
        handler() {
            this.js = true;
        },
        find: ['html', 'css', 'js']
    },
}, ['html', 'css', 'js'], function startHandler() {
    this.css = false;
    this.html = false;
});

console.log(parser('--html---ts---cssS--').data);
// { css: 'cssS', html: true, js: true }
```
`css: 'cssS'` - потому что парсер выбирает длиннейшее из совпадений, не смотря на то, что также могла быть обнаружена строка `css`. Такое поведение намеренно, чтобы не пропускать совпадения при строках, которые совпадают по своему началу, но являются длиннее по колчиеству символов.

Так можно обрабатывать различные этапы парсинга и возвращать из `find` то, что искать в строке дальше.

<br>

## <span id="string-iterator">Использование stringIterator:</span>

- [К оглавлению](#contents)

<br>

На базе функции `stringIterator` построена фукнция `parserBuilder` и она дополительно экспортируется из пакетаю По сути - это конечный автомат для перебора символов строки. С помощью возвращаемых команд из фукнции обработчика решается как поведёт себя перебор в следующей итерации. Возвращать следует значение из экспортируемого `StepAction`:

`RESET_AND_FROM_NEXT_SYM = 1` - очищает накопленную строку и продолжает итерации со следующего от правого курсора, последнего накопленного символа в строке, старт становится финишным курсором, сравниваясь с ним.

`RESET_AND_FROM_NEXT_LEFT_SYM = 2` - очищает накопленную строку и продолжает итерации со следующего символа от левого курсора, первого символа в строке, +1 к предыдущему старту, финишный курсор становится снова стартовым. Вызов `cursorTo` и `cursorBy` при обработке не даст результата, правый курсор сдвинется относительно левого курсора на 1 вправо.

`SAVE_AND_READ_NEXT = 3` - добавляет символ к накапливаемой строке и движется к следующему индексу от нынешнего символа, финишный курсор двигается направо, индекс возрастает на +1.

`RESET_SAVE_AND_FROM_NEXT_SYM = 4` - сбрасывает накопленную строку, добавляет символ к накапливаемой строке и движется к следующему индексу от нынешнего символа, финишный курсор двигается направо, индекс возрастает на +1.

<br>

```js
import { stringIterator, StepAction } from 'sprut-parser-builder';

const results: string[] = [];

stringIterator('123456789123456789', (symbol, index, stateString) => {
    if (stateString.length === 5) {
        results.push(stateString);
        return symbol !== '7' ? StepAction.RESET_AND_FROM_NEXT_LEFT_SYM : StepAction.RESET_SAVE_AND_FROM_NEXT_SYM;
    } else {
        return StepAction.SAVE_AND_READ_NEXT;
    }
});

console.log(results);
// [ '12345', '23456', '78912', '91234', '12345', '23456' ]
```

Типа обработчика `parseTo`, если это функция:

```js
/** Обработчик обнаружения узла */
export type ParseToHandler<SearchHandlers extends string, DataContext> = (
    this: DataContext,
    string: string,
    fullString: string,
    currentIndex: number,
    currentSearch: SearchHandlers[]
) => ({
    /** Частичное совпадение, продолжать проверку */
    partitionMatch?: boolean;
    /** Совпадение, узел найден */
    match?: boolean;
})
```

Типа обработчика `handler`:

```js
/** Обработчик обнаруженного узла */
export type NodeRuleHandler<SearchHandlers extends string, DataContext> = (
    /** Данные */
    this: DataContext,
    /** Необработанная накопленная строка */
    prevString: string,
    /** Обнаруженное совпадение */
    findedString: string,
    /** Полная обрабатываемая строка */
    fullString: string,
    /** Обрабатываемый символ, находится под курсором в данный момент */
    currentSymbol: string,
    /** Обрабатываемый индекс, находится под курсором в данный момент */
    currentIndex: number,
    /** Узлы, которые ищет парсер в данный момент */
    currentSearch: SearchHandlers[]
) => RuleHandlerReturnType | void;
```

То, что можно вернуть из `handler` как команду:

```js
/** Действия итератора при обработке узла */
export type RuleHandlerReturnType = {
    /** Добавить строку к накапливаемой строке */
    paste?: string;
    /** Сдвинуть курсор в позицию */
    cursorTo?: number;
    /** Сдвинуть курсор относительно нынешней позиции */
    cursorBy?: number;
    /** Остановить работу парсера */
    end?: boolean;
    /** Продолжить обработку нынешнего набора узлов без вызова .find() */
    continue?: boolean;
}
```

Типа обработчика `find`:

```js
/** Обработчик, возвращающий узлы для поиска в следующем шаге */
export type FindHandler<SearchHandlers extends string, DataContext> = (
    /** Данные */
    this: DataContext,
    /** Необработанная накопленная строка */
    prevString: string,
    /** Полная обрабатываемая строка */
    fullString: string,
    /** Обрабатываемый символ, находится под курсором в данный момент */
    currentSymbol: string,
    /** Обрабатываемый индекс, находится под курсором в данный момент */
    currentIndex: number,
    /** Узлы, которые ищет парсер в данный момент */
    currentSearch: SearchHandlers[]
) => SearchHandlers[]/*Список узлов для дальнейшего поиска */;
```

