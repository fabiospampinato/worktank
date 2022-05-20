
# Precompiling the worker backend into a string, which can then be loaded more easily

WORKER=`esbuild src/worker/backend.ts --bundle --minify --format=esm --target=es2018`
WORKER_ESCAPED=`echo $WORKER | sed "s/'/\\\\\\'/g"`
BUNDLE="export default '$WORKER_ESCAPED';"

echo $BUNDLE > src/worker/backend_compiled.ts
