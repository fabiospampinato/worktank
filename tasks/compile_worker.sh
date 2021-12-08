
# Precompiling the worker backend into a string, which can then be loaded more easily

WORKER=`esbuild src/worker/backend.ts --bundle --minify --target=es2017 --external:"worker_threads"`
WORKER_ESCAPED=`echo $WORKER | sed "s/'/\\\\\\'/g"`
BUNDLE="\n/* COMPILED WORKER */\n\nexport default '$WORKER_ESCAPED';"

echo $BUNDLE > src/worker/backend_compiled.ts
