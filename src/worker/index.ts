
/* IMPORT */

import WorkerFrontend from './frontend';
import type {Message, MessageLog, MessageReady, MessageResult, Methods, Task} from '../types';

/* MAIN */

class Worker<T extends Methods> {

  /* VARIABLES */

  public busy: boolean;
  public ready: boolean;
  public terminated: boolean;

  private name: string;
  private bootloader: string;
  private task?: Task<T>;
  private worker: WorkerFrontend;

  /* CONSTRUCTOR */

  constructor ( name: string, bootloader: string ) {

    this.busy = false;
    this.ready = false;
    this.terminated = false;

    this.name = name;
    this.bootloader = bootloader;
    this.worker = this._getWorker ();

  }

  /* PRIVATE API */

  private _getWorker (): WorkerFrontend {

    return new WorkerFrontend ( this.name, this.bootloader, this.onClose, this.onMessage );

  }

  /* EVENTS API */

  private onClose = ( code: number ): void => {

    if ( this.terminated ) return;

    this.worker.terminate ();
    this.worker = this._getWorker ();
    this.ready = false;

    const {task} = this;

    this.busy = false;
    this.task = undefined;

    if ( task ) {

      const error = new Error ( `WorkTank Worker (${this.name}): closed unexpectedly with exit code ${code}` );

      task.reject ( error );

    }

  }

  private onMessage = ( message: Message ): void => {

    if ( message.type === 'log' ) {

      this.onMessageLog ( message );

    } else if ( message.type === 'ready' ) {

      this.onMessageReady ( message );

    } else if ( message.type === 'result' ) {

      this.onMessageResult ( message );

    }

  }

  private onMessageLog = ( message: MessageLog ): void => {

    console.log ( message.value );

  }

  private onMessageReady = ( message: MessageReady ): void => {

    this.ready = true;

    this.tick ();

  }

  private onMessageResult = ( message: MessageResult ): void => {

    const {task} = this;

    if ( !task ) throw new Error ( `WorkTank Worker (${this.name}): missing task` );

    this.busy = false;
    this.task = undefined;

    if ( 'value' in message ) { // Success

      task.resolve ( message.value );

    } else { // Error

      const error = Object.assign ( new Error (), message.error );

      task.reject ( error );

    }

  }

  /* API */

  exec = ( task: Task<T> ): void => {

    if ( this.terminated || this.task || this.busy ) throw new Error ( `WorkTank Worker (${this.name}): already busy or terminated` );

    this.task = task;

    this.tick ();

  }

  terminate = (): void => {

    if ( this.terminated ) return;

    this.terminated = true;

    this.worker.terminate ();

    if ( this.task ) {

      const error = new Error ( `WorkTank Worker (${this.name}): terminated` );

      this.task.reject ( error );

    }

  }

  tick = (): void => {

    if ( this.terminated || !this.ready || !this.task || this.busy ) return;

    const {method, args} = this.task;

    this.busy = true;

    this.worker.send ({ type: 'exec', method, args });

  }

}

/* EXPORT */

export default Worker;
