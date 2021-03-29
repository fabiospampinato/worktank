
/* IMPORT */

import WorkerBackend from './backend_compiled';
import WorkerAbstract from './frontend_abstract';

/* WORKER NODE */

class WorkerNode extends WorkerAbstract<any> {

  /* CONSTRUCTOR */

  constructor ( listener: Function, name: string ) {

    super ();

    const {Worker} = require ( 'worker_threads' );

    this.worker = new Worker ( WorkerBackend, { eval: true } );

    this.listen ( listener );

  }

  /* API */

  listen ( listener: Function ): void {

    this.worker.on ( 'message', listener );

  }

}

/* EXPORT */

export default WorkerNode;
