
/* IMPORT */

import {Message} from '../types';

/* FRONTEND */

const Frontend = (() => {

  const IS_WEBWORKER = ( typeof postMessage === 'function' );

  if ( IS_WEBWORKER ) {

    const worker = globalThis as unknown as Worker; //TSC

    return {
      on: ( event: string, callback: Function ): void => {
        worker.addEventListener ( event, message => {
          callback ( message['data'] );
        });
      },
      send: ( message: Message ): void => {
        worker.postMessage ( message );
      }
    };

  } else {

    const thread = require ( 'worker_threads' ).parentPort;

    return {
      on: ( event: string, callback: Function ): void => {
        thread.on ( event, callback );
      },
      send: ( message: Message ): void => {
        thread.postMessage ( message );
      }
    };

  }

})();

/* BACKEND */

const Backend = {

  /* VARIABLES */

  methods: <Record<string, Function>> {},

  /* API */

  exec: ( method: string, args: any[] ): void => {

    const fn = Backend.methods[method],
          ctx = { require: globalThis.require },
          result = new Promise ( resolve => resolve ( fn.apply ( ctx, args ) ) );

    const onSuccess = ( value: any ): void => {
      try {
        Frontend.send ({ type: 'result', value });
      } catch ( error ) {
        onError ( error );
      }
    };

    const onError = ( error: any ): void => {
      error = ( error instanceof Error ) ? error : ( typeof error === 'string' ? new Error ( error ) : new Error () );
      const {message, name, stack} = error;
      Frontend.send ({ type: 'result', error: {message, name, stack} });
    };

    result.then ( onSuccess, onError );

  },

  init: ( methods: Record<string, string> ): void => {

    Backend.register ( methods );

    Frontend.send ({ type: 'ready' });

  },

  message: ( message: Message ): void => {

    if ( message.type === 'init' ) return Backend.init ( message.methods );

    if ( message.type === 'exec' ) return Backend.exec ( message.method, message.args );

  },

  register: ( methods: Record<string, string> ): void => {

    for ( const method in methods ) {

      const fn = new Function ( `return (${methods[method]})` )();

      Backend.methods[method] = fn;

    }

  }

};

/* INIT */

Frontend.on ( 'message', Backend.message );
