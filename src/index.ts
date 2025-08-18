import { EndHandler, IteratorState, MatchDescriptor, NodeRule, NodeRulesDict, RuleHandlerReturnType, StartHandler } from "./types";

export enum StepAction {
	RESET_AND_FROM_NEXT_SYM = 1,
	RESET_AND_FROM_NEXT_LEFT_SYM = 2,
	SAVE_AND_READ_NEXT = 3,
    RESET_SAVE_AND_FROM_NEXT_SYM = 4
};

export function stringIterator(
    str: string,
    callback: (
        currentSymbol: string,
        stateCount: number,
        stateString: string,
        actions: {
            /**
             * Сдвинуть курсор относительно нынешней позиции
             * @param n - Смещение курсора
             */
            cursorBy: (n: number) => void;
            /**
             * Сдвинуть курсор в позицию
             * @param n - Позиция курсора
             */
            cursorTo: (n: number) => void;
            /**
             * Заменить исследуемый символ на строку
             * @param s - Строка
             */
            paste: (s: string) => void;
            /**
             * Остановить работу
             */
            stop: () => void;
        }
    ) => StepAction,
    prevState?: IteratorState
): IteratorState {
	let state: IteratorState = prevState || { str: '', from: 0, to: 0 },
		{ to: stateCount, from: startCount, str: stateStr } = state,
		pasteSym,
		isRead = true;

	while(isRead && (stateCount < str.length)) {
		pasteSym = str[stateCount];

		let res = callback(pasteSym, stateCount, stateStr, { cursorBy, cursorTo, paste, stop });

		if(res === StepAction.SAVE_AND_READ_NEXT) {
			stateStr += pasteSym;
			stateCount++;
		} else if(res === StepAction.RESET_AND_FROM_NEXT_SYM) {
			stateCount++;
			startCount = stateCount;
			stateStr = '';
		} else if(res === StepAction.RESET_AND_FROM_NEXT_LEFT_SYM) {
			stateCount = ++startCount;
			stateStr = '';
		} else if(res === StepAction.RESET_SAVE_AND_FROM_NEXT_SYM) {
			stateCount++;
			startCount = stateCount;
			stateStr = pasteSym;
		} else {
			stop();
		}
	}

	return { from: startCount, to: stateCount, str: stateStr };

	function cursorBy(n: number) {
		stateCount += n;
	}
	function cursorTo(n: number) {
		stateCount = n;
	}
	function paste(s: string) {
		pasteSym = s;
	}
	function stop() {
		isRead = false;
	}
}

export function stateForNextChunk(state: IteratorState): IteratorState {
    return {str: state.str, from: 0, to: 0};
}

export function parserBuilder<DataContext, HandlerName extends string>(
    nodeRules: NodeRulesDict<HandlerName, DataContext>,
    inRootNodes: HandlerName[],
    startHandler: StartHandler<HandlerName, DataContext> = () => {},
    endHandler: EndHandler<HandlerName, DataContext> = () => {}
) {
    nodeRules = { ...nodeRules };
    inRootNodes = [ ...inRootNodes ];

    return function parser(str: string, prevState?: IteratorState) {
        let isEnd = false,
            data: DataContext = Object(),
            currentSearch = inRootNodes;

        startHandler.call(data, str, currentSearch);

        let lastState = stringIterator(str, function(sym, index, substr, m) {
            let nextStep = StepAction.SAVE_AND_READ_NEXT;
            let parseToResults: Array<{
                config: NodeRule<HandlerName, DataContext>
                finded: string;
                name: HandlerName;
            }> = [];

            for(let n of currentSearch) {
                let parseRules = nodeRules[n].parseTo instanceof Array ? nodeRules[n].parseTo : [nodeRules[n].parseTo];

                parseRules.forEach(rule => {
                    if(typeof rule === 'string') {
                        if(partEquals(str, rule, index)) {
                            parseToResults.push({
                                config: nodeRules[n],
                                finded: rule,
                                name: n
                            });
                        }
                    } else if (rule instanceof Function) {
                        let currentString = '';
                        let count = 0;

                        while (str[index + count]) {
                            currentString += str[index + count];

                            const res = rule.call(data, currentString, str, index, currentSearch);
                            const { match, partitionMatch } = res || {};

                            if (match) {
                                parseToResults.push({
                                    config: nodeRules[n],
                                    finded: currentString,
                                    name: n
                                });

                                break;
                            } else if (!partitionMatch) {
                                break;
                            }

                            count++;
                        }
                    }
                });
            }
            if(parseToResults.length) {
                let selectRes = parseToResults[0];

                if(parseToResults.length > 1) {
                    for(let i = 1; i < parseToResults.length; i++) {
                        if(parseToResults[i].finded.length > selectRes.finded.length) selectRes = parseToResults[i];
                    }
                }
                let isCursor = false;
                let res = selectRes.config.handler.call(data, substr, selectRes.finded, str, sym, index, currentSearch);

                if(res) {
                    let nextStep: StepAction | null = null;

                    if(res.paste) {
                        m.paste(selectRes.finded);
                    }
                    if(typeof res.cursorTo === 'number') {
                        isCursor = true;
                        m.cursorTo(res.cursorTo);
                    }
                    if(typeof res.cursorBy === 'number') {
                        isCursor = true;
                        m.cursorBy(res.cursorBy);
                    }
                    if(res.end) {
                        isEnd = true;
                        m.stop();

                        nextStep = StepAction.RESET_AND_FROM_NEXT_SYM;
                    }
                    if(res.continue) nextStep = StepAction.SAVE_AND_READ_NEXT;

                    if (nextStep) {
                        return nextStep;
                    }
                }
                if (!isCursor) m.cursorTo(index + selectRes.finded.length - 1);
                nextStep = StepAction.RESET_AND_FROM_NEXT_SYM;
                currentSearch = selectRes.config.find instanceof Function
                    ? selectRes.config.find.call(data, substr, str, sym, index, currentSearch)
                    : selectRes.config.find
            }

            return nextStep;
        }, prevState);

        if(endHandler) {
            endHandler.call(data, lastState.str, str, currentSearch);
        }

        return { data, state: lastState };

    }
}

export function partEquals(str: string, substr = '', from: number) {
    let isThis = true;

    for(let n = 0; n < substr.length; n++) {
        if(!(isThis = isThis && (substr[n] === str[from + n]))) {
            return false;
        }
    }

    return true;
}

export function matchAtIndex<T>(str: string, index: number, ...strs: MatchDescriptor<T>[]): MatchDescriptor<T> | null {
    let finded = null;

    for(let j = 0; j < strs.length; j++) {
        const item = strs[j];

        if (item.string.length > 1) {
            if (str.substring(index, index + item.string.length) === item.string) {
                finded = finded && finded.string.length < item.string.length ? item : (finded ? finded : item)
            }
        } else {
            if(str[index] === item.string) {
                finded = finded && finded.string.length < item.string.length ? item : (finded ? finded : item);
            }
        }
    }

    return finded;
}

export function firstMatchAtIndex<T>(str: string, start: number, ...strs: MatchDescriptor<T>[]): [MatchDescriptor<T> | null, number | null] {
    for(let i = start; i < str.length; i++) {
        let finded = matchAtIndex(str, i, ...strs);

        if (finded) {
            return [finded, i];
        }
    }

    return [null, null];
}