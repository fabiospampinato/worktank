
/* IMPORT */

import WorkerFrontend from '~/worker/frontend';
import type {Message, MessageReady, MessageResult, Methods, Task} from '~/types';

/* MAIN */

class Worker<T extends Methods> {

  /* VARIABLES */

  public busy: boolean;
  public loaded: boolean;
  public terminated: boolean;

  private name: string;
  private methods: string;
  private task?: Task<T>;
  private worker: WorkerFrontend;

  /* CONSTRUCTOR */

  constructor ( methods: string, name: string ) {

    this.busy = false;
    this.loaded = false;
    this.terminated = false;
    this.name = name;
    this.methods = methods;
    this.worker = new WorkerFrontend ( this.methods, this.name, this.onMessage.bind ( this ) );

    this.init ();

  }

  /* EVENTS API */

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

  init (): void {

    this.worker.send ({ type: 'init' });

  }

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
