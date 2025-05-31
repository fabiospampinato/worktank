
/* HELPERS */

type FN = ( ...args: any[] ) => any;

/* MESSAGES */

type MessageExec = {
  type: 'exec',
  method: string,
  args: any[]
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

type Message = MessageExec | MessageReady | MessageResult;

/* METHODS */

type Methods = Record<string, FN>;

type MethodsNames<T extends Methods> = keyof T;

type MethodsFunctions<T extends Methods> = T[keyof T];

type MethodsProxied<T extends Methods> = { [K in Exclude<keyof T, 'then'>]: (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>> };

type MethodFunction<T extends Methods, U extends MethodsNames<T>> = T[U];

type MethodArguments<T extends Methods, U extends MethodsNames<T>> = Parameters<MethodFunction<T, U>>;

type MethodReturn<T extends Methods, U extends MethodsNames<T>> = ReturnType<MethodFunction<T, U>>;

type MethodProxied<T extends FN> = (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;

/* POOL */

type Env = Partial<{
  [key: string]: string
}>;

type Info = {
  tasks: {
    busy: number,
    ready: number
  },
  workers: {
    busy: number,
    ready: number
  }
};

type Options<T extends Methods> = {
  env?: Env,
  name?: string,
  size?: number,
  timeout?: number,
  warmup?: boolean,
  autoterminate?: number,
  methods: T | URL | string
};

type Task<T extends Methods, U extends MethodsNames<T> = MethodsNames<T>> = {
  method: U,
  args: MethodArguments<T, U>,
  promise: Promise<Awaited<MethodReturn<T, U>>>,
  resolve: ( result: MethodReturn<T, U> ) => void,
  reject: ( error: Error ) => void
};

/* EXPORT */

export type {FN};
export type {MessageExec, MessageReady, MessageResult, Message};
export type {Methods, MethodsNames, MethodsFunctions, MethodsProxied, MethodFunction, MethodArguments, MethodReturn, MethodProxied};
export type {Env, Info, Options, Task};
