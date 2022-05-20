
/* IMPORT */

import {describe} from 'fava';
import path from 'node:path';
import WorkTank from '../dist/index.js';

/* MAIN */

//TODO: Add more tests

describe ( 'WorkTank', it => {

  it ( 'can execute a passed method', async t => {

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

});
