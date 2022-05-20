
/* IMPORT */

import makeNakedPromise from 'promise-make-naked';
import Worker from './worker';
import type {FN, PromiseValue, Methods, MethodsSerialized, Options, Task} from './types';

/* MAIN */

class WorkTank <MethodName extends string, MethodFunction extends FN> {

  /* VARIABLES */

  public terminated: boolean;

  private timeout: number;
  private terminateTimeout: number;
  private terminateTimeoutId?: ReturnType<typeof setTimeout>;
  private name: string;
  private size: number;
  private methods: MethodsSerialized<MethodName> | string;
  private tasksBusy: Set<Task<MethodName, MethodFunction>>;
  private tasksReady: Set<Task<MethodName, MethodFunction>>;
  private workersBusy: Set<Worker<MethodName, MethodFunction>>;
  private workersReady: Set<Worker<MethodName, MethodFunction>>;

  /* CONSTRUCTOR */

  constructor ( options: Options<MethodName, MethodFunction> ) {

    this.terminated = true;
    this.timeout = options.timeout ?? Infinity;
    this.terminateTimeout = options.autoterminate ?? 60000;
    this.name = options.name ?? 'WorkTank-Worker';
    this.size = options.size ?? 1;
    this.methods = this._getMethodsSerialized ( options.methods );
    this.tasksBusy = new Set ();
    this.tasksReady = new Set ();
    this.workersBusy = new Set ();
    this.workersReady = new Set ();

  }

  /* HELPERS */

  _autoterminate (): void {

    if ( this.terminateTimeoutId ) return;

    if ( !this.tasksBusy.size && !this.tasksReady.size ) {

      this.terminateTimeoutId = undefined;

      this.terminate ();

    } else {

      const interval = Math.min ( 2147483647, this.terminateTimeout );

      this.terminateTimeoutId = setTimeout ( () => {

        this.terminateTimeoutId = undefined;

        this._autoterminate ();

      }, interval );

    }

  }

  _getMethodsSerialized ( methods: Methods<MethodName, MethodFunction> | string ): MethodsSerialized<MethodName> | string {

    if ( typeof methods === 'string' ) { // Serialized function that returns the methods, useful for complex workers

      return methods;

    } else { // Deserialized methods map

      const serialized: MethodsSerialized<string> = {};

      for ( const method in methods ) {

        serialized[method] = methods[method].toString ();

      }

      return serialized;

    }

  }

  _getTaskReady (): Task<MethodName, MethodFunction> | undefined {

    for ( const task of this.tasksReady ) return task;

  }

  _getWorkerName (): string {

    if ( this.size < 2 ) return this.name;

    const counter = 1 + ( this.workersBusy.size + this.workersReady.size );

    return `${this.name} (${counter})`;

  }

  _getWorkerReady (): Worker<MethodName, MethodFunction> | undefined {

    for ( const worker of this.workersReady ) return worker;

    if ( this.workersBusy.size >= this.size ) return;

    const name = this._getWorkerName ();

    const worker = new Worker ( this.methods, name );

    this.workersReady.add ( worker );

    return worker;

  }

  /* API */

  exec ( method: MethodName, args: Parameters<Methods<MethodName, MethodFunction>[MethodName]> ): Promise<PromiseValue<ReturnType<Methods<MethodName, MethodFunction>[MethodName]>>> {

    const {promise, resolve, reject} = makeNakedPromise<any> ();
    const task = { method, args, promise, resolve, reject };

    this.terminated = false;
    this.tasksReady.add ( task );

    this.tick ();

    this._autoterminate ();

    return promise;

  }

  terminate (): void {

    this.terminated = true;

    clearTimeout ( this.terminateTimeoutId );

    /* RESETTING TASKS */

    const error = new Error ( 'WorkTank terminated!' );

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

  tick (): void {

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

    task.promise.finally ( () => {

      if ( timeoutId ) {

        clearTimeout ( timeoutId );

      }

      if ( this.terminated ) return;

      this.workersBusy.delete ( worker );

      if ( !worker.terminated ) {

        this.workersReady.add ( worker );

      }

      this.tasksBusy.delete ( task );

      this.tick ();

    });

    worker.exec ( task );

  }

};

/* EXPORT */

export default WorkTank;
