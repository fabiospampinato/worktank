
/* IMPORT */

import {FN, Message, MessageReady, MessageResult, MethodsSerialized, Task} from '../types';
import WorkerNode from './frontend_node';
import WorkerWeb from './frontend_web';

/* WORKER */

class Worker <MethodName extends string, MethodFunction extends FN> {

  /* VARIABLES */

  busy: boolean;
  loaded: boolean;
  terminated: boolean;
  methods: MethodsSerialized<MethodName> | string;
  task?: Task<MethodName, MethodFunction>;
  worker: WorkerWeb | WorkerNode;

  /* CONSTRUCTOR */

  constructor ( methods: MethodsSerialized<MethodName> | string ) {

    this.busy = false;
    this.loaded = false;
    this.terminated = false;
    this.methods = methods;

    const supportsWebWorkers = ( typeof window === 'object' ) && ( typeof window.Worker === 'function' ),
          WorkerFrontend = supportsWebWorkers ? WorkerWeb : WorkerNode;

    this.worker = new WorkerFrontend ( this.onMessage.bind ( this ) );

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

    if ( !task ) throw new Error ( 'WorkTank Worker: missing task' );

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

    this.worker.send ({ type: 'init', methods: this.methods });

  }

  exec ( task: Task<MethodName, MethodFunction> ): void {

    if ( this.terminated || this.task || this.busy ) throw new Error ( 'WorkTank Worker: already busy or terminated' );

    this.task = task;

    this.tick ();

  }

  terminate () {

    this.terminated = true;

    this.worker.terminate ();

  }

  tick (): void {

    if ( this.terminated || !this.loaded || !this.task || this.busy ) return;

    const {method, args} = this.task;

    this.busy = true;

    this.worker.send ({ type: 'exec', method, args });

  }

}

/* EXPORT */

export default Worker;
