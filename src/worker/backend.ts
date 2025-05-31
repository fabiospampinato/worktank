
/* IMPORT */

import type {Message} from '../types';

/* MAIN */

globalThis['WorkTankWorkerBackend'] = new class {

  /* VARIABLES */

  private methods: Record<string, Function> = {};

  /* CONSTRUCTOR */

  constructor () {

    addEventListener ( 'message', this.message.bind ( this ) );

  }

  /* API */

  exec ( method: string, args: any[] ): void {

    const fn = this.methods[method];
    const result = new Promise ( resolve => resolve ( fn.apply ( undefined, args ) ) );

    const onSuccess = ( value: any ): void => {
      try {
        postMessage ({ type: 'result', value });
      } catch ( error ) {
        onError ( error );
      }
    };

    const onError = ( error: any ): void => {
      error = ( error instanceof Error ) ? error : ( typeof error === 'string' ? new Error ( error ) : new Error () );
      const {message, name, stack} = error;
      postMessage ({ type: 'result', error: {message, name, stack} });
    };

    result.then ( onSuccess, onError );

  }

  message ( message: Event & { data: Message } ): void {

    if ( message.data.type === 'exec' ) {

      return this.exec ( message.data.method, message.data.args );

    }

  }

  ready (): void {

    postMessage ({ type: 'ready' });

  }

  register ( method: string, fn: Function ): void {

    this.methods[method] = fn;

  }

}

/* PLACEHOLDERS */

globalThis.process ||= {};
globalThis.process.env = {
  ...globalThis.process.env,
  ...globalThis.process.ENV_PLACEHOLDER
};

/*! METHODS_PLACEHOLDER !*/
