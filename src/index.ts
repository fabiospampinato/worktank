
/* IMPORT */

import makeNakedPromise from 'promise-make-naked';
import Worker from './worker';
import WorkerError from './worker/error';
import type {Methods, MethodsNames, MethodsProxied, MethodArguments, MethodFunction, MethodReturn, MethodProxied, Env, Info, Options, Task} from './types';

/* MAIN */

class WorkTank<T extends Methods> {

  /* VARIABLES */

  private terminated: boolean;
  private terminateTimeout: number;
  private terminateTimeoutId?: ReturnType<typeof setTimeout>;
  private timeout: number;
  private env: Env;
  private name: string;
  private size: number;
  private bootloader: string;
  private tasksBusy: Set<Task<T>>;
  private tasksReady: Set<Task<T>>;
  private workersBusy: Set<Worker<T>>;
  private workersReady: Set<Worker<T>>;

  /* CONSTRUCTOR */

  constructor ( options: Options<T> ) {

    this.terminated = true;
    this.timeout = options.timeout ?? Infinity;
    this.terminateTimeout = options.autoterminate ?? 60000;
    this.env = { ...globalThis.process?.env, ...options.env };
    this.name = options.name ?? 'WorkTank-Worker';
    this.size = options.size ?? 1;
    this.bootloader = this._getWorkerBootloader ( this.env, options.methods );
    this.tasksBusy = new Set ();
    this.tasksReady = new Set ();
    this.workersBusy = new Set ();
    this.workersReady = new Set ();

    if ( options.warmup ) {
      this._getWorkersWarm ();
    }

  }

  /* HELPERS */

  private _autoterminate = (): void => {

    if ( this.terminateTimeoutId ) return;

    if ( !this.tasksBusy.size && !this.tasksReady.size ) {

      this.terminateTimeoutId = undefined;

      this.terminate ();

    } else {

      const timeout = Math.min ( 2147483647, this.terminateTimeout );

      this.terminateTimeoutId = setTimeout ( () => {

        this.terminateTimeoutId = undefined;

        this._autoterminate ();

      }, timeout );

    }

  }

  private _getTaskReady = (): Task<T> | undefined => {

    for ( const task of this.tasksReady ) return task;

  }

  private _getWorkerBootloader = ( envs: Env, methods: T | URL | string ): string => {

    if ( methods instanceof URL ) { // URL object to import

      return this._getWorkerBootloader ( envs, methods.href );

    } else if ( typeof methods === 'string' ) { // Already serialized methods, or URL string to import, useful for complex and/or bundled workers

      if ( /^(file|https?):\/\//.test ( methods ) ) { // URL string to import

        const env = `WorkTankWorkerBackend.registerEnv ( ${JSON.stringify ( envs )} );`;
        const register = `WorkTankWorkerBackend.registerMethods ( Methods );`;
        const ready = 'WorkTankWorkerBackend.ready ();';
        const load = `${env}\n\n${'import'} ( '${methods}' ).then ( Methods => { \n${register}\n\n${ready}\n } );`;

        return load;

      } else { // Serialized methods

        return methods;

      }

    } else { // Serializable methods

      const env = `WorkTankWorkerBackend.registerEnv ( ${JSON.stringify ( envs )} );`;
      const names = Object.keys ( methods );
      const values = Object.values ( methods );
      const register = names.map ( ( name, index ) => `WorkTankWorkerBackend.registerMethods ({ ${name}: ${values[index].toString ()} });` ).join ( '\n' );
      const ready = 'WorkTankWorkerBackend.ready ();';
      const load = `${env}\n\n${register}\n\n${ready}`;

      return load;

    }

  }

  private _getWorkerName = (): string => {

    if ( this.size < 2 ) return this.name;

    const counter = 1 + ( this.workersBusy.size + this.workersReady.size );

    return `${this.name} (${counter})`;

  }

  private _getWorkerReady = (): Worker<T> | undefined => {

    for ( const worker of this.workersReady ) return worker;

    if ( this.workersBusy.size >= this.size ) return;

    const name = this._getWorkerName ();
    const worker = new Worker<T> ( name, this.bootloader );

    this.workersReady.add ( worker );

    return worker;

  }

  private _getWorkersWarm = (): void => {

    for ( let i = 0, l = this.size; i < l; i++ ) {

      const name = this._getWorkerName ();
      const worker = new Worker<T> ( name, this.bootloader );

      this.workersReady.add ( worker );

    }

  }

  /* API */

  exec = <U extends MethodsNames<T>> ( method: U, args: MethodArguments<T, U> ): Promise<Awaited<MethodReturn<T, U>>> => {

    const {promise, resolve, reject} = makeNakedPromise<Awaited<MethodReturn<T, U>>> ();
    const task = { method, args, promise, resolve, reject };

    this.terminated = false;
    this.tasksReady.add ( task );

    this.tick ();

    this._autoterminate ();

    return promise;

  }

  info = (): Info => {

    return {
      tasks: {
        busy: this.tasksBusy.size,
        ready: this.tasksReady.size,
        total: this.tasksBusy.size + this.tasksReady.size
      },
      workers: {
        busy: this.workersBusy.size,
        ready: this.workersReady.size,
        total: this.workersBusy.size + this.workersReady.size
      }
    };

  }

  proxy = (): MethodsProxied<T> => {

    return new Proxy ( {} as MethodsProxied<T>, {

      get: <U extends MethodsNames<T>> ( _: unknown, method: U ): MethodProxied<MethodFunction<T, U>> | undefined => {

        if ( method === 'then' ) return; //UGLY: Hacky limitation, because a wrapping Promise will lookup this property

        return ( ...args: MethodArguments<T, U> ): Promise<Awaited<MethodReturn<T, U>>> => {

          return this.exec ( method, args );

        };

      }
    });

  }

  terminate = (): void => {

    this.terminated = true;

    /* RESETTING AUTO-TERMINATE */

    clearTimeout ( this.terminateTimeoutId );

    this.terminateTimeoutId = undefined;

    /* RESETTING TASKS */

    const error = new WorkerError ( this.name, 'Terminated' );

    for ( const task of this.tasksBusy ) task.reject ( error );
    for ( const task of this.tasksReady ) task.reject ( error );

    this.tasksBusy = new Set ();
    this.tasksReady = new Set ();

    /* RESETTING WORKERS */

    for ( const worker of this.workersBusy ) worker.terminate ();
    for ( const worker of this.workersReady ) worker.terminate ();

    this.workersBusy = new Set ();
    this.workersReady = new Set ();

  }

  tick = (): void => {

    const worker = this._getWorkerReady ();

    if ( !worker ) return;

    const task = this._getTaskReady ();

    if ( !task ) return;

    this.workersReady.delete ( worker );
    this.workersBusy.add ( worker );

    this.tasksReady.delete ( task );
    this.tasksBusy.add ( task );

    let timeoutId: ReturnType<typeof setTimeout>;

    if ( this.timeout > 0 && this.timeout !== Infinity ) {

      const timeout = Math.min ( 2147483647, this.timeout );

      timeoutId = setTimeout ( (): void => {

        worker.terminate ();

      }, timeout );

    }

    const onFinally = (): void => {

      clearTimeout ( timeoutId );

      if ( this.terminated ) return;

      this.workersBusy.delete ( worker );

      if ( !worker.terminated ) {

        this.workersReady.add ( worker );

      }

      this.tasksBusy.delete ( task );

      this.tick ();

    };

    task.promise.then ( onFinally, onFinally );

    worker.exec ( task );

  }

}

/* EXPORT */

export default WorkTank;
export {WorkerError};
export type {Options};
