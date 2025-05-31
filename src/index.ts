
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

  private name: string;
  private size: number;
  private env: Env;
  private bootloader: string;

  private tasksBusy: Set<Task<T>>;
  private tasksIdle: Set<Task<T>>;
  private workersBusy: Set<Worker<T>>;
  private workersIdle: Set<Worker<T>>;

  /* CONSTRUCTOR */

  constructor ( options: Options<T> ) {

    this.terminated = true;
    this.timeout = options.timeout ?? Infinity;
    this.terminateTimeout = options.autoterminate ?? 60000;

    this.name = options.name ?? 'WorkTank-Worker';
    this.size = options.size ?? 1;
    this.env = { ...globalThis.process?.env, ...options.env };
    this.bootloader = this.getWorkerBootloader ( this.env, options.methods );

    this.tasksBusy = new Set ();
    this.tasksIdle = new Set ();
    this.workersBusy = new Set ();
    this.workersIdle = new Set ();

    if ( options.warmup ) {
      this.getWorkersWarm ();
    }

  }

  /* HELPERS */

  private _autoterminate = (): void => {

    if ( this.terminateTimeoutId ) return;

    if ( !this.tasksBusy.size && !this.tasksIdle.size ) {

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

  private getTaskIdle = (): Task<T> | undefined => {

    for ( const task of this.tasksIdle ) {

      return task;

    }

  }

  private getWorkerBootloader = ( env: Env, methods: T | URL | string ): string => {

    if ( methods instanceof URL ) { // URL object to import

      return this.getWorkerBootloader ( env, methods.href );

    } else if ( typeof methods === 'string' ) { // URL string to import, or raw bootloader, useful for complex and/or bundled workers

      if ( /^(file|https?):\/\//.test ( methods ) ) { // URL string to import

        const registerEnv = `WorkTankWorkerBackend.registerEnv ( ${JSON.stringify ( env )} );`;
        const registerMethods = `WorkTankWorkerBackend.registerMethods ( Methods );`;
        const ready = 'WorkTankWorkerBackend.ready ();';
        const bootloader = `${'import'} ( '${methods}' ).then ( Methods => { \n${registerEnv}\n\n${registerMethods}\n\n${ready}\n } );`;

        return bootloader;

      } else { // Raw bootloader

        return methods;

      }

    } else { // Serializable methods

      const registerEnv = `WorkTankWorkerBackend.registerEnv ( ${JSON.stringify ( env )} );`;
      const serializedMethods = `{ ${Object.keys ( methods ).map ( name => `${name}: ${methods[name].toString ()}` ).join ( ',' )} }`;
      const registerMethods = `WorkTankWorkerBackend.registerMethods ( ${serializedMethods} );`;
      const ready = 'WorkTankWorkerBackend.ready ();';
      const bootloader = `${registerEnv}\n\n${registerMethods}\n\n${ready}`;

      return bootloader;

    }

  }

  private getWorkerIdle = (): Worker<T> | undefined => {

    for ( const worker of this.workersIdle ) {

      return worker;

    }

    if ( this.workersBusy.size < this.size ) {

      return this.getWorkerIdleNew ();

    }

  }

  private getWorkerIdleNew = (): Worker<T> => {

    const name = this.getWorkerName ();
    const worker = new Worker<T> ( name, this.bootloader );

    this.workersIdle.add ( worker );

    return worker;

  }

  private getWorkerName = (): string => {

    if ( this.size < 2 ) return this.name;

    const counter = 1 + ( this.workersBusy.size + this.workersIdle.size );

    return `${this.name} (${counter})`;

  }

  private getWorkersWarm = (): void => {

    const missingNr = this.size - this.workersBusy.size - this.workersIdle.size;

    for ( let i = 0, l = missingNr; i < l; i++ ) {

      this.getWorkerIdleNew ();

    }

  }

  /* API */

  exec = <U extends MethodsNames<T>> ( method: U, args: MethodArguments<T, U> ): Promise<Awaited<MethodReturn<T, U>>> => {

    const {promise, resolve, reject} = makeNakedPromise<Awaited<MethodReturn<T, U>>> ();
    const task = { method, args, promise, resolve, reject };

    this.terminated = false;
    this.tasksIdle.add ( task );

    this.tick ();

    this._autoterminate ();

    return promise;

  }

  info = (): Info => {

    return {
      tasks: {
        busy: this.tasksBusy.size,
        ready: this.tasksIdle.size,
        total: this.tasksBusy.size + this.tasksIdle.size
      },
      workers: {
        busy: this.workersBusy.size,
        ready: this.workersIdle.size,
        total: this.workersBusy.size + this.workersIdle.size
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
    for ( const task of this.tasksIdle ) task.reject ( error );

    this.tasksBusy = new Set ();
    this.tasksIdle = new Set ();

    /* RESETTING WORKERS */

    for ( const worker of this.workersBusy ) worker.terminate ();
    for ( const worker of this.workersIdle ) worker.terminate ();

    this.workersBusy = new Set ();
    this.workersIdle = new Set ();

  }

  tick = (): void => {

    const worker = this.getWorkerIdle ();

    if ( !worker ) return;

    const task = this.getTaskIdle ();

    if ( !task ) return;

    this.workersIdle.delete ( worker );
    this.workersBusy.add ( worker );

    this.tasksIdle.delete ( task );
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

        this.workersIdle.add ( worker );

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
