
/* IMPORT */

import {describe} from 'fava';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import WorkTank from '../dist/index.js';

/* MAIN */

//TODO: Add more tests

describe ( 'WorkTank', it => {

  it ( 'can execute passed methods', async t => {

    t.plan ( 3 );

    const pool = new WorkTank ({
      name: 'example',
      methods: {
        sep: async () => {
          const {default: path} = await import ( 'node:path' );
          return path.sep;
        },
        sum: ( a, b ) => {
          return a + b;
        }
      }
    });

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    const sepResult = await pool.exec ( 'sep' );

    t.is ( sepResult, path.sep );

    try {

      await pool.exec ( 'exception' );

    } catch ( error ) {

      t.true ( error instanceof Error );

    }

    pool.terminate ();

  });

  it ( 'can execute imported methods', async t => {

    t.plan ( 3 );

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

    }

    pool.terminate ();

  });

  it ( 'can return a proxy to the pooled methods', async t => {

    t.plan ( 3 );

    const pool = new WorkTank ({
      name: 'example',
      methods: {
        sep: async () => {
          const {default: path} = await import ( 'node:path' );
          return path.sep;
        },
        sum: ( a, b ) => {
          return a + b;
        },
        exception: () => {
          throw new Error ();
        }
      }
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

    }

    pool.terminate ();

  });

});
