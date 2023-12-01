# WorkTank

A simple isomorphic library for executing functions inside WebWorkers or Node Threads pools.

## Features

- **Small**: It's about as small as you can make it.
- **Isomorphic**: It transparently uses WebWorkers if they are available, otherwise it uses Node's `worker_threads` module.
- **Dynamic pools**: You can create pools dynamically, just by passing serializable functions to the library at run time, without needing any bundler plugins at all.
- **Static pools**: You can create pools at build-time too, if the functions you need to send to workers require bundling, just by using the official Vite [plugin](https://github.com/fabiospampinato/worktank-vite-plugin).
- **Electron-ready**: Electron's special renderer process environment is supported out of the box too.
- **TypeScript-ready**: Types come with the library and aren't an afterthought.

## Install

```sh
npm install --save worktank
```

## Usage

There are two ways to make worker pools, one is dynamic and can be done entirely at runtime, the other one is static and requires a bundler plugin.

### Dynamic Pools

Dynamic pools can be created at runtime and require no bundler plugin at all, for them to work the functions to execute in worker threads must be serializable just by calling `#toString` on them, basically they must not depend on their closure.

First of all you have to make a worker pool:

```ts
import WorkTank from 'worktank';

const pool = new WorkTank ({
  name: 'example', // Name of the worker pool, useful for debugging purposes
  size: 5, // The maximum number of worker threads to spawn, they will only get spawned if actually needed
  timeout: 10000, // The maximum number of milliseconds to wait for the result from the worker, if exceeded the worker is terminated and the execution promise rejects
  warmup: true, // Pre-spawn all the workers, so that they could be closer to being ready when needed
  autoterminate: 60000, // The interval of milliseconds at which to check if the pool can be automatically terminated, to free up resources, workers will be spawned up again if needed
  methods: { // An object mapping function names to functions objects to serialize and deserialize into each worker thread, only functions that don't depend on their closure can be serialized
    sum: function ( a: number, b: number ): Promise<number> {
      const {default: math} = await import ( 'math' );
      return math.sum ( a + b );
    },
    foo: () => {}, // Another method to pass to worker threads
    bar: () => {} // Another method to pass to worker threads
  }
});
```

Then you can call `exec` on the pool instance, to call the method that you want inside the first available worker:

```ts
const result = await pool.exec (
  'sum', // Name of the method to call in the worker thread
  [10, 5] // Array of arguments to call the method with in the worker thread
);

console.log ( result ); // 15
```

Lastly once you are done with the pool you can call `terminate` on it to end all the worker threads the pool spawned and free up some memory, if you call `exec` on the pool again after having called `terminate` on it the needed worker threads will be spawned up again:

```ts
pool.terminate ();
```

That's it! Super easy, isn't it?

### Static Pools

Static pools require a bundler plugin to make, the plugin allows you to move to worker pools functions that depend on their closure, for example functions that might need to import some dependency that needs to be bundled too.

The following plugins are currently available:

- **Esbuild**: [worktank-esbuild-plugin](https://github.com/fabiospampinato/worktank-esbuild-plugin), the official plugin for Esbuild.
- **Vite**: [worktank-vite-plugin](https://github.com/fabiospampinato/worktank-vite-plugin), the official plugin for Vite.

Read their documentation to learn how to use them, but TL;DR: it's mostly just a matter of adding a couple of lines of configuration for your bundlers.

## License

MIT © Fabio Spampinato
