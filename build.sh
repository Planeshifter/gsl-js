#!/bin/sh

export EXPORTED_FUNCTIONS=@exported_functions
export DIR="$(pwd)"
export GSL=$DIR/gsl-1.16

export JS_EXPORTS_FLAGS="-s EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}"
export TOTAL_MEMORY=33554432
export LDFLAGS="-s TOTAL_MEMORY=${TOTAL_MEMORY}"

cd $GSL

emconfigure ./configure

emmake make

cd $DIR

emcc -O2 -g3 gsl-1.16/cdf/*.o gsl-1.16/specfunc/*.o gsl-1.16/randist/*.o gsl-1.16/rng/*.o -o "${DIR}/js/output.js" $LDFLAGS $JS_EXPORTS_FLAGS  --post-js wrapper.js

echo "JS build finished"
