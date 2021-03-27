# WorkTank

A simple isomorphic library for executing functions inside WebWorkers or Node Threads pools.

## Features

- **Small**: It's about as small as you can make it.
- **Isomorphic**: It transparently uses WebWorkers if they are available, otherwise it uses Node's `worker_threads` module.
- **Dynamic pools**: You can create pools dynamically, just by passing serializable functions to the library at run time, without needing any bundler plugins at all.
- **Electron-ready**: Electron's special renderer process environment is supported out of the box too.
- **TypeScript-ready**: Types come with the library and aren't an afterthought.

## Install

```sh
npm install --save worktank
```

## Usage

First you have to make a worker pool:

```ts
import WorkTank from 'worktank';

const pool = new WorkTank ({
  size: 5, // The maximum number of worker threads to spawn, they will only get spawned if actually needed
  methods: { // An object mapping function names to functions objects to serialize and deserialize into each worker thread, only functions that don't depend on their closure can be serialized
    sum: function ( a: number, b: number ): number {
      const math = this.require ( 'math' ) // Use `this.require` rather than the regular `require` inside functions that need to load a dependency if you are using a bundler, or pre-bundle the functions that get sent to worker threads
      return math.sum ( a + b );
    },
    foo: () => {}, // Another method to pass to worker threads
    bar: () => {} // Another method to pass to worker threads
  }
});
```

Then you call `exec` on the pool, to call the method that you want inside the first available worker:

```ts
const result = await pool.exec (
  'sum', // Name of the method to call in the worker thread
  [10, 5] // Array of arguments to call the method with in the worker thread
);

console.log ( result ); // 15
```

Lastly once you are done you can call `terminate` to end all the worker threads the pool spawned and free up some memory, if you call `exec` on the pool again after having called `terminate` on it the needed worker threads will be spawned up again:

```ts
pool.terminate ();
```

## License

MIT © Fabio Spampinato
