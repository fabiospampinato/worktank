
/* IMPORT */

import {describe} from 'fava';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import WorkTank from '../dist/index.js';
import WorkerError from '../dist/worker/error.js';
import * as METHODS from './worker.js';

/* HELPERS */

const waitIdle = pool => {
  return new Promise ( resolve => {
    const intervalId = setInterval ( () => {
      if ( pool.stats ().workers.busy === 0 ) {
        clearInterval ( intervalId );
        resolve ();
      }
    }, 5 );
  });
};

/* MAIN */

describe ( 'WorkTank', it => {

  it ( 'supports executing serializable methods', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    const sepResult = await pool.exec ( 'sep' );

    t.is ( sepResult, path.sep );

    try {

      await pool.exec ( 'exception' );

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.is ( error.message, 'Worker exception' );

    }

    pool.terminate ();

  });

  it ( 'supports executing imported methods', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: pathToFileURL ( path.resolve ( './test/worker.js' ) )
    });

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    const sepResult = await pool.exec ( 'sep' );

    t.is ( sepResult, path.sep );

    try {

      await pool.exec ( 'exception' );

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.is ( error.message, 'Worker exception' );

    }

    pool.terminate ();

  });

  it ( 'supports executing methods via a proxy object', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
    });

    const proxy = pool.proxy ();

    const sumResult = await proxy.sum ( 10, 20 );

    t.is ( sumResult, 30 );

    const sepResult = await proxy.sep ();

    t.is ( sepResult, path.sep );

    try {

      await proxy.exception ();

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.is ( error.message, 'Worker exception' );

    }

    pool.terminate ();

  });

  it ( 'supports instantiating workers when necessary', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      size: 3
    });

    t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    await pool.exec ( 'ping' );

    t.like ( pool.stats ().workers, { busy: 0, idle: 1 } );

    await pool.exec ( 'ping' );

    t.like ( pool.stats ().workers, { busy: 0, idle: 1 } );

    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );

    t.like ( pool.stats ().workers, { busy: 3, idle: 0 } );

    await waitIdle ( pool );

    t.like ( pool.stats ().workers, { busy: 0, idle: 3 } );

    pool.terminate ();

  });

  it ( 'supports pre-instantiating workers', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      size: 3,
      warmup: true
    });

    t.like ( pool.stats ().workers, { busy: 0, idle: 3 } );

    pool.terminate ();

  });

  it ( 'supports resizing, with pre-instantiation', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      size: 3,
      warmup: true
    });

    t.like ( pool.stats ().workers, { busy: 0, idle: 3 } );

    pool.resize ( 5 );

    t.like ( pool.stats ().workers, { busy: 0, idle: 5 } );

    pool.resize ( 2 );

    t.like ( pool.stats ().workers, { busy: 0, idle: 2 } );

    pool.terminate ();

  });

  it ( 'supports resizing, with pending tasks', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      size: 3,
    });

    t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );

    t.like ( pool.stats ().workers, { busy: 3, idle: 0 } );

    pool.resize ( 5 );

    t.like ( pool.stats ().workers, { busy: 5, idle: 0 } );

    await waitIdle ( pool );

    t.like ( pool.stats ().workers, { busy: 0, idle: 5 } );

    pool.terminate ();

  });

  it ( 'supports passing custom environment variables to workers', async t => {

    const pool = new WorkTank ({
      name: 'example',
      env: {
        CUSTOM_ENV: '123'
      },
      methods: {
        getEnv: () => {
          return globalThis.process.env.CUSTOM_ENV;
        }
      }
    });

    const value = await pool.exec ( 'getEnv' );

    t.is ( value, '123' );

    pool.terminate ();

  });

  it ( 'supports terminating workers automatically for inactivity', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      size: 3,
      autoterminate: 100
    });

    t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    pool.exec ( 'sleep', [300] );

    await pool.exec ( 'ping' );

    t.like ( pool.stats ().workers, { busy: 1, idle: 1 } );

    await t.wait ( 200 );

    t.like ( pool.stats ().workers, { busy: 1, idle: 0 } );

    await t.wait ( 300 );

    t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    pool.terminate ();

  });

  it ( 'supports timing out executions and recovering from that', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      timeout: 100
    });

    try {

      await pool.exec ( 'sleep', [1000] );

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Terminated' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

  it ( 'supports exec-level abort signals, abortable', async t => {

    t.plan ( 3 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    try {

      const controller = new AbortController ();
      const {signal} = controller;

      const result = pool.exec ( 'sleep', [1000], { signal } );

      await t.wait ( 100 );

      controller.abort ();

      await result;

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Terminated' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

    pool.terminate ();

  });

  it ( 'supports exec-level abort signals, aborted', async t => {

    t.plan ( 3 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    try {

      const controller = new AbortController ();
      const {signal} = controller;

      controller.abort ();

      await pool.exec ( 'sleep', [1000], { signal } );

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Terminated' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

    pool.terminate ();

  });

  it ( 'supports exec-level timeouts', async t => {

    t.plan ( 3 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    try {

      await pool.exec ( 'sleep', [1000], { timeout: 100 } );

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Terminated' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

    pool.terminate ();

  });

  it ( 'supports exec-level transfer objects', async t => {

    t.plan ( 2 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    const buffer = new ArrayBuffer ();
    const transfer = [buffer];

    await pool.exec ( 'identity', [buffer],  );

    buffer.slice ();

    await pool.exec ( 'identity', [buffer], { transfer } );

    try {

      buffer.slice ();

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.is ( error.message, 'Cannot perform ArrayBuffer.prototype.slice on a detached ArrayBuffer' );

    }

    pool.terminate ();

  });

  it ( 'supports handling and recovering from a worker exiting unexpectedly', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: pathToFileURL ( path.resolve ( './test/worker.js' ) )
    });

    try {

      await pool.exec ( 'exit', [2] );

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Exited with exit code 2' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

  it ( 'supports handling and recovering from receiving an unserializable value', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    try {

      await pool.exec ( 'unserializable', [] );

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.is ( error.message, '() => {} could not be cloned.' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 1 } );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

  it ( 'supports handling and recovering from sending an unserializable value', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    try {

      await pool.exec ( 'unserializable', [() => {}] );

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Failed to send message' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 1 } );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

  it ( 'supports handling the pool getting terminated while executing', async t => {

    t.plan ( 6 );

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS
    });

    const result1 = pool.exec ( 'sleep', [1000] );
    const result2 = pool.exec ( 'sleep', [1000] );

    pool.terminate ();

    try {

      await result1;

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Terminated' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

    try {

      await result2;

    } catch ( error ) {

      t.true ( error instanceof WorkerError );
      t.is ( error.message, 'Terminated' );

      t.like ( pool.stats ().workers, { busy: 0, idle: 0 } );

    }

  });

});
