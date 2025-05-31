
/* IMPORT */

import {describe} from 'fava';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import WorkTank from '../dist/index.js';
import * as METHODS from './worker.js';

/* MAIN */

//TODO: Add more tests

describe ( 'WorkTank', it => {

  it ( 'can execute serializable methods', async t => {

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

  it ( 'can execute imported methods', async t => {

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

  it ( 'can execute methods via a proxy object', async t => {

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

  it ( 'can pass custom environment variables to workers', async t => {

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

  it ( 'can handle and recover from a worker existing unexpectedly', async t => {

    t.plan ( 3 );

    const pool = new WorkTank ({
      name: 'example',
      methods: pathToFileURL ( path.resolve ( './test/worker.js' ) )
    });

    try {

      await pool.exec ( 'exit', [2] );

    } catch ( error ) {

      t.true ( error instanceof Error );
      t.true ( error.message.includes ( 'closed unexpectedly with exit code 2' ) );

    }

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    pool.terminate ();

  });

});
