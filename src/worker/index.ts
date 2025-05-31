
/* IMPORT */

import WorkerError from './error';
import WorkerFrontend from './frontend';
import type {Message, MessageLog, MessageReady, MessageResult, Methods, Task} from '../types';

/* MAIN */

class Worker<T extends Methods> {

  /* VARIABLES */

  public busy: boolean;
  public ready: boolean;
  public terminated: boolean;
  public timestamp: number;

  private name: string;
  private bootloader: string;
  private task?: Task<T>;
  private worker: WorkerFrontend;

  /* CONSTRUCTOR */

  constructor ( name: string, bootloader: string ) {

    this.busy = false;
    this.ready = false;
    this.terminated = false;
    this.timestamp = Date.now ();

    this.name = name;
    this.bootloader = bootloader;
    this.worker = new WorkerFrontend ( this.name, this.bootloader, this.onClose, this.onMessage );

  }

  /* EVENTS API */

  private onClose = ( code: number ): void => {

    if ( this.terminated ) return;

    this.terminated = true;

    this.worker.terminate ();

    this.reject ( new WorkerError ( this.name, `Exited with exit code ${code}` ) );

  }

  private onMessage = ( message: Message ): void => {

    if ( this.terminated ) return;

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

    if ( 'value' in message ) { // Success

      this.resolve ( message.value );

    } else { // Error

      const error = Object.assign ( new Error (), message.error );

      this.reject ( error );

    }

  }

  /* API */

  exec = ( task: Task<T> ): void => {

    if ( this.terminated ) throw new WorkerError ( this.name, 'Terminated' );

    if ( this.task || this.busy ) throw new WorkerError ( this.name, 'Busy' );

    this.task = task;

    this.tick ();

  }

  reject = ( error: Error ): void => {

    const {task} = this;

    if ( !task ) return;

    this.busy = false;
    this.task = undefined;
    this.timestamp = Date.now ();

    task.reject ( error );

  }

  resolve = ( value: any ): void => {

    const {task} = this;

    if ( !task ) return;

    this.busy = false;
    this.task = undefined;
    this.timestamp = Date.now ();

    task.resolve ( value );

  }

  terminate = (): void => {

    if ( this.terminated ) return;

    this.terminated = true;

    this.worker.terminate ();

    this.reject ( new WorkerError ( this.name, 'Terminated' ) );

  }

  tick = (): void => {

    if ( this.terminated || !this.ready || !this.task || this.busy ) return;

    this.busy = true;

    try {

      const {method, args} = this.task;

      this.worker.send ({ type: 'exec', method, args });

    } catch {

      this.reject ( new WorkerError ( this.name, 'Failed to send message' ) );

    }

  }

}

/* EXPORT */

export default Worker;
