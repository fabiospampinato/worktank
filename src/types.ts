
/* HELPERS */

type FN = ( ...args: any[] ) => any;

/* MESSAGES */

type MessageExec = {
  type: 'exec',
  method: string,
  args: any[]
};

type MessageInit = {
  type: 'init'
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

type Options <MethodName extends string = string, MethodFunction extends FN = FN> = {
  name?: string,
  size?: number,
  timeout?: number,
  autoterminate?: number,
  methods: Methods<MethodName, MethodFunction> | string
};

type Task <MethodName extends string = string, MethodFunction extends FN = FN> = {
  method: MethodName,
  args: Parameters<Methods<MethodName, MethodFunction>[MethodName]>,
  promise: Promise<ReturnType<Methods<MethodName, MethodFunction>[MethodName]>>,
  resolve: ( result: ReturnType<Methods<MethodName, MethodFunction>[MethodName]> ) => void,
  reject: ( error: Error ) => void
};

/* EXPORT */

export type {FN};
export type {MessageExec, MessageInit, MessageReady, MessageResult, Message};
export type {Methods, Options, Task};
