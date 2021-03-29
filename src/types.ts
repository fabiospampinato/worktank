
/* HELPERS */

type FN = ( ...args: any[] ) => any;

type PromiseValue<PromiseType, Otherwise = PromiseType> = PromiseType extends Promise<infer Value> ? { 0: PromiseValue<Value>; 1: Value }[PromiseType extends Promise<unknown> ? 0 : 1] : Otherwise; //URL: https://github.com/sindresorhus/type-fest/blob/HEAD/source/promise-value.d.ts

/* MESSAGES */

type MessageExec = {
  type: 'exec',
  method: string,
  args: any[]
};

type MessageInit = {
  type: 'init',
  methods: MethodsSerialized<string> | string
};

type MessageReady = {
  type: 'ready'
};

type MessageResultSuccess = {
  type: 'result',
  value: any
};

type MessageResultError = {
  type: 'result',
  error: {
    name: string,
    message: string,
    stack: string
  }
};

type MessageResult = MessageResultSuccess | MessageResultError;

type Message = MessageExec | MessageInit | MessageReady | MessageResult;

/* POOL */

type Methods <MethodName extends string = string, MethodFunction extends FN = FN> = Record<MethodName, MethodFunction>;

type MethodsSerialized <MethodName extends string = string> = Record<MethodName, string>;

type Options <MethodName extends string = string, MethodFunction extends FN = FN> = {
  name?: string,
  size?: number,
  methods: Methods<MethodName, MethodFunction> | string
};

type Task <MethodName extends string = string, MethodFunction extends FN = FN, Method extends MethodName = MethodName> = {
  method: Method,
  args: Parameters<Methods<MethodName, MethodFunction>[Method]>,
  promise: Promise<ReturnType<Methods<MethodName, MethodFunction>[Method]>>,
  resolve: ( result: ReturnType<Methods<MethodName, MethodFunction>[Method]> ) => void,
  reject: ( error: Error ) => void
};

/* EXPORT */

export {FN, PromiseValue};
export {MessageExec, MessageInit, MessageReady, MessageResult, Message};
export {Methods, MethodsSerialized, Options, Task};
