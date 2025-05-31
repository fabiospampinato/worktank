
/* MAIN */

const exception = () => {
  throw new Error ( 'Worker exception' );
};

const exit = code => {
  process.exit ( code );
};

const sep = async () => {
  const {sep} = await import ( 'node:path' );
  return sep;
};

const sum = ( a, b ) => {
  return a + b;
};

/* EXPORT */

export {exit, exception, sep, sum};
