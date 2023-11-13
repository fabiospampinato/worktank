
/* IMPORT */

import {describe} from 'fava';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import WorkTank from '../dist/index.js';

/* MAIN */

//TODO: Add more tests

describe ( 'WorkTank', it => {

  it ( 'can execute passed methods', async t => {

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

    pool.terminate ();

  });

  it ( 'can execute imported methods', async t => {

    const pool = new WorkTank ({
      name: 'example',
      methods: pathToFileURL ( path.resolve ( './test/worker.js' ) )
    });

    const sumResult = await pool.exec ( 'sum', [10, 20] );

    t.is ( sumResult, 30 );

    const sepResult = await pool.exec ( 'sep' );

    t.is ( sepResult, path.sep );

    pool.terminate ();

  });

});
