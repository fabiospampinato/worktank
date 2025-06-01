# WorkTank

A simple isomorphic library for executing functions inside WebWorkers or Node Threads pools.

## Features

- **Small**: It's about as small as you can make it.
- **Isomorphic**: It uses WebWorkers if they are available, otherwise it uses Node's `worker_threads` module, automatically.
- **Dynamic pools**: You can create pools dynamically, just by passing serializable functions to the library at run time directly.
- **Static pools**: You can create pools statically, just by giving the library a URL from where to load the code.
- **Transparent pools**: You can also create transparent pools, where it looks like you are just importing async functions from a `*.worker.js` module, but those functions will actually be executed inside worker threads. This requires one of the provided bundler plugins.

## Install

```sh
npm install worktank
```

## Usage

Let's first check what the API looks like, and then how to create the various types of pools.

### API

```ts
import WorkTank from 'worktank';

// Let's crate a worker pool

const pool = new WorkTank ({
  pool: { // Pool-level options
    name: 'example', // The name of the worker pool, useful for debugging purposes
    size: 5 // The maximum number of worker threads to spawn, by default they will only get spawned when needed
  },
  worker: { // Worker-level options
    autoAbort: 10_000, // The maximum number of milliseconds allowed for each result before terminating execution, disabled by default
    autoInstantiate: true, // Automatically pre-instantiate worker threads before they are needed, filling up the pool, disabled by default
    autoTerminate: 60_000, // The maximum number of milliseconds of idleness allowed before terminating a worker, disabled by default
    env: { CUSTOM_ENV: '123' }, // An object containing custom environment variables to pass to the worker threads, empty by default
    methods: { sum: ... } // An object containing the methods that each worker will support, we'll see how to create this object later
  }
});

// Let's execute one of the supported methods via "exec"
// This is the more powerful way to execute a method

const result = await pool.exec (
  'sum', // The name of the method to call in the worker thread
  [10, 5], // The array of arguments to call the method with in the worker thread
  { // Optional execution options
    signal: myAbortSignal, // An optional AbortSignal to manually abort execution with
    timeout: 10_000, // An optional execution-level timeout that overrides the "autoAbort" worker-level option
    transfer: [] // An optional array of transferable objects to transfer to the worker thread
  }
);

// Let's execute a supported method via "proxy"
// This is the more limited way to execute a method, but more convenient

const proxy = pool.proxy (); // Get a proxy object to the supported methods
const result = await proxy.sum ( 10, 5 ); // Just call the method as if it was a normal function

// Let's resize the pool
// This changes the size of the pool dynamically, appropriately spawning missing workers or eventually terminating excess idle workers

pool.resize ( 10 );

// Let's get some statistics about the pool

const stats = pool.stats (); // => { tasks: { busy: 0, idle: 0, total: 0 }, workers: { busy: 0, idle: 10, total: 0 } }

// Let's terminate the pool
// This causes all current and pending executions to be aborted

pool.terminate ();
```

### Dynamic Pools

Dynamic pools can be created at runtime and require no bundler plugin or URL at all, for them to work the functions to execute in worker threads must be serializable just by calling `#toString` on them, basically they must not depend on their closure.

```ts
import WorkTank from 'worktank';

// This is what the "methods" option looks like for dynamic pools

const pool = new WorkTank ({
  worker: {
    methods: {
      sum: ( a: number, b: number ) => {
        return a + b;
      },
      doSomething: async ( ...args ) => {
        const {fn} = await import ( 'some-module' );
        return fn ( ...args );
      }
    }
  }
});
```

### Static Pools

Static pools just import methods from another module, given a URL to it.

```ts
import WorkTank from 'worktank';

// This is what the "methods" option looks like for static pools

const pool = new WorkTank ({
  worker: {
    methods: 'https://example.com/path/to/worker.js', // An static absolute URL to the worker module
    methods: new URL ( './worker.js', import.meta.url ), // A dynamically constructed absolute URL to the worker module
  }
});
```

### Transparent Pools

Transparent pools are similar to what you get by calling `.proxy()` on a pool instance, but they bump the convenience up a notch.

This functionality requires a bundler plugin to work, check out the supported plugins below:

- **Esbuild**: [worktank-esbuild-plugin](https://github.com/fabiospampinato/worktank-esbuild-plugin), the official plugin for Esbuild.
- **Vite**: [worktank-vite-plugin](https://github.com/fabiospampinato/worktank-vite-plugin), the official plugin for Vite.

## License

MIT © Fabio Spampinato
