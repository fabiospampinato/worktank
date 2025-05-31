
/* IMPORT */

import {describe} from 'fava';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import WorkTank from '../dist/index.js';
import * as METHODS from './worker.js';

/* HELPERS */

const waitIdle = pool => {
  return new Promise ( resolve => {
    const intervalId = setInterval ( () => {
      if ( pool.info ().workers.busy === 0 ) {
        clearInterval ( intervalId );
        resolve ();
      }
    }, 5 );
  });
};

/* MAIN */

//TODO: Add more tests

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

    t.like ( pool.info ().workers, { busy: 0, ready: 0 } );

    await pool.exec ( 'ping' );

    t.like ( pool.info ().workers, { busy: 0, ready: 1 } );

    await pool.exec ( 'ping' );

    t.like ( pool.info ().workers, { busy: 0, ready: 1 } );

    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );
    pool.exec ( 'ping' );

    t.like ( pool.info ().workers, { busy: 3, ready: 0 } );

    await waitIdle ( pool );

    t.like ( pool.info ().workers, { busy: 0, ready: 3 } );

    pool.terminate ();

  });

  it ( 'supports pre-instantiating workers', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: METHODS,
      size: 3,
      warmup: true
    });

    t.like ( pool.info ().workers, { busy: 0, ready: 3 } );

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

      t.true ( error instanceof Error );
      t.true ( error.message.includes ( 'terminated' ) );

      t.like ( pool.info ().workers, { busy: 0, ready: 1 } );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

  it ( 'supports handling and recovering from a worker existing unexpectedly', async t => {

    t.plan ( 4 );

    const pool = new WorkTank ({
      name: 'example',
      methods: pathToFileURL ( path.resolve ( './test/worker.js' ) )
    });

    try {

      await pool.exec ( 'exit', [2] );

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.true ( error.message.includes ( 'closed unexpectedly with exit code 2' ) );

      t.like ( pool.info ().workers, { busy: 0, ready: 1 } );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

});
