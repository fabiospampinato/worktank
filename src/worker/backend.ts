
/* IMPORT */

import importFool from 'import-fool-webpack';
import type {Message} from '../types';

/* MAIN */

class WorkerBackend {

  /* VARIABLES */

  private methods: Record<string, Function> = {};

  /* CONSTRUCTOR */

  constructor () {

    addEventListener ( 'message', this.message.bind ( this ) );

  }

  /* API */

  exec ( method: string, args: any[] ): void {

    const fn = this.methods[method];
    const result = new Promise ( resolve => resolve ( fn.apply ( { import: importFool }, args ) ) );

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

  init ( methods: Record<string, string> | string ): void {

    this.register ( methods );

    postMessage ({ type: 'ready' });

  }

  message ( message: Event & { data: Message } ): void {

    if ( message.data.type === 'init' ) return this.init ( message.data.methods );

    if ( message.data.type === 'exec' ) return this.exec ( message.data.method, message.data.args );

  }

  register ( methods: Record<string, string> | string ): void {

    if ( typeof methods === 'string' ) { // Serialized function that returns the methods

      const fns = new Function ( methods )();

      for ( const method in fns ) {

        this.methods[method] = fns[method];

      }

    } else { // Serialized methods map

      for ( const method in methods ) {

        const fn = new Function ( `return (${methods[method]})` )();

        this.methods[method] = fn;

      }

    }

  }

}

/* INIT */

new WorkerBackend ();
