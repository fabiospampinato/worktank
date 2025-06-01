
/* IMPORT */

import type {Env, Message, Methods} from '../types';

/* MAIN */

globalThis.WorkTankWorkerBackend = (() => {

  /* VARIABLES */

  const {addEventListener, postMessage} = globalThis;
  const registry: Methods = {};

  /* API */

  const castError = ( error: unknown ): Error => {

    if ( error instanceof Error ) return error;

    if ( typeof error === 'string' ) return new Error ( error );

    return new Error ( 'Unknown error' );

  };

  const log = ( value: string ): void => {

    try {

      postMessage ({ type: 'log', value });

    } catch ( error ) {

      console.error ( 'Failed to post log message', error );

    }

  };

  const once = <T> ( fn: (() => T) ): (() => T) => {

    let called = false;
    let result: T;

    return (): T => {

      if ( !called ) {

        called = true;
        result = fn ();

      }

      return result;

    };

  };

  const onMessage = ( message: Event & { data?: Message } ): void => {

    if ( message.data?.type === 'exec' ) {

      onMessageExec ( message.data.method, message.data.args );

    } else {

      log ( `Unknown message type: ${message.data?.type}` );

    }

  };

  const onMessageExec = ( method: string, args: unknown[] ): void => {

    const fn = registry[method];
    const result = new Promise ( resolve => resolve ( fn.apply ( undefined, args ) ) );

    result.then ( onResultSuccess, onResultError );

  };

  const onResultError = ( error: unknown ): void => {

    const {name, message, stack} = castError ( error );

    try {

      postMessage ({ type: 'result', error: { name, message, stack } });

    } catch {

      onResultError ( 'Failed to post error message' );

    }

  };

  const onResultSuccess = ( value: unknown ): void => {

    try {

      postMessage ({ type: 'result', value });

    } catch ( error ) {

      onResultError ( error );

    }

  };

  const ready = once ((): void => {

    addEventListener ( 'message', onMessage );

    postMessage ({ type: 'ready' });

  });

  const registerEnv = ( env: Env ): void => {

    globalThis.process ||= {};
    globalThis.process.env = {
      ...globalThis.process.env,
      ...env
    };

  };

  const registerMethods = ( methods: Methods ): void => {

    for ( const name in methods ) {

      const method = methods[name];

      if ( typeof method === 'function' ) {

        registry[name] = method;

      } else {

        log ( `Method "${name}" is not a function and will be ignored` );

      }

    }

  };

  /* RETURN */

  return { ready, registerEnv, registerMethods };

})();

/*! BOOTLOADER_PLACEHOLDER !*/
