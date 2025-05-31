
/* IMPORT */

import WorkerFrontend from './frontend';
import type {Message, MessageReady, MessageResult, Methods, Env, Task} from '../types';

/* MAIN */

class Worker<T extends Methods> {

  /* VARIABLES */

  public busy: boolean;
  public loaded: boolean;
  public terminated: boolean;

  private env: Env;
  private name: string;
  private methods: string;
  private task?: Task<T>;
  private worker: WorkerFrontend;

  /* CONSTRUCTOR */

  constructor ( env: Env, methods: string, name: string ) {

    this.busy = false;
    this.loaded = false;
    this.terminated = false;
    this.env = env;
    this.name = name;
    this.methods = methods;
    this.worker = this._getWorker ();

  }

  /* PRIVATE API */

  private _getWorker (): WorkerFrontend {

    return new WorkerFrontend ( this.env, this.methods, this.name, this.onClose.bind ( this ), this.onMessage.bind ( this ) );

  }

  /* EVENTS API */

  onClose ( code: number ): void {

    if ( this.terminated ) return;

    this.worker.terminate ();
    this.worker = this._getWorker ();
    this.loaded = false;

    const {task} = this;

    this.busy = false;
    this.task = undefined;

    if ( task ) {

      const error = new Error ( `WorkTank Worker (${this.name}): closed unexpectedly with exit code ${code}` );

      return task.reject ( error );

    }

  }

  onMessage ( message: Message ): void {

    if ( message.type === 'ready' ) return this.onMessageReady ( message );

    if ( message.type === 'result' ) return this.onMessageResult ( message );

  }

  onMessageReady ( message: MessageReady ): void {

    this.loaded = true;

    this.tick ();

  }

  onMessageResult ( message: MessageResult ): void {

    const {task} = this;

    if ( !task ) throw new Error ( `WorkTank Worker (${this.name}): missing task` );

    this.busy = false;
    this.task = undefined;

    if ( 'value' in message ) { // Success

      return task.resolve ( message.value );

    } else { // Error

      const error = Object.assign ( new Error (), message.error );

      return task.reject ( error );

    }

  }

  /* API */

  exec ( task: Task<T> ): void {

    if ( this.terminated || this.task || this.busy ) throw new Error ( `WorkTank Worker (${this.name}): already busy or terminated` );

    this.task = task;

    this.tick ();

  }

  terminate (): void {

    this.terminated = true;

    this.worker.terminate ();

    if ( this.task ) {

      const error = new Error ( `WorkTank Worker (${this.name}): terminated` );

      this.task.reject ( error );

    }

  }

  tick (): void {

    if ( this.terminated || !this.loaded || !this.task || this.busy ) return;

    const {method, args} = this.task;

    if ( typeof method !== 'string' ) throw new Error ( 'Unsupported method name' );

    this.busy = true;

    this.worker.send ({ type: 'exec', method, args });

  }

}

/* EXPORT */

export default Worker;
