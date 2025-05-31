
/* MAIN */

class WorkerError extends Error {

  /* CONSTRUCTOR */

  constructor ( name: string, message: string ) {

    super ( message );

    this.name = `WorkTankWorkerError (${name})`;
    this.message = message;

  }

}

/* EXPORT */

export default WorkerError;
