/** Состояние итерации по строке */
export type IteratorState = {
    /** Необработанная накопленная строка */
    str: string;
    /** Левый курсор, старт строки */
    from: number;
    /** Правый курсор, конец строки */
    to: number;
};

/** Дескриптор для поиска совпадений с данными */
export type MatchDescriptor<T> = {
    /** Строка совпадения */
    string: string;
    /** Данные */
    data?: T;
}

/** Обработчик старта парсинга строки */
export type StartHandler<SearchHandlers extends string, DataContext> = (
    /** Данные */
    this: DataContext,
    /** Полная обрабатываемая строка */
    fullString: string,
    /** Узлы, которые ищет парсер в данный момент */
    currentSearch: SearchHandlers[]
) => void;

/** Обработчик окончания парсинга */
export type EndHandler<SearchHandlers extends string, DataContext> = (
    /** Данные */
    this: DataContext,
    /** Необработанная накопленная строка */
    prevString: string,
    /** Полная обрабатываемая строка */
    fullString: string,
    /** Узлы, которые ищет парсер в данный момент */
    currentSearch: SearchHandlers[]
) => void;

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

/** Дескриптор узла для поиска */
export type NodeRule<SearchHandlers extends string, DataContext> = {
    /** Настройка определения совпадения в строке */
    parseTo: string | ParseToHandler<SearchHandlers, DataContext> | Array<string | ParseToHandler<SearchHandlers, DataContext>>;
    /** Обработчик обнаружения узла */
    handler: NodeRuleHandler<SearchHandlers, DataContext>;
    /** Обработчик, возвращающий узлы для поиска в следующем шаге */
    find: SearchHandlers[] | FindHandler<SearchHandlers, DataContext>;
}

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
) => SearchHandlers[];

/** Набор дескрипторов узлов для поиска */
export type NodeRulesDict<SearchHandlers extends string, DataContext> = Record<SearchHandlers, NodeRule<SearchHandlers, DataContext>>;