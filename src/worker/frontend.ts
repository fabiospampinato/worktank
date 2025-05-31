
/* IMPORT */

import WorkerShim from 'webworker-shim';
import WorkerBackend from './backend_compiled';
import type {Message} from '../types';

/* MAIN */

class WorkerFrontend {

  /* VARIABLES */

  private worker: Worker;

  /* CONSTRUCTOR */

  constructor ( name: string, bootloader: string, onClose: Function, onMessage: Function ) {

    const backend = WorkerBackend.replace ( '/*! BOOTLOADER_PLACEHOLDER !*/', bootloader );
    const script = `data:text/javascript;charset=utf-8,${encodeURIComponent ( backend )}`;

    this.worker = new WorkerShim ( script, { name, type: 'module' } );

    this.listen ( onClose, onMessage );

  }

  /* API */

  listen = ( onClose: Function, onMessage: Function ): void => {

    this.worker.addEventListener ( 'close', event => onClose ( event['data'] ) );
    this.worker.addEventListener ( 'message', event => onMessage ( event['data'] ) );

  }

  send = ( message: Message ): void => {

    this.worker.postMessage ( message );

  }

  terminate = (): void => {

    this.worker.terminate ();

  }

}

/* EXPORT */

export default WorkerFrontend;
