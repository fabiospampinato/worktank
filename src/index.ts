
/* IMPORT */

import makeNakedPromise from 'promise-make-naked';
import {FN, PromiseValue, Methods, MethodsSerialized, Options, Task} from './types';
import Worker from './worker';

/* WORKPOOL */

class WorkPool <MethodName extends string, MethodFunction extends FN> {

  /* VARIABLES */

  terminated: boolean;
  size: number;
  methods: Methods<MethodName, MethodFunction>;
  methodsSerialized: MethodsSerialized<MethodName>;
  tasksBusy: Set<Task<MethodName, MethodFunction>>;
  tasksReady: Set<Task<MethodName, MethodFunction>>;
  workersBusy: Set<Worker<MethodName, MethodFunction>>;
  workersReady: Set<Worker<MethodName, MethodFunction>>;

  /* CONSTRUCTOR */

  constructor ( options: Options<MethodName, MethodFunction> ) {

    this.terminated = false;
    this.size = options.size ?? 1;
    this.methods = options.methods;
    this.methodsSerialized = this._getMethodsSerialized ();
    this.tasksBusy = new Set ();
    this.tasksReady = new Set ();
    this.workersBusy = new Set ();
    this.workersReady = new Set ();

  }

  /* HELPERS */

  _getMethodsSerialized (): MethodsSerialized<MethodName> {

    const methods: MethodsSerialized<string> = {};

    for ( const method in this.methods ) {

      const serialized = this.methods[method].toString ();

      methods[method] = serialized;

    }

    return methods;

  }

  _getTaskReady (): Task<MethodName, MethodFunction> | undefined {

    for ( const task of this.tasksReady ) return task;

  }

  _getWorkerReady (): Worker<MethodName, MethodFunction> | undefined {

    for ( const worker of this.workersReady ) return worker;

    if ( this.workersBusy.size >= this.size ) return;

    const worker = new Worker ( this.methodsSerialized );

    this.workersReady.add ( worker );

    return worker;

  }

  /* API */

  exec ( method: MethodName, args: Parameters<Methods<MethodName, MethodFunction>[MethodName]> ): Promise<PromiseValue<ReturnType<Methods<MethodName, MethodFunction>[MethodName]>>> {

    const {promise, resolve, reject} = makeNakedPromise<any> (),
          task = { method, args, promise, resolve, reject };

    this.terminated = false;
    this.tasksReady.add ( task );

    this.tick ();

    return promise;

  }

  terminate (): void {

    this.terminated = true;

    /* RESETTING TASKS */

    const error = new Error ( 'WorkPool terminated!' );

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

    task.promise.finally ( () => {

      if ( this.terminated ) return;

      this.workersBusy.delete ( worker );
      this.workersReady.add ( worker );

      this.tasksBusy.delete ( task );

      this.tick ();

    });

    worker.exec ( task );

  }

};

/* EXPORT */

export default WorkPool;