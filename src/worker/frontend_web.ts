
/* IMPORT */

import WorkerBackend from './backend_compiled';
import WorkerAbstract from './frontend_abstract';

/* WORKER WEB */

class WorkerWeb extends WorkerAbstract<Worker> {

  /* VARIABLES */

  workerBlob: Blob;
  workerBlobUrl: string;

  /* CONSTRUCTOR */

  constructor ( listener: Function, name: string ) {

    super ();

    this.workerBlob = new Blob ( [WorkerBackend], { type: 'text/javascript' } );
    this.workerBlobUrl = URL.createObjectURL ( this.workerBlob );
    this.worker = new Worker ( this.workerBlobUrl, { name } );

    this.listen ( listener );

  }

  /* API */

  listen ( listener: Function ): void {

    this.worker.addEventListener ( 'message', event => listener ( event.data ) );

  }

  terminate (): void {

    super.terminate ();

    URL.revokeObjectURL ( this.workerBlobUrl );

  }

}

/* EXPORT */

export default WorkerWeb;
