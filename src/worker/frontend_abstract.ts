
/* IMPORT */

import {Message} from '../types';

/* WORKER ABSTRACT */

abstract class WorkerAbstract <T extends Worker> {

  /* VARIABLES */

  worker: T;

  /* API */

  abstract listen ( listener: Function ): void;

  send ( message: Message ): void {

    this.worker.postMessage ( message );

  }

  terminate (): void {

    this.worker.terminate ();

  }

}

/* EXPORT */

export default WorkerAbstract;
