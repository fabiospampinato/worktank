
/* IMPORT */

import path from 'node:path';

/* MAIN */

const sep = async () => {
  return path.sep;
};

const sum = ( a, b ) => {
  return a + b;
};

const exception = () => {
  throw new Error ();
};

/* EXPORT */

export {sep, sum, exception};
