
/* IMPORT */

import {setInterval, clearInterval, unrefInterval} from 'isotimer';
import makeNakedPromise from 'promise-make-naked';
import Worker from './worker';
import WorkerError from './worker/error';
import type {Methods, MethodsNames, MethodsProxied, MethodArguments, MethodFunction, MethodReturn, MethodProxied, Env, ExecOptions, Options, Stats, Task} from './types';

/* HELPERS */

const clearIntervalRegistry = new FinalizationRegistry ( clearInterval );

/* MAIN */

class WorkTank<T extends Methods> {

  /* VARIABLES */

  private name: string;
  private size: number;
  private env: Env;
  private bootloader: string;

  private timeout: number;
  private autoterminateTimeout: number;

  private tasksBusy: Set<Task<T>>;
  private tasksIdle: Set<Task<T>>;
  private workersBusy: Set<Worker<T>>;
  private workersIdle: Set<Worker<T>>;

  /* CONSTRUCTOR */

  constructor ( options: Options<T> ) {

    this.name = options.name ?? 'WorkTank-Worker';
    this.size = options.size ?? 1;
    this.env = { ...globalThis.process?.env, ...options.env };
    this.bootloader = this.getWorkerBootloader ( this.env, options.methods );

    this.timeout = options.timeout ?? Infinity;
    this.autoterminateTimeout = options.autoterminate ?? 60_000;

    this.tasksBusy = new Set ();
    this.tasksIdle = new Set ();
    this.workersBusy = new Set ();
    this.workersIdle = new Set ();

    if ( options.warmup ) {
      this.getWorkersWarm ();
    }

    if ( this.autoterminateTimeout ) {

      const thizRef = new WeakRef ( this );
      const intervalId = setInterval ( () => {
        thizRef.deref ()?.cleanup ();
      }, this.autoterminateTimeout );

      unrefInterval ( intervalId );

      clearIntervalRegistry.register ( this, intervalId );

    }

  }

  /* HELPERS */

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

  cleanup = (): void => {

    if ( this.autoterminateTimeout <= 0 ) return;

    const autoterminateTimestamp = Date.now () - this.autoterminateTimeout;

    for ( const worker of this.workersIdle ) {

      if ( worker.ready && !worker.busy && worker.timestamp < autoterminateTimestamp ) {

        worker.terminate ();

        this.workersIdle.delete ( worker );

      }

    }

  }

  //TODO: Options: timeout, abortSignal, transferList

  exec = <U extends MethodsNames<T>> ( method: U, args: MethodArguments<T, U>, options?: ExecOptions ): Promise<Awaited<MethodReturn<T, U>>> => {

    const {promise, resolve, reject} = makeNakedPromise<Awaited<MethodReturn<T, U>>> ();
    const signal = options?.signal;
    const timeout = options?.timeout ?? this.timeout;
    const task = { method, args, signal, timeout, promise, resolve, reject };

    this.tasksIdle.add ( task );

    this.tick ();

    return promise;

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

  stats = (): Stats => {

    return {
      tasks: {
        busy: this.tasksBusy.size,
        idle: this.tasksIdle.size,
        total: this.tasksBusy.size + this.tasksIdle.size
      },
      workers: {
        busy: this.workersBusy.size,
        idle: this.workersIdle.size,
        total: this.workersBusy.size + this.workersIdle.size
      }
    };

  }

  terminate = (): void => {

    /* TERMINATING TASKS */

    const error = new WorkerError ( this.name, 'Terminated' );

    for ( const task of this.tasksBusy ) task.reject ( error );
    for ( const task of this.tasksIdle ) task.reject ( error );

    this.tasksBusy = new Set ();
    this.tasksIdle = new Set ();

    /* TERMINATING WORKERS */

    for ( const worker of this.workersBusy ) worker.terminate ();
    for ( const worker of this.workersIdle ) worker.terminate ();

    this.workersBusy = new Set ();
    this.workersIdle = new Set ();

  }

  tick = (): void => {

    /* GETTING TASK */

    const task = this.getTaskIdle ();

    if ( !task ) return;

    /* SIGNAL - ABORTED */

    if ( task.signal?.aborted ) {

      this.tasksIdle.delete ( task );

      task.reject ( new WorkerError ( this.name, 'Terminated' ) );

      return this.tick ();

    }

    /* GETTING WORKER */

    const worker = this.getWorkerIdle ();

    if ( !worker ) return;

    /* SETTING UP TASK & WORKER */

    this.tasksIdle.delete ( task );
    this.tasksBusy.add ( task );

    this.workersIdle.delete ( worker );
    this.workersBusy.add ( worker );

    /* SIGNAL - ABORTABLE */

    if ( task.signal ) {

      task.signal.addEventListener ( 'abort', worker.terminate, { once: true } );

    }

    /* TIMEOUT */

    let timeoutId: ReturnType<typeof setTimeout>;

    if ( task.timeout > 0 && task.timeout !== Infinity ) {

      timeoutId = setTimeout ( worker.terminate, task.timeout );

    }

    /* CLEAN UP */

    const onFinally = (): void => {

      clearTimeout ( timeoutId );

      this.tasksBusy.delete ( task );
      this.workersBusy.delete ( worker );

      if ( !worker.terminated ) {

        this.workersIdle.add ( worker );

      }

      this.tick ();

    };

    task.promise.then ( onFinally, onFinally );

    /* EXECUTING */

    worker.exec ( task );

  }

}

/* EXPORT */

export default WorkTank;
export {WorkerError};
export type {ExecOptions, Options};
