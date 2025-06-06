
/* HELPERS */

type FN = ( ...args: any[] ) => any;

/* MESSAGES */

type MessageExec = {
  type: 'exec',
  method: string,
  args: unknown[]
};

type MessageLog = {
  type: 'log',
  value: string
};

type MessageReady = {
  type: 'ready'
};

type MessageResultSuccess = {
  type: 'result',
  value: unknown
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

type Message = MessageExec | MessageLog | MessageReady | MessageResult;

/* METHODS */

type Methods = Record<string, FN>;

type MethodsNames<T extends Methods> = keyof T extends string ? keyof T : never;

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

type ExecOptions = {
  signal?: AbortSignal,
  timeout?: number,
  transfer?: Transferable[]
};

type Options<T extends Methods> = {
  pool?: {
    name?: string,
    size?: number,
  },
  worker: {
    autoAbort?: number,
    autoInstantiate?: boolean,
    autoTerminate?: number,
    env?: Env,
    methods: T | URL | string
  }
};

type Stats = {
  tasks: {
    busy: number,
    idle: number,
    total: number
  },
  workers: {
    busy: number,
    idle: number,
    total: number
  }
};

type Task<T extends Methods, U extends MethodsNames<T> = MethodsNames<T>> = {
  method: U,
  args: MethodArguments<T, U>,
  signal?: AbortSignal,
  timeout: number,
  transfer?: Transferable[],
  promise: Promise<Awaited<MethodReturn<T, U>>>,
  resolve: ( result: MethodReturn<T, U> ) => void,
  reject: ( error: Error ) => void
};

/* EXPORT */

export type {MessageExec, MessageLog, MessageReady, MessageResult, Message};
export type {Methods, MethodsNames, MethodsFunctions, MethodsProxied, MethodFunction, MethodArguments, MethodReturn, MethodProxied};
export type {Env, ExecOptions, Options, Stats, Task};
