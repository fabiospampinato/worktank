
/* MAIN */

const exception = () => {
  throw new Error ( 'Worker exception' );
};

const exit = code => {
  process.exit ( code );
};

const ping = () => {
  return 'pong';
};

const sep = async () => {
  const {sep} = await import ( 'node:path' );
  return sep;
};

const sleep = async ms => {
  return new Promise ( resolve => {
    setTimeout ( resolve, ms );
  });
};

const sum = ( a, b ) => {
  return a + b;
};

const unserializable = () => {
  return () => {};
};

/* EXPORT */

export {exit, exception, ping, sep, sleep, sum, unserializable};
