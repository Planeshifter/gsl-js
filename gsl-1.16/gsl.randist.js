// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          (((codePoint - 0x10000) / 0x400)|0) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var stack = 0;
  var JSfuncs = {
    'stackSave' : function() {
      stack = Runtime.stackSave();
    },
    'stackRestore' : function() {
      Runtime.stackRestore(stack);
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) JSfuncs['stackRestore']();
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;


function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;


function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var final = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    final = parse();
  } catch(e) {
    final += '?';
  }
  if (final.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return final;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[(((buffer)+(i))>>0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 3136;
  /* global initializers */ __ATINIT__.push();
  

/* memory initializer */ allocate([85,115,97,103,101,58,32,103,115,108,45,114,97,110,100,105,115,116,32,115,101,101,100,32,110,32,68,73,83,84,32,112,97,114,97,109,49,32,112,97,114,97,109,50,32,46,46,46,10,71,101,110,101,114,97,116,101,115,32,110,32,115,97,109,112,108,101,115,32,102,114,111,109,32,116,104,101,32,100,105,115,116,114,105,98,117,116,105,111,110,32,68,73,83,84,32,119,105,116,104,32,112,97,114,97,109,101,116,101,114,115,32,112,97,114,97,109,49,44,10,112,97,114,97,109,50,44,32,101,116,99,46,32,86,97,108,105,100,32,100,105,115,116,114,105,98,117,116,105,111,110,115,32,97,114,101,44,10,10,0,32,32,98,101,116,97,10,32,32,98,105,110,111,109,105,97,108,10,32,32,98,105,118,97,114,105,97,116,101,45,103,97,117,115,115,105,97,110,10,32,32,99,97,117,99,104,121,10,32,32,99,104,105,115,113,10,32,32,100,105,114,45,50,100,10,32,32,100,105,114,45,51,100,10,32,32,100,105,114,45,110,100,10,32,32,101,114,108,97,110,103,10,32,32,101,120,112,111,110,101,110,116,105,97,108,10,32,32,101,120,112,112,111,119,10,32,32,102,100,105,115,116,10,32,32,102,108,97,116,10,32,32,103,97,109,109,97,10,32,32,103,97,117,115,115,105,97,110,45,116,97,105,108,10,32,32,103,97,117,115,115,105,97,110,10,32,32,103,101,111,109,101,116,114,105,99,10,32,32,103,117,109,98,101,108,49,10,32,32,103,117,109,98,101,108,50,10,32,32,104,121,112,101,114,103,101,111,109,101,116,114,105,99,10,32,32,108,97,112,108,97,99,101,10,32,32,108,97,110,100,97,117,10,32,32,108,101,118,121,10,32,32,108,101,118,121,45,115,107,101,119,10,32,32,108,111,103,97,114,105,116,104,109,105,99,10,32,32,108,111,103,105,115,116,105,99,10,32,32,108,111,103,110,111,114,109,97,108,10,32,32,110,101,103,97,116,105,118,101,45,98,105,110,111,109,105,97,108,10,32,32,112,97,114,101,116,111,10,32,32,112,97,115,99,97,108,10,32,32,112,111,105,115,115,111,110,10,32,32,114,97,121,108,101,105,103,104,45,116,97,105,108,10,32,32,114,97,121,108,101,105,103,104,10,32,32,116,100,105,115,116,10,32,32,117,103,97,117,115,115,105,97,110,45,116,97,105,108,10,32,32,117,103,97,117,115,115,105,97,110,10,32,32,119,101,105,98,117,108,108,10,0,0,0,0,0,111,118,101,114,114,105,100,105,110,103,32,71,83,76,95,82,78,71,95,83,69,69,68,32,119,105,116,104,32,99,111,109,109,97,110,100,32,108,105,110,101,32,118,97,108,117,101,44,32,115,101,101,100,32,61,32,37,108,100,10,0,0,0,0,98,101,114,110,111,117,108,108,105,0,0,0,0,0,0,0,112,32,61,32,112,114,111,98,97,98,105,108,105,116,121,32,111,102,32,115,117,99,99,101,115,115,0,0,0,0,0,0,112,0,0,0,0,0,0,0,37,100,10,0,0,0,0,0,98,101,116,97,0,0,0,0,97,44,98,32,61,32,115,104,97,112,101,32,112,97,114,97,109,101,116,101,114,115,0,0,97,0,0,0,0,0,0,0,98,0,0,0,0,0,0,0,37,103,10,0,0,0,0,0,98,105,110,111,109,105,97,108,0,0,0,0,0,0,0,0,112,32,61,32,112,114,111,98,97,98,105,108,105,116,121,44,32,78,32,61,32,110,117,109,98,101,114,32,111,102,32,116,114,105,97,108,115,0,0,0,78,0,0,0,0,0,0,0,99,97,117,99,104,121,0,0,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,0,0,0,0,99,104,105,115,113,0,0,0,110,117,32,61,32,100,101,103,114,101,101,115,32,111,102,32,102,114,101,101,100,111,109,0,110,117,0,0,0,0,0,0,101,114,108,97,110,103,0,0,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,44,32,98,32,61,32,111,114,100,101,114,0,0,101,120,112,111,110,101,110,116,105,97,108,0,0,0,0,0,109,117,32,61,32,109,101,97,110,32,118,97,108,117,101,0,109,117,0,0,0,0,0,0,101,120,112,112,111,119,0,0,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,44,32,98,32,61,32,112,111,119,101,114,32,40,49,61,101,120,112,111,110,101,110,116,105,97,108,44,32,50,61,103,97,117,115,115,105,97,110,41,0,0,0,0,0,0,102,100,105,115,116,0,0,0,110,117,49,44,32,110,117,50,32,61,32,100,101,103,114,101,101,115,32,111,102,32,102,114,101,101,100,111,109,32,112,97,114,97,109,101,116,101,114,115,0,0,0,0,0,0,0,0,110,117,49,0,0,0,0,0,110,117,50,0,0,0,0,0,102,108,97,116,0,0,0,0,97,32,61,32,108,111,119,101,114,32,108,105,109,105,116,44,32,98,32,61,32,117,112,112,101,114,32,108,105,109,105,116,0,0,0,0,0,0,0,0,103,97,109,109,97,0,0,0,97,32,61,32,111,114,100,101,114,44,32,98,32,61,32,115,99,97,108,101,0,0,0,0,103,97,117,115,115,105,97,110,0,0,0,0,0,0,0,0,115,105,103,109,97,32,61,32,115,116,97,110,100,97,114,100,32,100,101,118,105,97,116,105,111,110,0,0,0,0,0,0,115,105,103,109,97,0,0,0,103,97,117,115,115,105,97,110,45,116,97,105,108,0,0,0,97,32,61,32,108,111,119,101,114,32,108,105,109,105,116,44,32,115,105,103,109,97,32,61,32,115,116,97,110,100,97,114,100,32,100,101,118,105,97,116,105,111,110,0,0,0,0,0,117,103,97,117,115,115,105,97,110,0,0,0,0,0,0,0,117,110,105,116,32,103,97,117,115,115,105,97,110,44,32,110,111,32,112,97,114,97,109,101,116,101,114,115,32,114,101,113,117,105,114,101,100,0,0,0,117,103,97,117,115,115,105,97,110,45,116,97,105,108,0,0,97,32,61,32,108,111,119,101,114,32,108,105,109,105,116,0,98,105,118,97,114,105,97,116,101,45,103,97,117,115,115,105,97,110,0,0,0,0,0,0,115,105,103,109,97,120,32,61,32,120,32,115,116,100,46,100,101,118,46,44,32,115,105,103,109,97,121,32,61,32,121,32,115,116,100,46,100,101,118,46,44,32,114,104,111,32,61,32,99,111,114,114,101,108,97,116,105,111,110,0,0,0,0,0,115,105,103,109,97,120,0,0,115,105,103,109,97,121,0,0,114,104,111,0,0,0,0,0,37,103,32,37,103,10,0,0,100,105,114,45,50,100,0,0,100,105,114,45,51,100,0,0,37,103,32,37,103,32,37,103,10,0,0,0,0,0,0,0,100,105,114,45,110,100,0,0,110,49,32,61,32,110,117,109,98,101,114,32,111,102,32,100,105,109,101,110,115,105,111,110,115,32,111,102,32,104,121,112,101,114,115,112,104,101,114,101,0,0,0,0,0,0,0,0,110,49,0,0,0,0,0,0,37,103,0,0,0,0,0,0,103,101,111,109,101,116,114,105,99,0,0,0,0,0,0,0,112,32,61,32,98,101,114,110,111,117,108,108,105,32,116,114,105,97,108,32,112,114,111,98,97,98,105,108,105,116,121,32,111,102,32,115,117,99,99,101,115,115,0,0,0,0,0,0,103,117,109,98,101,108,49,0,97,32,61,32,111,114,100,101,114,44,32,98,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,0,103,117,109,98,101,108,50,0,104,121,112,101,114,103,101,111,109,101,116,114,105,99,0,0,110,49,32,61,32,116,97,103,103,101,100,32,112,111,112,117,108,97,116,105,111,110,44,32,110,50,32,61,32,117,110,116,97,103,103,101,100,32,112,111,112,117,108,97,116,105,111,110,44,32,116,32,61,32,110,117,109,98,101,114,32,111,102,32,116,114,105,97,108,115,0,0,110,50,0,0,0,0,0,0,116,0,0,0,0,0,0,0,108,97,112,108,97,99,101,0,108,97,110,100,97,117,0,0,110,111,32,97,114,103,117,109,101,110,116,115,32,114,101,113,117,105,114,101,100,0,0,0,108,101,118,121,0,0,0,0,99,32,61,32,115,99,97,108,101,44,32,97,32,61,32,112,111,119,101,114,32,40,49,61,99,97,117,99,104,121,44,32,50,61,103,97,117,115,115,105,97,110,41,0,0,0,0,0,99,0,0,0,0,0,0,0,108,101,118,121,45,115,107,101,119,0,0,0,0,0,0,0,99,32,61,32,115,99,97,108,101,44,32,97,32,61,32,112,111,119,101,114,32,40,49,61,99,97,117,99,104,121,44,32,50,61,103,97,117,115,115,105,97,110,41,44,32,98,32,61,32,115,107,101,119,0,0,0,108,111,103,97,114,105,116,104,109,105,99,0,0,0,0,0,112,32,61,32,112,114,111,98,97,98,105,108,105,116,121,0,108,111,103,105,115,116,105,99,0,0,0,0,0,0,0,0,108,111,103,110,111,114,109,97,108,0,0,0,0,0,0,0,122,101,116,97,32,61,32,108,111,99,97,116,105,111,110,32,112,97,114,97,109,101,116,101,114,44,32,115,105,103,109,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,0,0,0,0,0,122,101,116,97,0,0,0,0,110,101,103,97,116,105,118,101,45,98,105,110,111,109,105,97,108,0,0,0,0,0,0,0,112,32,61,32,112,114,111,98,97,98,105,108,105,116,121,44,32,97,32,61,32,111,114,100,101,114,0,0,0,0,0,0,112,97,114,101,116,111,0,0,97,32,61,32,112,111,119,101,114,44,32,98,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,0,112,97,115,99,97,108,0,0,112,32,61,32,112,114,111,98,97,98,105,108,105,116,121,44,32,110,32,61,32,111,114,100,101,114,32,40,105,110,116,101,103,101,114,41,0,0,0,0,112,111,105,115,115,111,110,0,109,117,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,0,0,0,114,97,121,108,101,105,103,104,0,0,0,0,0,0,0,0,115,105,103,109,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,114,97,121,108,101,105,103,104,45,116,97,105,108,0,0,0,97,32,61,32,108,111,119,101,114,32,108,105,109,105,116,44,32,115,105,103,109,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,0,0,0,0,0,0,0,0,116,100,105,115,116,0,0,0,119,101,105,98,117,108,108,0,97,32,61,32,115,99,97,108,101,32,112,97,114,97,109,101,116,101,114,44,32,98,32,61,32,101,120,112,111,110,101,110,116,0,0,0,0,0,0,0,69,114,114,111,114,58,32,117,110,114,101,99,111,103,110,105,122,101,100,32,100,105,115,116,114,105,98,117,116,105,111,110,58,32,37,115,10,0,0,0,69,114,114,111,114,58,32,97,114,103,117,109,101,110,116,115,32,115,104,111,117,108,100,32,98,101,32,37,115,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,105,110,102,105,110,105,116,121,0,0,0,0,0,0,0,0,110,97,110,0,0,0,0,0,95,112,137,0,255,9,47,15,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  function _gsl_ran_hypergeometric() {
  Module['printErr']('missing function: gsl_ran_hypergeometric'); abort(-1);
  }

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _gsl_ran_poisson() {
  Module['printErr']('missing function: gsl_ran_poisson'); abort(-1);
  }

   
  Module["_memset"] = _memset;

  function _gsl_ran_beta() {
  Module['printErr']('missing function: gsl_ran_beta'); abort(-1);
  }

  function _gsl_ran_gaussian() {
  Module['printErr']('missing function: gsl_ran_gaussian'); abort(-1);
  }

  function _gsl_ran_exponential() {
  Module['printErr']('missing function: gsl_ran_exponential'); abort(-1);
  }

  function _gsl_ran_landau() {
  Module['printErr']('missing function: gsl_ran_landau'); abort(-1);
  }

  function _abort() {
      Module['abort']();
    }

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        // If Module['websocket'] has already been defined (e.g. for configuring
        // the subprotocol/url) use that, if not initialise it to a new object.
        Module['websocket'] = (Module['websocket'] && 
                               ('object' === typeof Module['websocket'])) ? Module['websocket'] : {};
  
        // Add the Event registration mechanism to the exported websocket configuration
        // object so we can register network callbacks from native JavaScript too.
        // For more documentation see system/include/emscripten/emscripten.h
        Module['websocket']._callbacks = {};
        Module['websocket']['on'] = function(event, callback) {
  	    if ('function' === typeof callback) {
  		  this._callbacks[event] = callback;
          }
  	    return this;
        };
  
        Module['websocket'].emit = function(event, param) {
  	    if ('function' === typeof this._callbacks[event]) {
  		  this._callbacks[event].call(this, param);
          }
        };
  
        // If debug is enabled register simple default logging callbacks for each Event.
  
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          error: null, // Used in getsockopt for SOL_SOCKET/SO_ERROR test
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                var parts = addr.split('/');
                url = url + parts[0] + ":" + port + "/" + parts.slice(1).join('/');
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The regex trims the string (removes spaces at the beginning and end, then splits the string by
              // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
              subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
              // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
              var opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
  
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
  
            Module['websocket'].emit('open', sock.stream.fd);
  
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
            Module['websocket'].emit('message', sock.stream.fd);
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('close', function() {
              Module['websocket'].emit('close', sock.stream.fd);
            });
            peer.socket.on('error', function(error) {
              // Although the ws library may pass errors that may be more descriptive than
              // ECONNREFUSED they are not necessarily the expected error code e.g. 
              // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
              // is still probably the most useful thing to do.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onclose = function() {
              Module['websocket'].emit('close', sock.stream.fd);
            };
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
            peer.socket.onerror = function(error) {
              // The WebSocket spec only allows a 'simple event' to be thrown on error,
              // so we only really know as much as ECONNREFUSED.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          Module['websocket'].emit('listen', sock.stream.fd); // Send Event with listen fd.
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
              Module['websocket'].emit('connection', newsock.stream.fd);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
              Module['websocket'].emit('connection', sock.stream.fd);
            }
          });
          sock.server.on('closed', function() {
            Module['websocket'].emit('close', sock.stream.fd);
            sock.server = null;
          });
          sock.server.on('error', function(error) {
            // Although the ws library may pass errors that may be more descriptive than
            // ECONNREFUSED they are not necessarily the expected error code e.g. 
            // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
            // is still probably the most useful thing to do. This error shouldn't
            // occur in a well written app as errors should get trapped in the compiled
            // app's own getaddrinfo call.
            sock.error = ERRNO_CODES.EHOSTUNREACH; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
            Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'EHOSTUNREACH: Host is unreachable']);
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) return -1;
      return stream.fd;
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return (bytesWritten / size)|0;
      }
    }
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[((textIndex)>>0)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)>>0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)>>0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)>>0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)>>0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)>>0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)>>0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[((i)>>0)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }

  function _gsl_ran_levy() {
  Module['printErr']('missing function: gsl_ran_levy'); abort(-1);
  }

  function _printf(format, varargs) {
      // int printf(const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var stdout = HEAP32[((_stdout)>>2)];
      return _fprintf(stdout, format, varargs);
    }

  function _gsl_ran_tdist() {
  Module['printErr']('missing function: gsl_ran_tdist'); abort(-1);
  }

  function _gsl_ran_ugaussian_tail() {
  Module['printErr']('missing function: gsl_ran_ugaussian_tail'); abort(-1);
  }

  function _gsl_ran_bernoulli() {
  Module['printErr']('missing function: gsl_ran_bernoulli'); abort(-1);
  }

  function _gsl_ran_laplace() {
  Module['printErr']('missing function: gsl_ran_laplace'); abort(-1);
  }

  function _gsl_ran_logarithmic() {
  Module['printErr']('missing function: gsl_ran_logarithmic'); abort(-1);
  }

   
  Module["_i64Add"] = _i64Add;

  var _fabs=Math_abs;

  function _gsl_ran_binomial() {
  Module['printErr']('missing function: gsl_ran_binomial'); abort(-1);
  }


  function _gsl_ran_dir_3d() {
  Module['printErr']('missing function: gsl_ran_dir_3d'); abort(-1);
  }

  function _gsl_ran_gaussian_tail() {
  Module['printErr']('missing function: gsl_ran_gaussian_tail'); abort(-1);
  }

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
      else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
      Browser.mainLoop.scheduler();
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _gsl_ran_flat() {
  Module['printErr']('missing function: gsl_ran_flat'); abort(-1);
  }

  function _gsl_ran_bivariate_gaussian() {
  Module['printErr']('missing function: gsl_ran_bivariate_gaussian'); abort(-1);
  }

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  function _gsl_rng_env_setup() {
  Module['printErr']('missing function: gsl_rng_env_setup'); abort(-1);
  }

  function _gsl_ran_pascal() {
  Module['printErr']('missing function: gsl_ran_pascal'); abort(-1);
  }

  
  function _fmod(x, y) {
      return x % y;
    }function _fmodl() {
  return _fmod.apply(null, arguments)
  }

  function _gsl_ran_chisq() {
  Module['printErr']('missing function: gsl_ran_chisq'); abort(-1);
  }

  function _gsl_ran_levy_skew() {
  Module['printErr']('missing function: gsl_ran_levy_skew'); abort(-1);
  }

  function _gsl_ran_rayleigh() {
  Module['printErr']('missing function: gsl_ran_rayleigh'); abort(-1);
  }

  function _gsl_ran_pareto() {
  Module['printErr']('missing function: gsl_ran_pareto'); abort(-1);
  }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _gsl_ran_erlang() {
  Module['printErr']('missing function: gsl_ran_erlang'); abort(-1);
  }

  function _gsl_ran_gamma() {
  Module['printErr']('missing function: gsl_ran_gamma'); abort(-1);
  }

  function _gsl_ran_exppow() {
  Module['printErr']('missing function: gsl_ran_exppow'); abort(-1);
  }

  function _gsl_ran_dir_nd() {
  Module['printErr']('missing function: gsl_ran_dir_nd'); abort(-1);
  }

  function _gsl_ran_rayleigh_tail() {
  Module['printErr']('missing function: gsl_ran_rayleigh_tail'); abort(-1);
  }

  function _gsl_ran_cauchy() {
  Module['printErr']('missing function: gsl_ran_cauchy'); abort(-1);
  }

  function _gsl_ran_gumbel2() {
  Module['printErr']('missing function: gsl_ran_gumbel2'); abort(-1);
  }

  function _gsl_ran_lognormal() {
  Module['printErr']('missing function: gsl_ran_lognormal'); abort(-1);
  }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _gsl_ran_logistic() {
  Module['printErr']('missing function: gsl_ran_logistic'); abort(-1);
  }

  function _gsl_ran_ugaussian() {
  Module['printErr']('missing function: gsl_ran_ugaussian'); abort(-1);
  }

  function _gsl_ran_negative_binomial() {
  Module['printErr']('missing function: gsl_ran_negative_binomial'); abort(-1);
  }

  
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)>>0)]=chr;
      var fd = _fileno(stream);
      var ret = _write(fd, _fputc.ret, 1);
      if (ret == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return -1;
      } else {
        return chr;
      }
    }function _putchar(c) {
      // int putchar(int c);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/putchar.html
      return _fputc(c, HEAP32[((_stdout)>>2)]);
    }

  function _gsl_ran_dir_2d() {
  Module['printErr']('missing function: gsl_ran_dir_2d'); abort(-1);
  }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _gsl_ran_weibull() {
  Module['printErr']('missing function: gsl_ran_weibull'); abort(-1);
  }

  function _gsl_ran_gumbel1() {
  Module['printErr']('missing function: gsl_ran_gumbel1'); abort(-1);
  }

  function ___errno_location() {
      return ___errno_state;
    }

  var _BItoD=true;

   
  Module["_i64Subtract"] = _i64Subtract;

  
  function _copysign(a, b) {
      return __reallyNegative(a) === __reallyNegative(b) ? a : -a;
    }function _copysignl() {
  return _copysign.apply(null, arguments)
  }

  function _gsl_rng_alloc() {
  Module['printErr']('missing function: gsl_rng_alloc'); abort(-1);
  }

  function _gsl_ran_fdist() {
  Module['printErr']('missing function: gsl_ran_fdist'); abort(-1);
  }

  function _gsl_ran_geometric() {
  Module['printErr']('missing function: gsl_ran_geometric'); abort(-1);
  }

  function _gsl_rng_default() {
  Module['printErr']('missing function: gsl_rng_default'); abort(-1);
  }

  function _gsl_rng_default_seed() {
  Module['printErr']('missing function: gsl_rng_default_seed'); abort(-1);
  }

___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "nullFunc_iiii": nullFunc_iiii, "invoke_iiii": invoke_iiii, "_fabs": _fabs, "_copysignl": _copysignl, "_gsl_ran_levy_skew": _gsl_ran_levy_skew, "_send": _send, "_gsl_ran_dir_3d": _gsl_ran_dir_3d, "_gsl_ran_rayleigh_tail": _gsl_ran_rayleigh_tail, "_abort": _abort, "_fmod": _fmod, "_gsl_ran_hypergeometric": _gsl_ran_hypergeometric, "_gsl_ran_gaussian": _gsl_ran_gaussian, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_gsl_ran_ugaussian_tail": _gsl_ran_ugaussian_tail, "_gsl_ran_chisq": _gsl_ran_chisq, "_gsl_ran_lognormal": _gsl_ran_lognormal, "_gsl_ran_pascal": _gsl_ran_pascal, "_gsl_ran_rayleigh": _gsl_ran_rayleigh, "_fwrite": _fwrite, "_gsl_ran_geometric": _gsl_ran_geometric, "_fflush": _fflush, "_gsl_ran_landau": _gsl_ran_landau, "_pwrite": _pwrite, "_gsl_ran_tdist": _gsl_ran_tdist, "_gsl_ran_fdist": _gsl_ran_fdist, "__reallyNegative": __reallyNegative, "_sbrk": _sbrk, "_gsl_rng_alloc": _gsl_rng_alloc, "_gsl_ran_erlang": _gsl_ran_erlang, "_gsl_ran_exppow": _gsl_ran_exppow, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_fileno": _fileno, "_gsl_ran_cauchy": _gsl_ran_cauchy, "__exit": __exit, "_gsl_rng_env_setup": _gsl_rng_env_setup, "___setErrNo": ___setErrNo, "_gsl_ran_logarithmic": _gsl_ran_logarithmic, "_putchar": _putchar, "_gsl_ran_flat": _gsl_ran_flat, "_gsl_ran_binomial": _gsl_ran_binomial, "_gsl_ran_levy": _gsl_ran_levy, "_gsl_ran_bivariate_gaussian": _gsl_ran_bivariate_gaussian, "_printf": _printf, "_gsl_ran_bernoulli": _gsl_ran_bernoulli, "_write": _write, "_gsl_ran_beta": _gsl_ran_beta, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_exit": _exit, "___errno_location": ___errno_location, "_gsl_ran_dir_nd": _gsl_ran_dir_nd, "_gsl_ran_poisson": _gsl_ran_poisson, "_copysign": _copysign, "_gsl_ran_negative_binomial": _gsl_ran_negative_binomial, "_mkport": _mkport, "_sysconf": _sysconf, "_gsl_ran_laplace": _gsl_ran_laplace, "_fputc": _fputc, "_gsl_ran_pareto": _gsl_ran_pareto, "_gsl_ran_logistic": _gsl_ran_logistic, "_gsl_ran_gaussian_tail": _gsl_ran_gaussian_tail, "_time": _time, "_fprintf": _fprintf, "_gsl_ran_gumbel2": _gsl_ran_gumbel2, "_gsl_ran_dir_2d": _gsl_ran_dir_2d, "__formatString": __formatString, "_gsl_ran_gumbel1": _gsl_ran_gumbel1, "_gsl_ran_exponential": _gsl_ran_exponential, "_gsl_ran_ugaussian": _gsl_ran_ugaussian, "_gsl_ran_gamma": _gsl_ran_gamma, "_gsl_ran_weibull": _gsl_ran_weibull, "_fmodl": _fmodl, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "_gsl_rng_default": _gsl_rng_default, "_gsl_rng_default_seed": _gsl_rng_default_seed, "_stderr": _stderr };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;
  var ctlz_i8=env.ctlz_i8|0;
  var _gsl_rng_default=env._gsl_rng_default|0;
  var _gsl_rng_default_seed=env._gsl_rng_default_seed|0;
  var _stderr=env._stderr|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var nullFunc_iiii=env.nullFunc_iiii;
  var invoke_iiii=env.invoke_iiii;
  var _fabs=env._fabs;
  var _copysignl=env._copysignl;
  var _gsl_ran_levy_skew=env._gsl_ran_levy_skew;
  var _send=env._send;
  var _gsl_ran_dir_3d=env._gsl_ran_dir_3d;
  var _gsl_ran_rayleigh_tail=env._gsl_ran_rayleigh_tail;
  var _abort=env._abort;
  var _fmod=env._fmod;
  var _gsl_ran_hypergeometric=env._gsl_ran_hypergeometric;
  var _gsl_ran_gaussian=env._gsl_ran_gaussian;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _gsl_ran_ugaussian_tail=env._gsl_ran_ugaussian_tail;
  var _gsl_ran_chisq=env._gsl_ran_chisq;
  var _gsl_ran_lognormal=env._gsl_ran_lognormal;
  var _gsl_ran_pascal=env._gsl_ran_pascal;
  var _gsl_ran_rayleigh=env._gsl_ran_rayleigh;
  var _fwrite=env._fwrite;
  var _gsl_ran_geometric=env._gsl_ran_geometric;
  var _fflush=env._fflush;
  var _gsl_ran_landau=env._gsl_ran_landau;
  var _pwrite=env._pwrite;
  var _gsl_ran_tdist=env._gsl_ran_tdist;
  var _gsl_ran_fdist=env._gsl_ran_fdist;
  var __reallyNegative=env.__reallyNegative;
  var _sbrk=env._sbrk;
  var _gsl_rng_alloc=env._gsl_rng_alloc;
  var _gsl_ran_erlang=env._gsl_ran_erlang;
  var _gsl_ran_exppow=env._gsl_ran_exppow;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _fileno=env._fileno;
  var _gsl_ran_cauchy=env._gsl_ran_cauchy;
  var __exit=env.__exit;
  var _gsl_rng_env_setup=env._gsl_rng_env_setup;
  var ___setErrNo=env.___setErrNo;
  var _gsl_ran_logarithmic=env._gsl_ran_logarithmic;
  var _putchar=env._putchar;
  var _gsl_ran_flat=env._gsl_ran_flat;
  var _gsl_ran_binomial=env._gsl_ran_binomial;
  var _gsl_ran_levy=env._gsl_ran_levy;
  var _gsl_ran_bivariate_gaussian=env._gsl_ran_bivariate_gaussian;
  var _printf=env._printf;
  var _gsl_ran_bernoulli=env._gsl_ran_bernoulli;
  var _write=env._write;
  var _gsl_ran_beta=env._gsl_ran_beta;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _exit=env._exit;
  var ___errno_location=env.___errno_location;
  var _gsl_ran_dir_nd=env._gsl_ran_dir_nd;
  var _gsl_ran_poisson=env._gsl_ran_poisson;
  var _copysign=env._copysign;
  var _gsl_ran_negative_binomial=env._gsl_ran_negative_binomial;
  var _mkport=env._mkport;
  var _sysconf=env._sysconf;
  var _gsl_ran_laplace=env._gsl_ran_laplace;
  var _fputc=env._fputc;
  var _gsl_ran_pareto=env._gsl_ran_pareto;
  var _gsl_ran_logistic=env._gsl_ran_logistic;
  var _gsl_ran_gaussian_tail=env._gsl_ran_gaussian_tail;
  var _time=env._time;
  var _fprintf=env._fprintf;
  var _gsl_ran_gumbel2=env._gsl_ran_gumbel2;
  var _gsl_ran_dir_2d=env._gsl_ran_dir_2d;
  var __formatString=env.__formatString;
  var _gsl_ran_gumbel1=env._gsl_ran_gumbel1;
  var _gsl_ran_exponential=env._gsl_ran_exponential;
  var _gsl_ran_ugaussian=env._gsl_ran_ugaussian;
  var _gsl_ran_gamma=env._gsl_ran_gamma;
  var _gsl_ran_weibull=env._gsl_ran_weibull;
  var _fmodl=env._fmodl;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _main($argc,$argv) {
 $argc = $argc|0;
 $argv = $argv|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0.0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0.0, $1014 = 0.0;
 var $1015 = 0.0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0.0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0.0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0.0, $133 = 0.0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0.0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0.0, $154 = 0.0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0.0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0.0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0.0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0.0, $205 = 0.0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0.0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0.0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0.0, $234 = 0.0, $235 = 0.0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0.0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0.0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0.0, $264 = 0.0, $265 = 0.0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0.0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0.0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0.0, $294 = 0.0, $295 = 0.0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0.0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0.0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0.0, $324 = 0.0, $325 = 0.0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0.0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0.0, $346 = 0.0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0.0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0.0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0.0, $375 = 0.0, $376 = 0.0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0.0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0.0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0.0, $409 = 0.0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0.0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0.0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0.0, $439 = 0, $44 = 0.0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0.0, $446 = 0.0, $447 = 0.0, $448 = 0.0, $449 = 0.0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0.0, $46 = 0, $460 = 0.0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0.0, $471 = 0.0, $472 = 0.0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0.0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0.0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0.0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0.0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0.0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0.0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0.0, $558 = 0.0, $559 = 0.0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0.0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0.0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0.0, $588 = 0.0, $589 = 0.0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0;
 var $639 = 0, $64 = 0, $640 = 0, $641 = 0.0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0.0, $649 = 0.0, $65 = 0.0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0;
 var $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0.0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0.0;
 var $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0.0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0.0, $69 = 0, $690 = 0.0, $691 = 0.0, $692 = 0;
 var $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0.0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0;
 var $710 = 0, $711 = 0, $712 = 0.0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0.0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0.0, $728 = 0.0;
 var $729 = 0.0, $73 = 0.0, $730 = 0.0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0.0, $744 = 0, $745 = 0, $746 = 0;
 var $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0.0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0.0;
 var $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0.0, $772 = 0.0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0;
 var $783 = 0, $784 = 0, $785 = 0.0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0.0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0.0;
 var $800 = 0.0, $801 = 0.0, $802 = 0.0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0.0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0.0, $816 = 0, $817 = 0, $818 = 0;
 var $819 = 0, $82 = 0.0, $820 = 0, $821 = 0, $822 = 0, $823 = 0.0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0.0, $831 = 0.0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0;
 var $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0.0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0.0, $854 = 0;
 var $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0.0, $861 = 0.0, $862 = 0.0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0;
 var $873 = 0, $874 = 0, $875 = 0.0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0.0;
 var $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0.0, $906 = 0, $907 = 0, $908 = 0;
 var $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0.0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0.0;
 var $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0.0, $934 = 0.0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0;
 var $945 = 0, $946 = 0, $947 = 0.0, $948 = 0, $949 = 0, $95 = 0.0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0.0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0.0;
 var $963 = 0.0, $964 = 0.0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0.0, $978 = 0, $979 = 0, $98 = 0, $980 = 0;
 var $981 = 0, $982 = 0, $983 = 0, $984 = 0.0, $985 = 0.0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0.0, $999 = 0;
 var $N = 0, $a = 0.0, $b = 0.0, $c = 0.0, $i = 0, $j = 0, $mu = 0.0, $n = 0, $n1 = 0, $n2 = 0, $name = 0, $nu = 0.0, $nu1 = 0.0, $nu2 = 0.0, $p = 0.0, $r = 0, $rho = 0.0, $seed = 0, $sigma = 0.0, $sigmax = 0.0;
 var $sigmay = 0.0, $t = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer102 = 0, $vararg_buffer105 = 0, $vararg_buffer108 = 0, $vararg_buffer11 = 0, $vararg_buffer111 = 0, $vararg_buffer114 = 0, $vararg_buffer117 = 0, $vararg_buffer120 = 0, $vararg_buffer123 = 0, $vararg_buffer14 = 0, $vararg_buffer17 = 0, $vararg_buffer20 = 0, $vararg_buffer23 = 0, $vararg_buffer26 = 0, $vararg_buffer29 = 0, $vararg_buffer3 = 0;
 var $vararg_buffer32 = 0, $vararg_buffer35 = 0, $vararg_buffer38 = 0, $vararg_buffer41 = 0, $vararg_buffer44 = 0, $vararg_buffer47 = 0, $vararg_buffer5 = 0, $vararg_buffer50 = 0, $vararg_buffer54 = 0, $vararg_buffer58 = 0, $vararg_buffer63 = 0, $vararg_buffer66 = 0, $vararg_buffer69 = 0, $vararg_buffer72 = 0, $vararg_buffer75 = 0, $vararg_buffer78 = 0, $vararg_buffer8 = 0, $vararg_buffer81 = 0, $vararg_buffer84 = 0, $vararg_buffer87 = 0;
 var $vararg_buffer90 = 0, $vararg_buffer93 = 0, $vararg_buffer96 = 0, $vararg_buffer99 = 0, $vararg_ptr53 = 0, $vararg_ptr57 = 0, $vararg_ptr61 = 0, $vararg_ptr62 = 0, $x = 0, $xarr = 0, $y = 0, $z = 0, $zeta = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 560|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer123 = sp + 488|0;
 $vararg_buffer120 = sp + 480|0;
 $vararg_buffer117 = sp + 472|0;
 $vararg_buffer114 = sp + 464|0;
 $vararg_buffer111 = sp + 456|0;
 $vararg_buffer108 = sp + 448|0;
 $vararg_buffer105 = sp + 440|0;
 $vararg_buffer102 = sp + 432|0;
 $vararg_buffer99 = sp + 424|0;
 $vararg_buffer96 = sp + 416|0;
 $vararg_buffer93 = sp + 408|0;
 $vararg_buffer90 = sp + 400|0;
 $vararg_buffer87 = sp + 392|0;
 $vararg_buffer84 = sp + 384|0;
 $vararg_buffer81 = sp + 376|0;
 $vararg_buffer78 = sp + 368|0;
 $vararg_buffer75 = sp + 360|0;
 $vararg_buffer72 = sp + 352|0;
 $vararg_buffer69 = sp + 344|0;
 $vararg_buffer66 = sp + 336|0;
 $vararg_buffer63 = sp + 328|0;
 $vararg_buffer58 = sp + 304|0;
 $vararg_buffer54 = sp + 288|0;
 $vararg_buffer50 = sp + 272|0;
 $vararg_buffer47 = sp + 264|0;
 $vararg_buffer44 = sp + 256|0;
 $vararg_buffer41 = sp + 248|0;
 $vararg_buffer38 = sp + 240|0;
 $vararg_buffer35 = sp + 232|0;
 $vararg_buffer32 = sp + 224|0;
 $vararg_buffer29 = sp + 216|0;
 $vararg_buffer26 = sp + 208|0;
 $vararg_buffer23 = sp + 200|0;
 $vararg_buffer20 = sp + 192|0;
 $vararg_buffer17 = sp + 184|0;
 $vararg_buffer14 = sp + 176|0;
 $vararg_buffer11 = sp + 168|0;
 $vararg_buffer8 = sp + 160|0;
 $vararg_buffer5 = sp + 152|0;
 $vararg_buffer3 = sp + 144|0;
 $vararg_buffer1 = sp + 136|0;
 $vararg_buffer = sp + 128|0;
 $x = sp + 16|0;
 $y = sp + 8|0;
 $z = sp;
 $0 = 0;
 $1 = $argc;
 $2 = $argv;
 $n = 0;
 $mu = 0.0;
 $nu = 0.0;
 $nu1 = 0.0;
 $nu2 = 0.0;
 $sigma = 0.0;
 $a = 0.0;
 $b = 0.0;
 $c = 0.0;
 $zeta = 0.0;
 $sigmax = 0.0;
 $sigmay = 0.0;
 $rho = 0.0;
 $p = 0.0;
 HEAPF64[$x>>3] = 0.0;
 HEAPF64[$y>>3] = 0.0;
 HEAPF64[$z>>3] = 0.0;
 $N = 0;
 $t = 0;
 $n1 = 0;
 $n2 = 0;
 $seed = 0;
 $3 = $1;
 $4 = ($3|0)<(4);
 if ($4) {
  (_printf((8|0),($vararg_buffer|0))|0);
  (_printf((168|0),($vararg_buffer1|0))|0);
  _exit(0);
  // unreachable;
 }
 $5 = $2;
 $6 = (($5) + 4|0);
 $2 = $6;
 $7 = $2;
 $8 = HEAP32[$7>>2]|0;
 $9 = (_atol($8)|0);
 $seed = $9;
 $10 = $1;
 $11 = (($10) + -1)|0;
 $1 = $11;
 $12 = $2;
 $13 = (($12) + 4|0);
 $2 = $13;
 $14 = $2;
 $15 = HEAP32[$14>>2]|0;
 $16 = (_atol($15)|0);
 $n = $16;
 $17 = $1;
 $18 = (($17) + -1)|0;
 $1 = $18;
 $19 = $2;
 $20 = (($19) + 4|0);
 $2 = $20;
 $21 = $2;
 $22 = HEAP32[$21>>2]|0;
 $name = $22;
 $23 = $1;
 $24 = (($23) + -1)|0;
 $1 = $24;
 $25 = $1;
 $26 = (($25) + -1)|0;
 $1 = $26;
 (_gsl_rng_env_setup()|0);
 $27 = HEAP32[_gsl_rng_default_seed>>2]|0;
 $28 = ($27|0)!=(0);
 if ($28) {
  $29 = HEAP32[_stderr>>2]|0;
  $30 = $seed;
  HEAP32[$vararg_buffer3>>2] = $30;
  (_fprintf(($29|0),(584|0),($vararg_buffer3|0))|0);
 }
 $31 = $seed;
 HEAP32[_gsl_rng_default_seed>>2] = $31;
 $32 = HEAP32[_gsl_rng_default>>2]|0;
 $33 = (_gsl_rng_alloc(($32|0))|0);
 $r = $33;
 $34 = $name;
 $35 = (_strcmp($34,648)|0);
 $36 = ($35|0)!=(0);
 if (!($36)) {
  $37 = $1;
  $38 = ($37|0)!=(1);
  if ($38) {
   _error(664);
  }
  $39 = $1;
  $40 = ($39|0)!=(0);
  if ($40) {
   $41 = $2;
   $42 = (($41) + 4|0);
   $2 = $42;
   $43 = HEAP32[$42>>2]|0;
   $44 = (+_atof($43));
   $p = $44;
   $45 = $1;
   $46 = (($45) + -1)|0;
   $1 = $46;
  } else {
   _error(696);
  }
  $i = 0;
  while(1) {
   $47 = $i;
   $48 = $n;
   $49 = ($47>>>0)<($48>>>0);
   if (!($49)) {
    break;
   }
   $50 = $r;
   $51 = $p;
   $52 = (_gsl_ran_bernoulli(($50|0),(+$51))|0);
   HEAP32[$vararg_buffer5>>2] = $52;
   (_printf((704|0),($vararg_buffer5|0))|0);
   $53 = $i;
   $54 = (($53) + 1)|0;
   $i = $54;
  }
  STACKTOP = sp;return 0;
 }
 $55 = $name;
 $56 = (_strcmp($55,712)|0);
 $57 = ($56|0)!=(0);
 if ($57) {
  $85 = $name;
  $86 = (_strcmp($85,768)|0);
  $87 = ($86|0)!=(0);
  if ($87) {
   $115 = $name;
   $116 = (_strcmp($115,832)|0);
   $117 = ($116|0)!=(0);
   if ($117) {
    $136 = $name;
    $137 = (_strcmp($136,864)|0);
    $138 = ($137|0)!=(0);
    if ($138) {
     $157 = $name;
     $158 = (_strcmp($157,904)|0);
     $159 = ($158|0)!=(0);
     if ($159) {
      $187 = $name;
      $188 = (_strcmp($187,944)|0);
      $189 = ($188|0)!=(0);
      if ($189) {
       $208 = $name;
       $209 = (_strcmp($208,984)|0);
       $210 = ($209|0)!=(0);
       if ($210) {
        $238 = $name;
        $239 = (_strcmp($238,1056)|0);
        $240 = ($239|0)!=(0);
        if ($240) {
         $268 = $name;
         $269 = (_strcmp($268,1128)|0);
         $270 = ($269|0)!=(0);
         if ($270) {
          $298 = $name;
          $299 = (_strcmp($298,1176)|0);
          $300 = ($299|0)!=(0);
          if ($300) {
           $328 = $name;
           $329 = (_strcmp($328,1208)|0);
           $330 = ($329|0)!=(0);
           if ($330) {
            $349 = $name;
            $350 = (_strcmp($349,1264)|0);
            $351 = ($350|0)!=(0);
            if ($351) {
             $379 = $name;
             $380 = (_strcmp($379,1328)|0);
             $381 = ($380|0)!=(0);
             if ($381) {
              $391 = $name;
              $392 = (_strcmp($391,1384)|0);
              $393 = ($392|0)!=(0);
              if ($393) {
               $412 = $name;
               $413 = (_strcmp($412,1416)|0);
               $414 = ($413|0)!=(0);
               if ($414) {
                $452 = $name;
                $453 = (_strcmp($452,1536)|0);
                $454 = ($453|0)!=(0);
                if ($454) {
                 $463 = $name;
                 $464 = (_strcmp($463,1544)|0);
                 $465 = ($464|0)!=(0);
                 if ($465) {
                  $475 = $name;
                  $476 = (_strcmp($475,1568)|0);
                  $477 = ($476|0)!=(0);
                  if ($477) {
                   $511 = $name;
                   $512 = (_strcmp($511,1640)|0);
                   $513 = ($512|0)!=(0);
                   if ($513) {
                    $532 = $name;
                    $533 = (_strcmp($532,1704)|0);
                    $534 = ($533|0)!=(0);
                    if ($534) {
                     $562 = $name;
                     $563 = (_strcmp($562,1744)|0);
                     $564 = ($563|0)!=(0);
                     if ($564) {
                      $592 = $name;
                      $593 = (_strcmp($592,1752)|0);
                      $594 = ($593|0)!=(0);
                      if ($594) {
                       $631 = $name;
                       $632 = (_strcmp($631,1856)|0);
                       $633 = ($632|0)!=(0);
                       if ($633) {
                        $652 = $name;
                        $653 = (_strcmp($652,1864)|0);
                        $654 = ($653|0)!=(0);
                        if ($654) {
                         $664 = $name;
                         $665 = (_strcmp($664,1896)|0);
                         $666 = ($665|0)!=(0);
                         if ($666) {
                          $694 = $name;
                          $695 = (_strcmp($694,1960)|0);
                          $696 = ($695|0)!=(0);
                          if ($696) {
                           $733 = $name;
                           $734 = (_strcmp($733,2032)|0);
                           $735 = ($734|0)!=(0);
                           if ($735) {
                            $754 = $name;
                            $755 = (_strcmp($754,2064)|0);
                            $756 = ($755|0)!=(0);
                            if ($756) {
                             $775 = $name;
                             $776 = (_strcmp($775,2080)|0);
                             $777 = ($776|0)!=(0);
                             if ($777) {
                              $805 = $name;
                              $806 = (_strcmp($805,2160)|0);
                              $807 = ($806|0)!=(0);
                              if ($807) {
                               $835 = $name;
                               $836 = (_strcmp($835,2216)|0);
                               $837 = ($836|0)!=(0);
                               if ($837) {
                                $865 = $name;
                                $866 = (_strcmp($865,2256)|0);
                                $867 = ($866|0)!=(0);
                                if ($867) {
                                 $895 = $name;
                                 $896 = (_strcmp($895,2304)|0);
                                 $897 = ($896|0)!=(0);
                                 if ($897) {
                                  $916 = $name;
                                  $917 = (_strcmp($916,2336)|0);
                                  $918 = ($917|0)!=(0);
                                  if ($918) {
                                   $937 = $name;
                                   $938 = (_strcmp($937,2376)|0);
                                   $939 = ($938|0)!=(0);
                                   if ($939) {
                                    $967 = $name;
                                    $968 = (_strcmp($967,2440)|0);
                                    $969 = ($968|0)!=(0);
                                    if ($969) {
                                     $988 = $name;
                                     $989 = (_strcmp($988,2448)|0);
                                     $990 = ($989|0)!=(0);
                                     if ($990) {
                                      $1018 = HEAP32[_stderr>>2]|0;
                                      $1019 = $name;
                                      HEAP32[$vararg_buffer123>>2] = $1019;
                                      (_fprintf(($1018|0),(2496|0),($vararg_buffer123|0))|0);
                                     } else {
                                      $991 = $1;
                                      $992 = ($991|0)!=(2);
                                      if ($992) {
                                       _error(2456);
                                      }
                                      $993 = $1;
                                      $994 = ($993|0)!=(0);
                                      if ($994) {
                                       $995 = $2;
                                       $996 = (($995) + 4|0);
                                       $2 = $996;
                                       $997 = HEAP32[$996>>2]|0;
                                       $998 = (+_atof($997));
                                       $a = $998;
                                       $999 = $1;
                                       $1000 = (($999) + -1)|0;
                                       $1 = $1000;
                                      } else {
                                       _error(744);
                                      }
                                      $1001 = $1;
                                      $1002 = ($1001|0)!=(0);
                                      if ($1002) {
                                       $1003 = $2;
                                       $1004 = (($1003) + 4|0);
                                       $2 = $1004;
                                       $1005 = HEAP32[$1004>>2]|0;
                                       $1006 = (+_atof($1005));
                                       $b = $1006;
                                       $1007 = $1;
                                       $1008 = (($1007) + -1)|0;
                                       $1 = $1008;
                                      } else {
                                       _error(752);
                                      }
                                      $i = 0;
                                      while(1) {
                                       $1009 = $i;
                                       $1010 = $n;
                                       $1011 = ($1009>>>0)<($1010>>>0);
                                       if (!($1011)) {
                                        break;
                                       }
                                       $1012 = $r;
                                       $1013 = $a;
                                       $1014 = $b;
                                       $1015 = (+_gsl_ran_weibull(($1012|0),(+$1013),(+$1014)));
                                       HEAPF64[tempDoublePtr>>3]=$1015;HEAP32[$vararg_buffer120>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer120+4>>2]=HEAP32[tempDoublePtr+4>>2];
                                       (_printf((760|0),($vararg_buffer120|0))|0);
                                       $1016 = $i;
                                       $1017 = (($1016) + 1)|0;
                                       $i = $1017;
                                      }
                                     }
                                    } else {
                                     $970 = $1;
                                     $971 = ($970|0)!=(1);
                                     if ($971) {
                                      _error(872);
                                     }
                                     $972 = $1;
                                     $973 = ($972|0)!=(0);
                                     if ($973) {
                                      $974 = $2;
                                      $975 = (($974) + 4|0);
                                      $2 = $975;
                                      $976 = HEAP32[$975>>2]|0;
                                      $977 = (+_atof($976));
                                      $nu = $977;
                                      $978 = $1;
                                      $979 = (($978) + -1)|0;
                                      $1 = $979;
                                     } else {
                                      _error(896);
                                     }
                                     $i = 0;
                                     while(1) {
                                      $980 = $i;
                                      $981 = $n;
                                      $982 = ($980>>>0)<($981>>>0);
                                      if (!($982)) {
                                       break;
                                      }
                                      $983 = $r;
                                      $984 = $nu;
                                      $985 = (+_gsl_ran_tdist(($983|0),(+$984)));
                                      HEAPF64[tempDoublePtr>>3]=$985;HEAP32[$vararg_buffer117>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer117+4>>2]=HEAP32[tempDoublePtr+4>>2];
                                      (_printf((760|0),($vararg_buffer117|0))|0);
                                      $986 = $i;
                                      $987 = (($986) + 1)|0;
                                      $i = $987;
                                     }
                                    }
                                   } else {
                                    $940 = $1;
                                    $941 = ($940|0)!=(2);
                                    if ($941) {
                                     _error(2392);
                                    }
                                    $942 = $1;
                                    $943 = ($942|0)!=(0);
                                    if ($943) {
                                     $944 = $2;
                                     $945 = (($944) + 4|0);
                                     $2 = $945;
                                     $946 = HEAP32[$945>>2]|0;
                                     $947 = (+_atof($946));
                                     $a = $947;
                                     $948 = $1;
                                     $949 = (($948) + -1)|0;
                                     $1 = $949;
                                    } else {
                                     _error(744);
                                    }
                                    $950 = $1;
                                    $951 = ($950|0)!=(0);
                                    if ($951) {
                                     $952 = $2;
                                     $953 = (($952) + 4|0);
                                     $2 = $953;
                                     $954 = HEAP32[$953>>2]|0;
                                     $955 = (+_atof($954));
                                     $sigma = $955;
                                     $956 = $1;
                                     $957 = (($956) + -1)|0;
                                     $1 = $957;
                                    } else {
                                     _error(1256);
                                    }
                                    $i = 0;
                                    while(1) {
                                     $958 = $i;
                                     $959 = $n;
                                     $960 = ($958>>>0)<($959>>>0);
                                     if (!($960)) {
                                      break;
                                     }
                                     $961 = $r;
                                     $962 = $a;
                                     $963 = $sigma;
                                     $964 = (+_gsl_ran_rayleigh_tail(($961|0),(+$962),(+$963)));
                                     HEAPF64[tempDoublePtr>>3]=$964;HEAP32[$vararg_buffer114>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer114+4>>2]=HEAP32[tempDoublePtr+4>>2];
                                     (_printf((760|0),($vararg_buffer114|0))|0);
                                     $965 = $i;
                                     $966 = (($965) + 1)|0;
                                     $i = $966;
                                    }
                                   }
                                  } else {
                                   $919 = $1;
                                   $920 = ($919|0)!=(1);
                                   if ($920) {
                                    _error(2352);
                                   }
                                   $921 = $1;
                                   $922 = ($921|0)!=(0);
                                   if ($922) {
                                    $923 = $2;
                                    $924 = (($923) + 4|0);
                                    $2 = $924;
                                    $925 = HEAP32[$924>>2]|0;
                                    $926 = (+_atof($925));
                                    $sigma = $926;
                                    $927 = $1;
                                    $928 = (($927) + -1)|0;
                                    $1 = $928;
                                   } else {
                                    _error(1256);
                                   }
                                   $i = 0;
                                   while(1) {
                                    $929 = $i;
                                    $930 = $n;
                                    $931 = ($929>>>0)<($930>>>0);
                                    if (!($931)) {
                                     break;
                                    }
                                    $932 = $r;
                                    $933 = $sigma;
                                    $934 = (+_gsl_ran_rayleigh(($932|0),(+$933)));
                                    HEAPF64[tempDoublePtr>>3]=$934;HEAP32[$vararg_buffer111>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer111+4>>2]=HEAP32[tempDoublePtr+4>>2];
                                    (_printf((760|0),($vararg_buffer111|0))|0);
                                    $935 = $i;
                                    $936 = (($935) + 1)|0;
                                    $i = $936;
                                   }
                                  }
                                 } else {
                                  $898 = $1;
                                  $899 = ($898|0)!=(1);
                                  if ($899) {
                                   _error(2312);
                                  }
                                  $900 = $1;
                                  $901 = ($900|0)!=(0);
                                  if ($901) {
                                   $902 = $2;
                                   $903 = (($902) + 4|0);
                                   $2 = $903;
                                   $904 = HEAP32[$903>>2]|0;
                                   $905 = (+_atof($904));
                                   $mu = $905;
                                   $906 = $1;
                                   $907 = (($906) + -1)|0;
                                   $1 = $907;
                                  } else {
                                   _error(976);
                                  }
                                  $i = 0;
                                  while(1) {
                                   $908 = $i;
                                   $909 = $n;
                                   $910 = ($908>>>0)<($909>>>0);
                                   if (!($910)) {
                                    break;
                                   }
                                   $911 = $r;
                                   $912 = $mu;
                                   $913 = (_gsl_ran_poisson(($911|0),(+$912))|0);
                                   HEAP32[$vararg_buffer108>>2] = $913;
                                   (_printf((704|0),($vararg_buffer108|0))|0);
                                   $914 = $i;
                                   $915 = (($914) + 1)|0;
                                   $i = $915;
                                  }
                                 }
                                } else {
                                 $868 = $1;
                                 $869 = ($868|0)!=(2);
                                 if ($869) {
                                  _error(2264);
                                 }
                                 $870 = $1;
                                 $871 = ($870|0)!=(0);
                                 if ($871) {
                                  $872 = $2;
                                  $873 = (($872) + 4|0);
                                  $2 = $873;
                                  $874 = HEAP32[$873>>2]|0;
                                  $875 = (+_atof($874));
                                  $p = $875;
                                  $876 = $1;
                                  $877 = (($876) + -1)|0;
                                  $1 = $877;
                                 } else {
                                  _error(696);
                                 }
                                 $878 = $1;
                                 $879 = ($878|0)!=(0);
                                 if ($879) {
                                  $880 = $2;
                                  $881 = (($880) + 4|0);
                                  $2 = $881;
                                  $882 = HEAP32[$881>>2]|0;
                                  $883 = (_atoi($882)|0);
                                  $N = $883;
                                  $884 = $1;
                                  $885 = (($884) + -1)|0;
                                  $1 = $885;
                                 } else {
                                  _error(824);
                                 }
                                 $i = 0;
                                 while(1) {
                                  $886 = $i;
                                  $887 = $n;
                                  $888 = ($886>>>0)<($887>>>0);
                                  if (!($888)) {
                                   break;
                                  }
                                  $889 = $r;
                                  $890 = $p;
                                  $891 = $N;
                                  $892 = (_gsl_ran_pascal(($889|0),(+$890),($891|0))|0);
                                  HEAP32[$vararg_buffer105>>2] = $892;
                                  (_printf((704|0),($vararg_buffer105|0))|0);
                                  $893 = $i;
                                  $894 = (($893) + 1)|0;
                                  $i = $894;
                                 }
                                }
                               } else {
                                $838 = $1;
                                $839 = ($838|0)!=(2);
                                if ($839) {
                                 _error(2224);
                                }
                                $840 = $1;
                                $841 = ($840|0)!=(0);
                                if ($841) {
                                 $842 = $2;
                                 $843 = (($842) + 4|0);
                                 $2 = $843;
                                 $844 = HEAP32[$843>>2]|0;
                                 $845 = (+_atof($844));
                                 $a = $845;
                                 $846 = $1;
                                 $847 = (($846) + -1)|0;
                                 $1 = $847;
                                } else {
                                 _error(744);
                                }
                                $848 = $1;
                                $849 = ($848|0)!=(0);
                                if ($849) {
                                 $850 = $2;
                                 $851 = (($850) + 4|0);
                                 $2 = $851;
                                 $852 = HEAP32[$851>>2]|0;
                                 $853 = (+_atof($852));
                                 $b = $853;
                                 $854 = $1;
                                 $855 = (($854) + -1)|0;
                                 $1 = $855;
                                } else {
                                 _error(752);
                                }
                                $i = 0;
                                while(1) {
                                 $856 = $i;
                                 $857 = $n;
                                 $858 = ($856>>>0)<($857>>>0);
                                 if (!($858)) {
                                  break;
                                 }
                                 $859 = $r;
                                 $860 = $a;
                                 $861 = $b;
                                 $862 = (+_gsl_ran_pareto(($859|0),(+$860),(+$861)));
                                 HEAPF64[tempDoublePtr>>3]=$862;HEAP32[$vararg_buffer102>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer102+4>>2]=HEAP32[tempDoublePtr+4>>2];
                                 (_printf((760|0),($vararg_buffer102|0))|0);
                                 $863 = $i;
                                 $864 = (($863) + 1)|0;
                                 $i = $864;
                                }
                               }
                              } else {
                               $808 = $1;
                               $809 = ($808|0)!=(2);
                               if ($809) {
                                _error(2184);
                               }
                               $810 = $1;
                               $811 = ($810|0)!=(0);
                               if ($811) {
                                $812 = $2;
                                $813 = (($812) + 4|0);
                                $2 = $813;
                                $814 = HEAP32[$813>>2]|0;
                                $815 = (+_atof($814));
                                $p = $815;
                                $816 = $1;
                                $817 = (($816) + -1)|0;
                                $1 = $817;
                               } else {
                                _error(696);
                               }
                               $818 = $1;
                               $819 = ($818|0)!=(0);
                               if ($819) {
                                $820 = $2;
                                $821 = (($820) + 4|0);
                                $2 = $821;
                                $822 = HEAP32[$821>>2]|0;
                                $823 = (+_atof($822));
                                $a = $823;
                                $824 = $1;
                                $825 = (($824) + -1)|0;
                                $1 = $825;
                               } else {
                                _error(744);
                               }
                               $i = 0;
                               while(1) {
                                $826 = $i;
                                $827 = $n;
                                $828 = ($826>>>0)<($827>>>0);
                                if (!($828)) {
                                 break;
                                }
                                $829 = $r;
                                $830 = $p;
                                $831 = $a;
                                $832 = (_gsl_ran_negative_binomial(($829|0),(+$830),(+$831))|0);
                                HEAP32[$vararg_buffer99>>2] = $832;
                                (_printf((704|0),($vararg_buffer99|0))|0);
                                $833 = $i;
                                $834 = (($833) + 1)|0;
                                $i = $834;
                               }
                              }
                             } else {
                              $778 = $1;
                              $779 = ($778|0)!=(2);
                              if ($779) {
                               _error(2096);
                              }
                              $780 = $1;
                              $781 = ($780|0)!=(0);
                              if ($781) {
                               $782 = $2;
                               $783 = (($782) + 4|0);
                               $2 = $783;
                               $784 = HEAP32[$783>>2]|0;
                               $785 = (+_atof($784));
                               $zeta = $785;
                               $786 = $1;
                               $787 = (($786) + -1)|0;
                               $1 = $787;
                              } else {
                               _error(2152);
                              }
                              $788 = $1;
                              $789 = ($788|0)!=(0);
                              if ($789) {
                               $790 = $2;
                               $791 = (($790) + 4|0);
                               $2 = $791;
                               $792 = HEAP32[$791>>2]|0;
                               $793 = (+_atof($792));
                               $sigma = $793;
                               $794 = $1;
                               $795 = (($794) + -1)|0;
                               $1 = $795;
                              } else {
                               _error(1256);
                              }
                              $i = 0;
                              while(1) {
                               $796 = $i;
                               $797 = $n;
                               $798 = ($796>>>0)<($797>>>0);
                               if (!($798)) {
                                break;
                               }
                               $799 = $r;
                               $800 = $zeta;
                               $801 = $sigma;
                               $802 = (+_gsl_ran_lognormal(($799|0),(+$800),(+$801)));
                               HEAPF64[tempDoublePtr>>3]=$802;HEAP32[$vararg_buffer96>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer96+4>>2]=HEAP32[tempDoublePtr+4>>2];
                               (_printf((760|0),($vararg_buffer96|0))|0);
                               $803 = $i;
                               $804 = (($803) + 1)|0;
                               $i = $804;
                              }
                             }
                            } else {
                             $757 = $1;
                             $758 = ($757|0)!=(1);
                             if ($758) {
                              _error(840);
                             }
                             $759 = $1;
                             $760 = ($759|0)!=(0);
                             if ($760) {
                              $761 = $2;
                              $762 = (($761) + 4|0);
                              $2 = $762;
                              $763 = HEAP32[$762>>2]|0;
                              $764 = (+_atof($763));
                              $a = $764;
                              $765 = $1;
                              $766 = (($765) + -1)|0;
                              $1 = $766;
                             } else {
                              _error(744);
                             }
                             $i = 0;
                             while(1) {
                              $767 = $i;
                              $768 = $n;
                              $769 = ($767>>>0)<($768>>>0);
                              if (!($769)) {
                               break;
                              }
                              $770 = $r;
                              $771 = $a;
                              $772 = (+_gsl_ran_logistic(($770|0),(+$771)));
                              HEAPF64[tempDoublePtr>>3]=$772;HEAP32[$vararg_buffer93>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer93+4>>2]=HEAP32[tempDoublePtr+4>>2];
                              (_printf((760|0),($vararg_buffer93|0))|0);
                              $773 = $i;
                              $774 = (($773) + 1)|0;
                              $i = $774;
                             }
                            }
                           } else {
                            $736 = $1;
                            $737 = ($736|0)!=(1);
                            if ($737) {
                             _error(2048);
                            }
                            $738 = $1;
                            $739 = ($738|0)!=(0);
                            if ($739) {
                             $740 = $2;
                             $741 = (($740) + 4|0);
                             $2 = $741;
                             $742 = HEAP32[$741>>2]|0;
                             $743 = (+_atof($742));
                             $p = $743;
                             $744 = $1;
                             $745 = (($744) + -1)|0;
                             $1 = $745;
                            } else {
                             _error(696);
                            }
                            $i = 0;
                            while(1) {
                             $746 = $i;
                             $747 = $n;
                             $748 = ($746>>>0)<($747>>>0);
                             if (!($748)) {
                              break;
                             }
                             $749 = $r;
                             $750 = $p;
                             $751 = (_gsl_ran_logarithmic(($749|0),(+$750))|0);
                             HEAP32[$vararg_buffer90>>2] = $751;
                             (_printf((704|0),($vararg_buffer90|0))|0);
                             $752 = $i;
                             $753 = (($752) + 1)|0;
                             $i = $753;
                            }
                           }
                          } else {
                           $697 = $1;
                           $698 = ($697|0)!=(3);
                           if ($698) {
                            _error(1976);
                           }
                           $699 = $1;
                           $700 = ($699|0)!=(0);
                           if ($700) {
                            $701 = $2;
                            $702 = (($701) + 4|0);
                            $2 = $702;
                            $703 = HEAP32[$702>>2]|0;
                            $704 = (+_atof($703));
                            $c = $704;
                            $705 = $1;
                            $706 = (($705) + -1)|0;
                            $1 = $706;
                           } else {
                            _error(1952);
                           }
                           $707 = $1;
                           $708 = ($707|0)!=(0);
                           if ($708) {
                            $709 = $2;
                            $710 = (($709) + 4|0);
                            $2 = $710;
                            $711 = HEAP32[$710>>2]|0;
                            $712 = (+_atof($711));
                            $a = $712;
                            $713 = $1;
                            $714 = (($713) + -1)|0;
                            $1 = $714;
                           } else {
                            _error(744);
                           }
                           $715 = $1;
                           $716 = ($715|0)!=(0);
                           if ($716) {
                            $717 = $2;
                            $718 = (($717) + 4|0);
                            $2 = $718;
                            $719 = HEAP32[$718>>2]|0;
                            $720 = (+_atof($719));
                            $b = $720;
                            $721 = $1;
                            $722 = (($721) + -1)|0;
                            $1 = $722;
                           } else {
                            _error(752);
                           }
                           $i = 0;
                           while(1) {
                            $723 = $i;
                            $724 = $n;
                            $725 = ($723>>>0)<($724>>>0);
                            if (!($725)) {
                             break;
                            }
                            $726 = $r;
                            $727 = $c;
                            $728 = $a;
                            $729 = $b;
                            $730 = (+_gsl_ran_levy_skew(($726|0),(+$727),(+$728),(+$729)));
                            HEAPF64[tempDoublePtr>>3]=$730;HEAP32[$vararg_buffer87>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer87+4>>2]=HEAP32[tempDoublePtr+4>>2];
                            (_printf((760|0),($vararg_buffer87|0))|0);
                            $731 = $i;
                            $732 = (($731) + 1)|0;
                            $i = $732;
                           }
                          }
                         } else {
                          $667 = $1;
                          $668 = ($667|0)!=(2);
                          if ($668) {
                           _error(1904);
                          }
                          $669 = $1;
                          $670 = ($669|0)!=(0);
                          if ($670) {
                           $671 = $2;
                           $672 = (($671) + 4|0);
                           $2 = $672;
                           $673 = HEAP32[$672>>2]|0;
                           $674 = (+_atof($673));
                           $c = $674;
                           $675 = $1;
                           $676 = (($675) + -1)|0;
                           $1 = $676;
                          } else {
                           _error(1952);
                          }
                          $677 = $1;
                          $678 = ($677|0)!=(0);
                          if ($678) {
                           $679 = $2;
                           $680 = (($679) + 4|0);
                           $2 = $680;
                           $681 = HEAP32[$680>>2]|0;
                           $682 = (+_atof($681));
                           $a = $682;
                           $683 = $1;
                           $684 = (($683) + -1)|0;
                           $1 = $684;
                          } else {
                           _error(744);
                          }
                          $i = 0;
                          while(1) {
                           $685 = $i;
                           $686 = $n;
                           $687 = ($685>>>0)<($686>>>0);
                           if (!($687)) {
                            break;
                           }
                           $688 = $r;
                           $689 = $c;
                           $690 = $a;
                           $691 = (+_gsl_ran_levy(($688|0),(+$689),(+$690)));
                           HEAPF64[tempDoublePtr>>3]=$691;HEAP32[$vararg_buffer84>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer84+4>>2]=HEAP32[tempDoublePtr+4>>2];
                           (_printf((760|0),($vararg_buffer84|0))|0);
                           $692 = $i;
                           $693 = (($692) + 1)|0;
                           $i = $693;
                          }
                         }
                        } else {
                         $655 = $1;
                         $656 = ($655|0)!=(0);
                         if ($656) {
                          _error(1872);
                         }
                         $i = 0;
                         while(1) {
                          $657 = $i;
                          $658 = $n;
                          $659 = ($657>>>0)<($658>>>0);
                          if (!($659)) {
                           break;
                          }
                          $660 = $r;
                          $661 = (+_gsl_ran_landau(($660|0)));
                          HEAPF64[tempDoublePtr>>3]=$661;HEAP32[$vararg_buffer81>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer81+4>>2]=HEAP32[tempDoublePtr+4>>2];
                          (_printf((760|0),($vararg_buffer81|0))|0);
                          $662 = $i;
                          $663 = (($662) + 1)|0;
                          $i = $663;
                         }
                        }
                       } else {
                        $634 = $1;
                        $635 = ($634|0)!=(1);
                        if ($635) {
                         _error(840);
                        }
                        $636 = $1;
                        $637 = ($636|0)!=(0);
                        if ($637) {
                         $638 = $2;
                         $639 = (($638) + 4|0);
                         $2 = $639;
                         $640 = HEAP32[$639>>2]|0;
                         $641 = (+_atof($640));
                         $a = $641;
                         $642 = $1;
                         $643 = (($642) + -1)|0;
                         $1 = $643;
                        } else {
                         _error(744);
                        }
                        $i = 0;
                        while(1) {
                         $644 = $i;
                         $645 = $n;
                         $646 = ($644>>>0)<($645>>>0);
                         if (!($646)) {
                          break;
                         }
                         $647 = $r;
                         $648 = $a;
                         $649 = (+_gsl_ran_laplace(($647|0),(+$648)));
                         HEAPF64[tempDoublePtr>>3]=$649;HEAP32[$vararg_buffer78>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer78+4>>2]=HEAP32[tempDoublePtr+4>>2];
                         (_printf((760|0),($vararg_buffer78|0))|0);
                         $650 = $i;
                         $651 = (($650) + 1)|0;
                         $i = $651;
                        }
                       }
                      } else {
                       $595 = $1;
                       $596 = ($595|0)!=(3);
                       if ($596) {
                        _error(1768);
                       }
                       $597 = $1;
                       $598 = ($597|0)!=(0);
                       if ($598) {
                        $599 = $2;
                        $600 = (($599) + 4|0);
                        $2 = $600;
                        $601 = HEAP32[$600>>2]|0;
                        $602 = (_atoi($601)|0);
                        $n1 = $602;
                        $603 = $1;
                        $604 = (($603) + -1)|0;
                        $1 = $604;
                       } else {
                        _error(1624);
                       }
                       $605 = $1;
                       $606 = ($605|0)!=(0);
                       if ($606) {
                        $607 = $2;
                        $608 = (($607) + 4|0);
                        $2 = $608;
                        $609 = HEAP32[$608>>2]|0;
                        $610 = (_atoi($609)|0);
                        $n2 = $610;
                        $611 = $1;
                        $612 = (($611) + -1)|0;
                        $1 = $612;
                       } else {
                        _error(1840);
                       }
                       $613 = $1;
                       $614 = ($613|0)!=(0);
                       if ($614) {
                        $615 = $2;
                        $616 = (($615) + 4|0);
                        $2 = $616;
                        $617 = HEAP32[$616>>2]|0;
                        $618 = (_atoi($617)|0);
                        $t = $618;
                        $619 = $1;
                        $620 = (($619) + -1)|0;
                        $1 = $620;
                       } else {
                        _error(1848);
                       }
                       $i = 0;
                       while(1) {
                        $621 = $i;
                        $622 = $n;
                        $623 = ($621>>>0)<($622>>>0);
                        if (!($623)) {
                         break;
                        }
                        $624 = $r;
                        $625 = $n1;
                        $626 = $n2;
                        $627 = $t;
                        $628 = (_gsl_ran_hypergeometric(($624|0),($625|0),($626|0),($627|0))|0);
                        HEAP32[$vararg_buffer75>>2] = $628;
                        (_printf((704|0),($vararg_buffer75|0))|0);
                        $629 = $i;
                        $630 = (($629) + 1)|0;
                        $i = $630;
                       }
                      }
                     } else {
                      $565 = $1;
                      $566 = ($565|0)!=(2);
                      if ($566) {
                       _error(1712);
                      }
                      $567 = $1;
                      $568 = ($567|0)!=(0);
                      if ($568) {
                       $569 = $2;
                       $570 = (($569) + 4|0);
                       $2 = $570;
                       $571 = HEAP32[$570>>2]|0;
                       $572 = (+_atof($571));
                       $a = $572;
                       $573 = $1;
                       $574 = (($573) + -1)|0;
                       $1 = $574;
                      } else {
                       _error(744);
                      }
                      $575 = $1;
                      $576 = ($575|0)!=(0);
                      if ($576) {
                       $577 = $2;
                       $578 = (($577) + 4|0);
                       $2 = $578;
                       $579 = HEAP32[$578>>2]|0;
                       $580 = (+_atof($579));
                       $b = $580;
                       $581 = $1;
                       $582 = (($581) + -1)|0;
                       $1 = $582;
                      } else {
                       _error(752);
                      }
                      $i = 0;
                      while(1) {
                       $583 = $i;
                       $584 = $n;
                       $585 = ($583>>>0)<($584>>>0);
                       if (!($585)) {
                        break;
                       }
                       $586 = $r;
                       $587 = $a;
                       $588 = $b;
                       $589 = (+_gsl_ran_gumbel2(($586|0),(+$587),(+$588)));
                       HEAPF64[tempDoublePtr>>3]=$589;HEAP32[$vararg_buffer72>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer72+4>>2]=HEAP32[tempDoublePtr+4>>2];
                       (_printf((760|0),($vararg_buffer72|0))|0);
                       $590 = $i;
                       $591 = (($590) + 1)|0;
                       $i = $591;
                      }
                     }
                    } else {
                     $535 = $1;
                     $536 = ($535|0)!=(2);
                     if ($536) {
                      _error(1712);
                     }
                     $537 = $1;
                     $538 = ($537|0)!=(0);
                     if ($538) {
                      $539 = $2;
                      $540 = (($539) + 4|0);
                      $2 = $540;
                      $541 = HEAP32[$540>>2]|0;
                      $542 = (+_atof($541));
                      $a = $542;
                      $543 = $1;
                      $544 = (($543) + -1)|0;
                      $1 = $544;
                     } else {
                      _error(744);
                     }
                     $545 = $1;
                     $546 = ($545|0)!=(0);
                     if ($546) {
                      $547 = $2;
                      $548 = (($547) + 4|0);
                      $2 = $548;
                      $549 = HEAP32[$548>>2]|0;
                      $550 = (+_atof($549));
                      $b = $550;
                      $551 = $1;
                      $552 = (($551) + -1)|0;
                      $1 = $552;
                     } else {
                      _error(752);
                     }
                     $i = 0;
                     while(1) {
                      $553 = $i;
                      $554 = $n;
                      $555 = ($553>>>0)<($554>>>0);
                      if (!($555)) {
                       break;
                      }
                      $556 = $r;
                      $557 = $a;
                      $558 = $b;
                      $559 = (+_gsl_ran_gumbel1(($556|0),(+$557),(+$558)));
                      HEAPF64[tempDoublePtr>>3]=$559;HEAP32[$vararg_buffer69>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer69+4>>2]=HEAP32[tempDoublePtr+4>>2];
                      (_printf((760|0),($vararg_buffer69|0))|0);
                      $560 = $i;
                      $561 = (($560) + 1)|0;
                      $i = $561;
                     }
                    }
                   } else {
                    $514 = $1;
                    $515 = ($514|0)!=(1);
                    if ($515) {
                     _error(1656);
                    }
                    $516 = $1;
                    $517 = ($516|0)!=(0);
                    if ($517) {
                     $518 = $2;
                     $519 = (($518) + 4|0);
                     $2 = $519;
                     $520 = HEAP32[$519>>2]|0;
                     $521 = (+_atof($520));
                     $p = $521;
                     $522 = $1;
                     $523 = (($522) + -1)|0;
                     $1 = $523;
                    } else {
                     _error(696);
                    }
                    $i = 0;
                    while(1) {
                     $524 = $i;
                     $525 = $n;
                     $526 = ($524>>>0)<($525>>>0);
                     if (!($526)) {
                      break;
                     }
                     $527 = $r;
                     $528 = $p;
                     $529 = (_gsl_ran_geometric(($527|0),(+$528))|0);
                     HEAP32[$vararg_buffer66>>2] = $529;
                     (_printf((704|0),($vararg_buffer66|0))|0);
                     $530 = $i;
                     $531 = (($530) + 1)|0;
                     $i = $531;
                    }
                   }
                  } else {
                   $478 = $1;
                   $479 = ($478|0)!=(1);
                   if ($479) {
                    _error(1576);
                   }
                   $480 = $1;
                   $481 = ($480|0)!=(0);
                   if ($481) {
                    $482 = $2;
                    $483 = (($482) + 4|0);
                    $2 = $483;
                    $484 = HEAP32[$483>>2]|0;
                    $485 = (_atoi($484)|0);
                    $n1 = $485;
                    $486 = $1;
                    $487 = (($486) + -1)|0;
                    $1 = $487;
                   } else {
                    _error(1624);
                   }
                   $488 = $n1;
                   $489 = $488<<3;
                   $490 = (_malloc($489)|0);
                   $xarr = $490;
                   $i = 0;
                   while(1) {
                    $491 = $i;
                    $492 = $n;
                    $493 = ($491>>>0)<($492>>>0);
                    if (!($493)) {
                     break;
                    }
                    $494 = $r;
                    $495 = $n1;
                    $496 = $xarr;
                    _gsl_ran_dir_nd(($494|0),($495|0),($496|0));
                    $j = 0;
                    while(1) {
                     $497 = $j;
                     $498 = $n1;
                     $499 = ($497>>>0)<($498>>>0);
                     if (!($499)) {
                      break;
                     }
                     $500 = $j;
                     $501 = ($500|0)!=(0);
                     if ($501) {
                      (_putchar(32)|0);
                     }
                     $502 = $j;
                     $503 = $xarr;
                     $504 = (($503) + ($502<<3)|0);
                     $505 = +HEAPF64[$504>>3];
                     HEAPF64[tempDoublePtr>>3]=$505;HEAP32[$vararg_buffer63>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer63+4>>2]=HEAP32[tempDoublePtr+4>>2];
                     (_printf((1632|0),($vararg_buffer63|0))|0);
                     $506 = $j;
                     $507 = (($506) + 1)|0;
                     $j = $507;
                    }
                    (_putchar(10)|0);
                    $508 = $i;
                    $509 = (($508) + 1)|0;
                    $i = $509;
                   }
                   $510 = $xarr;
                   _free($510);
                  }
                 } else {
                  $i = 0;
                  while(1) {
                   $466 = $i;
                   $467 = $n;
                   $468 = ($466>>>0)<($467>>>0);
                   if (!($468)) {
                    break;
                   }
                   $469 = $r;
                   _gsl_ran_dir_3d(($469|0),($x|0),($y|0),($z|0));
                   $470 = +HEAPF64[$x>>3];
                   $471 = +HEAPF64[$y>>3];
                   $472 = +HEAPF64[$z>>3];
                   HEAPF64[tempDoublePtr>>3]=$470;HEAP32[$vararg_buffer58>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer58+4>>2]=HEAP32[tempDoublePtr+4>>2];
                   $vararg_ptr61 = (($vararg_buffer58) + 8|0);
                   HEAPF64[tempDoublePtr>>3]=$471;HEAP32[$vararg_ptr61>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_ptr61+4>>2]=HEAP32[tempDoublePtr+4>>2];
                   $vararg_ptr62 = (($vararg_buffer58) + 16|0);
                   HEAPF64[tempDoublePtr>>3]=$472;HEAP32[$vararg_ptr62>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_ptr62+4>>2]=HEAP32[tempDoublePtr+4>>2];
                   (_printf((1552|0),($vararg_buffer58|0))|0);
                   $473 = $i;
                   $474 = (($473) + 1)|0;
                   $i = $474;
                  }
                 }
                } else {
                 $i = 0;
                 while(1) {
                  $455 = $i;
                  $456 = $n;
                  $457 = ($455>>>0)<($456>>>0);
                  if (!($457)) {
                   break;
                  }
                  $458 = $r;
                  _gsl_ran_dir_2d(($458|0),($x|0),($y|0));
                  $459 = +HEAPF64[$x>>3];
                  $460 = +HEAPF64[$y>>3];
                  HEAPF64[tempDoublePtr>>3]=$459;HEAP32[$vararg_buffer54>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer54+4>>2]=HEAP32[tempDoublePtr+4>>2];
                  $vararg_ptr57 = (($vararg_buffer54) + 8|0);
                  HEAPF64[tempDoublePtr>>3]=$460;HEAP32[$vararg_ptr57>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_ptr57+4>>2]=HEAP32[tempDoublePtr+4>>2];
                  (_printf((1528|0),($vararg_buffer54|0))|0);
                  $461 = $i;
                  $462 = (($461) + 1)|0;
                  $i = $462;
                 }
                }
               } else {
                $415 = $1;
                $416 = ($415|0)!=(3);
                if ($416) {
                 _error(1440);
                }
                $417 = $1;
                $418 = ($417|0)!=(0);
                if ($418) {
                 $419 = $2;
                 $420 = (($419) + 4|0);
                 $2 = $420;
                 $421 = HEAP32[$420>>2]|0;
                 $422 = (+_atof($421));
                 $sigmax = $422;
                 $423 = $1;
                 $424 = (($423) + -1)|0;
                 $1 = $424;
                } else {
                 _error(1504);
                }
                $425 = $1;
                $426 = ($425|0)!=(0);
                if ($426) {
                 $427 = $2;
                 $428 = (($427) + 4|0);
                 $2 = $428;
                 $429 = HEAP32[$428>>2]|0;
                 $430 = (+_atof($429));
                 $sigmay = $430;
                 $431 = $1;
                 $432 = (($431) + -1)|0;
                 $1 = $432;
                } else {
                 _error(1512);
                }
                $433 = $1;
                $434 = ($433|0)!=(0);
                if ($434) {
                 $435 = $2;
                 $436 = (($435) + 4|0);
                 $2 = $436;
                 $437 = HEAP32[$436>>2]|0;
                 $438 = (+_atof($437));
                 $rho = $438;
                 $439 = $1;
                 $440 = (($439) + -1)|0;
                 $1 = $440;
                } else {
                 _error(1520);
                }
                $i = 0;
                while(1) {
                 $441 = $i;
                 $442 = $n;
                 $443 = ($441>>>0)<($442>>>0);
                 if (!($443)) {
                  break;
                 }
                 $444 = $r;
                 $445 = $sigmax;
                 $446 = $sigmay;
                 $447 = $rho;
                 _gsl_ran_bivariate_gaussian(($444|0),(+$445),(+$446),(+$447),($x|0),($y|0));
                 $448 = +HEAPF64[$x>>3];
                 $449 = +HEAPF64[$y>>3];
                 HEAPF64[tempDoublePtr>>3]=$448;HEAP32[$vararg_buffer50>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer50+4>>2]=HEAP32[tempDoublePtr+4>>2];
                 $vararg_ptr53 = (($vararg_buffer50) + 8|0);
                 HEAPF64[tempDoublePtr>>3]=$449;HEAP32[$vararg_ptr53>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_ptr53+4>>2]=HEAP32[tempDoublePtr+4>>2];
                 (_printf((1528|0),($vararg_buffer50|0))|0);
                 $450 = $i;
                 $451 = (($450) + 1)|0;
                 $i = $451;
                }
               }
              } else {
               $394 = $1;
               $395 = ($394|0)!=(1);
               if ($395) {
                _error(1400);
               }
               $396 = $1;
               $397 = ($396|0)!=(0);
               if ($397) {
                $398 = $2;
                $399 = (($398) + 4|0);
                $2 = $399;
                $400 = HEAP32[$399>>2]|0;
                $401 = (+_atof($400));
                $a = $401;
                $402 = $1;
                $403 = (($402) + -1)|0;
                $1 = $403;
               } else {
                _error(744);
               }
               $i = 0;
               while(1) {
                $404 = $i;
                $405 = $n;
                $406 = ($404>>>0)<($405>>>0);
                if (!($406)) {
                 break;
                }
                $407 = $r;
                $408 = $a;
                $409 = (+_gsl_ran_ugaussian_tail(($407|0),(+$408)));
                HEAPF64[tempDoublePtr>>3]=$409;HEAP32[$vararg_buffer47>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer47+4>>2]=HEAP32[tempDoublePtr+4>>2];
                (_printf((760|0),($vararg_buffer47|0))|0);
                $410 = $i;
                $411 = (($410) + 1)|0;
                $i = $411;
               }
              }
             } else {
              $382 = $1;
              $383 = ($382|0)!=(0);
              if ($383) {
               _error(1344);
              }
              $i = 0;
              while(1) {
               $384 = $i;
               $385 = $n;
               $386 = ($384>>>0)<($385>>>0);
               if (!($386)) {
                break;
               }
               $387 = $r;
               $388 = (+_gsl_ran_ugaussian(($387|0)));
               HEAPF64[tempDoublePtr>>3]=$388;HEAP32[$vararg_buffer44>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer44+4>>2]=HEAP32[tempDoublePtr+4>>2];
               (_printf((760|0),($vararg_buffer44|0))|0);
               $389 = $i;
               $390 = (($389) + 1)|0;
               $i = $390;
              }
             }
            } else {
             $352 = $1;
             $353 = ($352|0)!=(2);
             if ($353) {
              _error(1280);
             }
             $354 = $1;
             $355 = ($354|0)!=(0);
             if ($355) {
              $356 = $2;
              $357 = (($356) + 4|0);
              $2 = $357;
              $358 = HEAP32[$357>>2]|0;
              $359 = (+_atof($358));
              $a = $359;
              $360 = $1;
              $361 = (($360) + -1)|0;
              $1 = $361;
             } else {
              _error(744);
             }
             $362 = $1;
             $363 = ($362|0)!=(0);
             if ($363) {
              $364 = $2;
              $365 = (($364) + 4|0);
              $2 = $365;
              $366 = HEAP32[$365>>2]|0;
              $367 = (+_atof($366));
              $sigma = $367;
              $368 = $1;
              $369 = (($368) + -1)|0;
              $1 = $369;
             } else {
              _error(1256);
             }
             $i = 0;
             while(1) {
              $370 = $i;
              $371 = $n;
              $372 = ($370>>>0)<($371>>>0);
              if (!($372)) {
               break;
              }
              $373 = $r;
              $374 = $a;
              $375 = $sigma;
              $376 = (+_gsl_ran_gaussian_tail(($373|0),(+$374),(+$375)));
              HEAPF64[tempDoublePtr>>3]=$376;HEAP32[$vararg_buffer41>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer41+4>>2]=HEAP32[tempDoublePtr+4>>2];
              (_printf((760|0),($vararg_buffer41|0))|0);
              $377 = $i;
              $378 = (($377) + 1)|0;
              $i = $378;
             }
            }
           } else {
            $331 = $1;
            $332 = ($331|0)!=(1);
            if ($332) {
             _error(1224);
            }
            $333 = $1;
            $334 = ($333|0)!=(0);
            if ($334) {
             $335 = $2;
             $336 = (($335) + 4|0);
             $2 = $336;
             $337 = HEAP32[$336>>2]|0;
             $338 = (+_atof($337));
             $sigma = $338;
             $339 = $1;
             $340 = (($339) + -1)|0;
             $1 = $340;
            } else {
             _error(1256);
            }
            $i = 0;
            while(1) {
             $341 = $i;
             $342 = $n;
             $343 = ($341>>>0)<($342>>>0);
             if (!($343)) {
              break;
             }
             $344 = $r;
             $345 = $sigma;
             $346 = (+_gsl_ran_gaussian(($344|0),(+$345)));
             HEAPF64[tempDoublePtr>>3]=$346;HEAP32[$vararg_buffer38>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer38+4>>2]=HEAP32[tempDoublePtr+4>>2];
             (_printf((760|0),($vararg_buffer38|0))|0);
             $347 = $i;
             $348 = (($347) + 1)|0;
             $i = $348;
            }
           }
          } else {
           $301 = $1;
           $302 = ($301|0)!=(2);
           if ($302) {
            _error(1184);
           }
           $303 = $1;
           $304 = ($303|0)!=(0);
           if ($304) {
            $305 = $2;
            $306 = (($305) + 4|0);
            $2 = $306;
            $307 = HEAP32[$306>>2]|0;
            $308 = (+_atof($307));
            $a = $308;
            $309 = $1;
            $310 = (($309) + -1)|0;
            $1 = $310;
           } else {
            _error(744);
           }
           $311 = $1;
           $312 = ($311|0)!=(0);
           if ($312) {
            $313 = $2;
            $314 = (($313) + 4|0);
            $2 = $314;
            $315 = HEAP32[$314>>2]|0;
            $316 = (+_atof($315));
            $b = $316;
            $317 = $1;
            $318 = (($317) + -1)|0;
            $1 = $318;
           } else {
            _error(752);
           }
           $i = 0;
           while(1) {
            $319 = $i;
            $320 = $n;
            $321 = ($319>>>0)<($320>>>0);
            if (!($321)) {
             break;
            }
            $322 = $r;
            $323 = $a;
            $324 = $b;
            $325 = (+_gsl_ran_gamma(($322|0),(+$323),(+$324)));
            HEAPF64[tempDoublePtr>>3]=$325;HEAP32[$vararg_buffer35>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer35+4>>2]=HEAP32[tempDoublePtr+4>>2];
            (_printf((760|0),($vararg_buffer35|0))|0);
            $326 = $i;
            $327 = (($326) + 1)|0;
            $i = $327;
           }
          }
         } else {
          $271 = $1;
          $272 = ($271|0)!=(2);
          if ($272) {
           _error(1136);
          }
          $273 = $1;
          $274 = ($273|0)!=(0);
          if ($274) {
           $275 = $2;
           $276 = (($275) + 4|0);
           $2 = $276;
           $277 = HEAP32[$276>>2]|0;
           $278 = (+_atof($277));
           $a = $278;
           $279 = $1;
           $280 = (($279) + -1)|0;
           $1 = $280;
          } else {
           _error(744);
          }
          $281 = $1;
          $282 = ($281|0)!=(0);
          if ($282) {
           $283 = $2;
           $284 = (($283) + 4|0);
           $2 = $284;
           $285 = HEAP32[$284>>2]|0;
           $286 = (+_atof($285));
           $b = $286;
           $287 = $1;
           $288 = (($287) + -1)|0;
           $1 = $288;
          } else {
           _error(752);
          }
          $i = 0;
          while(1) {
           $289 = $i;
           $290 = $n;
           $291 = ($289>>>0)<($290>>>0);
           if (!($291)) {
            break;
           }
           $292 = $r;
           $293 = $a;
           $294 = $b;
           $295 = (+_gsl_ran_flat(($292|0),(+$293),(+$294)));
           HEAPF64[tempDoublePtr>>3]=$295;HEAP32[$vararg_buffer32>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer32+4>>2]=HEAP32[tempDoublePtr+4>>2];
           (_printf((760|0),($vararg_buffer32|0))|0);
           $296 = $i;
           $297 = (($296) + 1)|0;
           $i = $297;
          }
         }
        } else {
         $241 = $1;
         $242 = ($241|0)!=(2);
         if ($242) {
          _error(1064);
         }
         $243 = $1;
         $244 = ($243|0)!=(0);
         if ($244) {
          $245 = $2;
          $246 = (($245) + 4|0);
          $2 = $246;
          $247 = HEAP32[$246>>2]|0;
          $248 = (+_atof($247));
          $nu1 = $248;
          $249 = $1;
          $250 = (($249) + -1)|0;
          $1 = $250;
         } else {
          _error(1112);
         }
         $251 = $1;
         $252 = ($251|0)!=(0);
         if ($252) {
          $253 = $2;
          $254 = (($253) + 4|0);
          $2 = $254;
          $255 = HEAP32[$254>>2]|0;
          $256 = (+_atof($255));
          $nu2 = $256;
          $257 = $1;
          $258 = (($257) + -1)|0;
          $1 = $258;
         } else {
          _error(1120);
         }
         $i = 0;
         while(1) {
          $259 = $i;
          $260 = $n;
          $261 = ($259>>>0)<($260>>>0);
          if (!($261)) {
           break;
          }
          $262 = $r;
          $263 = $nu1;
          $264 = $nu2;
          $265 = (+_gsl_ran_fdist(($262|0),(+$263),(+$264)));
          HEAPF64[tempDoublePtr>>3]=$265;HEAP32[$vararg_buffer29>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer29+4>>2]=HEAP32[tempDoublePtr+4>>2];
          (_printf((760|0),($vararg_buffer29|0))|0);
          $266 = $i;
          $267 = (($266) + 1)|0;
          $i = $267;
         }
        }
       } else {
        $211 = $1;
        $212 = ($211|0)!=(2);
        if ($212) {
         _error(992);
        }
        $213 = $1;
        $214 = ($213|0)!=(0);
        if ($214) {
         $215 = $2;
         $216 = (($215) + 4|0);
         $2 = $216;
         $217 = HEAP32[$216>>2]|0;
         $218 = (+_atof($217));
         $a = $218;
         $219 = $1;
         $220 = (($219) + -1)|0;
         $1 = $220;
        } else {
         _error(744);
        }
        $221 = $1;
        $222 = ($221|0)!=(0);
        if ($222) {
         $223 = $2;
         $224 = (($223) + 4|0);
         $2 = $224;
         $225 = HEAP32[$224>>2]|0;
         $226 = (+_atof($225));
         $b = $226;
         $227 = $1;
         $228 = (($227) + -1)|0;
         $1 = $228;
        } else {
         _error(752);
        }
        $i = 0;
        while(1) {
         $229 = $i;
         $230 = $n;
         $231 = ($229>>>0)<($230>>>0);
         if (!($231)) {
          break;
         }
         $232 = $r;
         $233 = $a;
         $234 = $b;
         $235 = (+_gsl_ran_exppow(($232|0),(+$233),(+$234)));
         HEAPF64[tempDoublePtr>>3]=$235;HEAP32[$vararg_buffer26>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer26+4>>2]=HEAP32[tempDoublePtr+4>>2];
         (_printf((760|0),($vararg_buffer26|0))|0);
         $236 = $i;
         $237 = (($236) + 1)|0;
         $i = $237;
        }
       }
      } else {
       $190 = $1;
       $191 = ($190|0)!=(1);
       if ($191) {
        _error(960);
       }
       $192 = $1;
       $193 = ($192|0)!=(0);
       if ($193) {
        $194 = $2;
        $195 = (($194) + 4|0);
        $2 = $195;
        $196 = HEAP32[$195>>2]|0;
        $197 = (+_atof($196));
        $mu = $197;
        $198 = $1;
        $199 = (($198) + -1)|0;
        $1 = $199;
       } else {
        _error(976);
       }
       $i = 0;
       while(1) {
        $200 = $i;
        $201 = $n;
        $202 = ($200>>>0)<($201>>>0);
        if (!($202)) {
         break;
        }
        $203 = $r;
        $204 = $mu;
        $205 = (+_gsl_ran_exponential(($203|0),(+$204)));
        HEAPF64[tempDoublePtr>>3]=$205;HEAP32[$vararg_buffer23>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer23+4>>2]=HEAP32[tempDoublePtr+4>>2];
        (_printf((760|0),($vararg_buffer23|0))|0);
        $206 = $i;
        $207 = (($206) + 1)|0;
        $i = $207;
       }
      }
     } else {
      $160 = $1;
      $161 = ($160|0)!=(2);
      if ($161) {
       _error(912);
      }
      $162 = $1;
      $163 = ($162|0)!=(0);
      if ($163) {
       $164 = $2;
       $165 = (($164) + 4|0);
       $2 = $165;
       $166 = HEAP32[$165>>2]|0;
       $167 = (+_atof($166));
       $a = $167;
       $168 = $1;
       $169 = (($168) + -1)|0;
       $1 = $169;
      } else {
       _error(744);
      }
      $170 = $1;
      $171 = ($170|0)!=(0);
      if ($171) {
       $172 = $2;
       $173 = (($172) + 4|0);
       $2 = $173;
       $174 = HEAP32[$173>>2]|0;
       $175 = (+_atof($174));
       $b = $175;
       $176 = $1;
       $177 = (($176) + -1)|0;
       $1 = $177;
      } else {
       _error(752);
      }
      $i = 0;
      while(1) {
       $178 = $i;
       $179 = $n;
       $180 = ($178>>>0)<($179>>>0);
       if (!($180)) {
        break;
       }
       $181 = $r;
       $182 = $a;
       $183 = $b;
       $184 = (+_gsl_ran_erlang(($181|0),(+$182),(+$183)));
       HEAPF64[tempDoublePtr>>3]=$184;HEAP32[$vararg_buffer20>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer20+4>>2]=HEAP32[tempDoublePtr+4>>2];
       (_printf((760|0),($vararg_buffer20|0))|0);
       $185 = $i;
       $186 = (($185) + 1)|0;
       $i = $186;
      }
     }
    } else {
     $139 = $1;
     $140 = ($139|0)!=(1);
     if ($140) {
      _error(872);
     }
     $141 = $1;
     $142 = ($141|0)!=(0);
     if ($142) {
      $143 = $2;
      $144 = (($143) + 4|0);
      $2 = $144;
      $145 = HEAP32[$144>>2]|0;
      $146 = (+_atof($145));
      $nu = $146;
      $147 = $1;
      $148 = (($147) + -1)|0;
      $1 = $148;
     } else {
      _error(896);
     }
     $i = 0;
     while(1) {
      $149 = $i;
      $150 = $n;
      $151 = ($149>>>0)<($150>>>0);
      if (!($151)) {
       break;
      }
      $152 = $r;
      $153 = $nu;
      $154 = (+_gsl_ran_chisq(($152|0),(+$153)));
      HEAPF64[tempDoublePtr>>3]=$154;HEAP32[$vararg_buffer17>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer17+4>>2]=HEAP32[tempDoublePtr+4>>2];
      (_printf((760|0),($vararg_buffer17|0))|0);
      $155 = $i;
      $156 = (($155) + 1)|0;
      $i = $156;
     }
    }
   } else {
    $118 = $1;
    $119 = ($118|0)!=(1);
    if ($119) {
     _error(840);
    }
    $120 = $1;
    $121 = ($120|0)!=(0);
    if ($121) {
     $122 = $2;
     $123 = (($122) + 4|0);
     $2 = $123;
     $124 = HEAP32[$123>>2]|0;
     $125 = (+_atof($124));
     $a = $125;
     $126 = $1;
     $127 = (($126) + -1)|0;
     $1 = $127;
    } else {
     _error(744);
    }
    $i = 0;
    while(1) {
     $128 = $i;
     $129 = $n;
     $130 = ($128>>>0)<($129>>>0);
     if (!($130)) {
      break;
     }
     $131 = $r;
     $132 = $a;
     $133 = (+_gsl_ran_cauchy(($131|0),(+$132)));
     HEAPF64[tempDoublePtr>>3]=$133;HEAP32[$vararg_buffer14>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer14+4>>2]=HEAP32[tempDoublePtr+4>>2];
     (_printf((760|0),($vararg_buffer14|0))|0);
     $134 = $i;
     $135 = (($134) + 1)|0;
     $i = $135;
    }
   }
  } else {
   $88 = $1;
   $89 = ($88|0)!=(2);
   if ($89) {
    _error(784);
   }
   $90 = $1;
   $91 = ($90|0)!=(0);
   if ($91) {
    $92 = $2;
    $93 = (($92) + 4|0);
    $2 = $93;
    $94 = HEAP32[$93>>2]|0;
    $95 = (+_atof($94));
    $p = $95;
    $96 = $1;
    $97 = (($96) + -1)|0;
    $1 = $97;
   } else {
    _error(696);
   }
   $98 = $1;
   $99 = ($98|0)!=(0);
   if ($99) {
    $100 = $2;
    $101 = (($100) + 4|0);
    $2 = $101;
    $102 = HEAP32[$101>>2]|0;
    $103 = (_atoi($102)|0);
    $N = $103;
    $104 = $1;
    $105 = (($104) + -1)|0;
    $1 = $105;
   } else {
    _error(824);
   }
   $i = 0;
   while(1) {
    $106 = $i;
    $107 = $n;
    $108 = ($106>>>0)<($107>>>0);
    if (!($108)) {
     break;
    }
    $109 = $r;
    $110 = $p;
    $111 = $N;
    $112 = (_gsl_ran_binomial(($109|0),(+$110),($111|0))|0);
    HEAP32[$vararg_buffer11>>2] = $112;
    (_printf((704|0),($vararg_buffer11|0))|0);
    $113 = $i;
    $114 = (($113) + 1)|0;
    $i = $114;
   }
  }
 } else {
  $58 = $1;
  $59 = ($58|0)!=(2);
  if ($59) {
   _error(720);
  }
  $60 = $1;
  $61 = ($60|0)!=(0);
  if ($61) {
   $62 = $2;
   $63 = (($62) + 4|0);
   $2 = $63;
   $64 = HEAP32[$63>>2]|0;
   $65 = (+_atof($64));
   $a = $65;
   $66 = $1;
   $67 = (($66) + -1)|0;
   $1 = $67;
  } else {
   _error(744);
  }
  $68 = $1;
  $69 = ($68|0)!=(0);
  if ($69) {
   $70 = $2;
   $71 = (($70) + 4|0);
   $2 = $71;
   $72 = HEAP32[$71>>2]|0;
   $73 = (+_atof($72));
   $b = $73;
   $74 = $1;
   $75 = (($74) + -1)|0;
   $1 = $75;
  } else {
   _error(752);
  }
  $i = 0;
  while(1) {
   $76 = $i;
   $77 = $n;
   $78 = ($76>>>0)<($77>>>0);
   if (!($78)) {
    break;
   }
   $79 = $r;
   $80 = $a;
   $81 = $b;
   $82 = (+_gsl_ran_beta(($79|0),(+$80),(+$81)));
   HEAPF64[tempDoublePtr>>3]=$82;HEAP32[$vararg_buffer8>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer8+4>>2]=HEAP32[tempDoublePtr+4>>2];
   (_printf((760|0),($vararg_buffer8|0))|0);
   $83 = $i;
   $84 = (($83) + 1)|0;
   $i = $84;
  }
 }
 STACKTOP = sp;return 0;
}
function _error($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $s;
 $1 = HEAP32[_stderr>>2]|0;
 $2 = $0;
 HEAP32[$vararg_buffer>>2] = $2;
 (_fprintf(($1|0),(2536|0),($vararg_buffer|0))|0);
 _exit(1);
 // unreachable;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$$i = 0, $$3$i = 0, $$4$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i25 = 0, $$pre$i25$i = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i26$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre57$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0;
 var $$sum$i14$i = 0, $$sum$i15$i = 0, $$sum$i18$i = 0, $$sum$i21$i = 0, $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i16$i = 0, $$sum1$i22$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0;
 var $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i24$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0, $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0;
 var $$sum14$pre$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i17$i = 0, $$sum2$i19$i = 0, $$sum2$i23$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0;
 var $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0;
 var $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0;
 var $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0;
 var $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0;
 var $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0;
 var $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0;
 var $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0;
 var $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0;
 var $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0;
 var $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0;
 var $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0;
 var $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0;
 var $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0;
 var $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0;
 var $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0;
 var $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0;
 var $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0;
 var $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0;
 var $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0;
 var $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0;
 var $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0;
 var $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0;
 var $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0;
 var $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0;
 var $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0;
 var $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0;
 var $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0;
 var $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0;
 var $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0;
 var $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0;
 var $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0;
 var $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0;
 var $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0;
 var $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0;
 var $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0;
 var $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0;
 var $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0;
 var $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0;
 var $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0;
 var $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0;
 var $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0;
 var $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0;
 var $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0;
 var $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0;
 var $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0;
 var $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0;
 var $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0;
 var $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0;
 var $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0;
 var $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0;
 var $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0;
 var $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0;
 var $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0;
 var $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0;
 var $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0;
 var $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0;
 var $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$025$i = 0, $K2$014$i$i = 0, $K8$052$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i28$i = 0, $T$013$i$i = 0;
 var $T$024$i = 0, $T$051$i$i = 0, $br$0$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $notlhs$i = 0, $notrhs$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond10$i = 0, $or$cond19$i = 0, $or$cond2$i = 0;
 var $or$cond49$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$not$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$329$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$075$i = 0, $sp$168$i = 0, $ssize$0$$i = 0;
 var $ssize$0$i = 0, $ssize$1$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$228$i = 0, $tbase$0$i = 0, $tbase$247$i = 0, $tsize$0$i = 0, $tsize$0323841$i = 0, $tsize$1$i = 0, $tsize$246$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0;
 var $v$330$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[2568>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((2568 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((2568 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[2568>>2] = $22;
     } else {
      $23 = HEAP32[((2568 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((2568 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((2568 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((2568 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[2568>>2] = $74;
      } else {
       $75 = HEAP32[((2568 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = HEAP32[((2568 + 8|0))>>2]|0;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[((2568 + 20|0))>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = ((2568 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[2568>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[2568>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre = ((2568 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((2568 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((2568 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((2568 + 8|0))>>2] = $81;
     HEAP32[((2568 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((2568 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((2568 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((2568 + 16|0))>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($5)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = (($v$0$i) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = (($v$0$i) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((2568 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((2568 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((2568 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((2568 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((2568 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = HEAP32[((2568 + 16|0))>>2]|0;
         $204 = ($201>>>0)<($203>>>0);
         if ($204) {
          _abort();
          // unreachable;
         } else {
          $205 = (($R$1$i) + 16|0);
          HEAP32[$205>>2] = $201;
          $206 = (($201) + 24|0);
          HEAP32[$206>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $207 = (($v$0$i) + 20|0);
       $208 = HEAP32[$207>>2]|0;
       $209 = ($208|0)==(0|0);
       if (!($209)) {
        $210 = HEAP32[((2568 + 16|0))>>2]|0;
        $211 = ($208>>>0)<($210>>>0);
        if ($211) {
         _abort();
         // unreachable;
        } else {
         $212 = (($R$1$i) + 20|0);
         HEAP32[$212>>2] = $208;
         $213 = (($208) + 24|0);
         HEAP32[$213>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $214 = ($rsize$0$i>>>0)<(16);
     if ($214) {
      $215 = (($rsize$0$i) + ($5))|0;
      $216 = $215 | 3;
      $217 = (($v$0$i) + 4|0);
      HEAP32[$217>>2] = $216;
      $$sum4$i = (($215) + 4)|0;
      $218 = (($v$0$i) + ($$sum4$i)|0);
      $219 = HEAP32[$218>>2]|0;
      $220 = $219 | 1;
      HEAP32[$218>>2] = $220;
     } else {
      $221 = $5 | 3;
      $222 = (($v$0$i) + 4|0);
      HEAP32[$222>>2] = $221;
      $223 = $rsize$0$i | 1;
      $$sum$i35 = $5 | 4;
      $224 = (($v$0$i) + ($$sum$i35)|0);
      HEAP32[$224>>2] = $223;
      $$sum1$i = (($rsize$0$i) + ($5))|0;
      $225 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$225>>2] = $rsize$0$i;
      $226 = HEAP32[((2568 + 8|0))>>2]|0;
      $227 = ($226|0)==(0);
      if (!($227)) {
       $228 = HEAP32[((2568 + 20|0))>>2]|0;
       $229 = $226 >>> 3;
       $230 = $229 << 1;
       $231 = ((2568 + ($230<<2)|0) + 40|0);
       $232 = HEAP32[2568>>2]|0;
       $233 = 1 << $229;
       $234 = $232 & $233;
       $235 = ($234|0)==(0);
       if ($235) {
        $236 = $232 | $233;
        HEAP32[2568>>2] = $236;
        $$sum2$pre$i = (($230) + 2)|0;
        $$pre$i = ((2568 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $231;
       } else {
        $$sum3$i = (($230) + 2)|0;
        $237 = ((2568 + ($$sum3$i<<2)|0) + 40|0);
        $238 = HEAP32[$237>>2]|0;
        $239 = HEAP32[((2568 + 16|0))>>2]|0;
        $240 = ($238>>>0)<($239>>>0);
        if ($240) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $237;$F1$0$i = $238;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $228;
       $241 = (($F1$0$i) + 12|0);
       HEAP32[$241>>2] = $228;
       $242 = (($228) + 8|0);
       HEAP32[$242>>2] = $F1$0$i;
       $243 = (($228) + 12|0);
       HEAP32[$243>>2] = $231;
      }
      HEAP32[((2568 + 8|0))>>2] = $rsize$0$i;
      HEAP32[((2568 + 20|0))>>2] = $151;
     }
     $244 = (($v$0$i) + 8|0);
     $mem$0 = $244;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $245 = ($bytes>>>0)>(4294967231);
   if ($245) {
    $nb$0 = -1;
   } else {
    $246 = (($bytes) + 11)|0;
    $247 = $246 & -8;
    $248 = HEAP32[((2568 + 4|0))>>2]|0;
    $249 = ($248|0)==(0);
    if ($249) {
     $nb$0 = $247;
    } else {
     $250 = (0 - ($247))|0;
     $251 = $246 >>> 8;
     $252 = ($251|0)==(0);
     if ($252) {
      $idx$0$i = 0;
     } else {
      $253 = ($247>>>0)>(16777215);
      if ($253) {
       $idx$0$i = 31;
      } else {
       $254 = (($251) + 1048320)|0;
       $255 = $254 >>> 16;
       $256 = $255 & 8;
       $257 = $251 << $256;
       $258 = (($257) + 520192)|0;
       $259 = $258 >>> 16;
       $260 = $259 & 4;
       $261 = $260 | $256;
       $262 = $257 << $260;
       $263 = (($262) + 245760)|0;
       $264 = $263 >>> 16;
       $265 = $264 & 2;
       $266 = $261 | $265;
       $267 = (14 - ($266))|0;
       $268 = $262 << $265;
       $269 = $268 >>> 15;
       $270 = (($267) + ($269))|0;
       $271 = $270 << 1;
       $272 = (($270) + 7)|0;
       $273 = $247 >>> $272;
       $274 = $273 & 1;
       $275 = $274 | $271;
       $idx$0$i = $275;
      }
     }
     $276 = ((2568 + ($idx$0$i<<2)|0) + 304|0);
     $277 = HEAP32[$276>>2]|0;
     $278 = ($277|0)==(0|0);
     L126: do {
      if ($278) {
       $rsize$2$i = $250;$t$1$i = 0;$v$2$i = 0;
      } else {
       $279 = ($idx$0$i|0)==(31);
       if ($279) {
        $283 = 0;
       } else {
        $280 = $idx$0$i >>> 1;
        $281 = (25 - ($280))|0;
        $283 = $281;
       }
       $282 = $247 << $283;
       $rsize$0$i15 = $250;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $277;$v$0$i16 = 0;
       while(1) {
        $284 = (($t$0$i14) + 4|0);
        $285 = HEAP32[$284>>2]|0;
        $286 = $285 & -8;
        $287 = (($286) - ($247))|0;
        $288 = ($287>>>0)<($rsize$0$i15>>>0);
        if ($288) {
         $289 = ($286|0)==($247|0);
         if ($289) {
          $rsize$2$i = $287;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $287;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $290 = (($t$0$i14) + 20|0);
        $291 = HEAP32[$290>>2]|0;
        $292 = $sizebits$0$i >>> 31;
        $293 = ((($t$0$i14) + ($292<<2)|0) + 16|0);
        $294 = HEAP32[$293>>2]|0;
        $295 = ($291|0)==(0|0);
        $296 = ($291|0)==($294|0);
        $or$cond$i = $295 | $296;
        $rst$1$i = $or$cond$i ? $rst$0$i : $291;
        $297 = ($294|0)==(0|0);
        $298 = $sizebits$0$i << 1;
        if ($297) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $298;$t$0$i14 = $294;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $299 = ($t$1$i|0)==(0|0);
     $300 = ($v$2$i|0)==(0|0);
     $or$cond19$i = $299 & $300;
     if ($or$cond19$i) {
      $301 = 2 << $idx$0$i;
      $302 = (0 - ($301))|0;
      $303 = $301 | $302;
      $304 = $248 & $303;
      $305 = ($304|0)==(0);
      if ($305) {
       $nb$0 = $247;
       break;
      }
      $306 = (0 - ($304))|0;
      $307 = $304 & $306;
      $308 = (($307) + -1)|0;
      $309 = $308 >>> 12;
      $310 = $309 & 16;
      $311 = $308 >>> $310;
      $312 = $311 >>> 5;
      $313 = $312 & 8;
      $314 = $313 | $310;
      $315 = $311 >>> $313;
      $316 = $315 >>> 2;
      $317 = $316 & 4;
      $318 = $314 | $317;
      $319 = $315 >>> $317;
      $320 = $319 >>> 1;
      $321 = $320 & 2;
      $322 = $318 | $321;
      $323 = $319 >>> $321;
      $324 = $323 >>> 1;
      $325 = $324 & 1;
      $326 = $322 | $325;
      $327 = $323 >>> $325;
      $328 = (($326) + ($327))|0;
      $329 = ((2568 + ($328<<2)|0) + 304|0);
      $330 = HEAP32[$329>>2]|0;
      $t$2$ph$i = $330;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $331 = ($t$2$ph$i|0)==(0|0);
     if ($331) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$329$i = $rsize$2$i;$t$228$i = $t$2$ph$i;$v$330$i = $v$2$i;
      while(1) {
       $332 = (($t$228$i) + 4|0);
       $333 = HEAP32[$332>>2]|0;
       $334 = $333 & -8;
       $335 = (($334) - ($247))|0;
       $336 = ($335>>>0)<($rsize$329$i>>>0);
       $$rsize$3$i = $336 ? $335 : $rsize$329$i;
       $t$2$v$3$i = $336 ? $t$228$i : $v$330$i;
       $337 = (($t$228$i) + 16|0);
       $338 = HEAP32[$337>>2]|0;
       $339 = ($338|0)==(0|0);
       if (!($339)) {
        $rsize$329$i = $$rsize$3$i;$t$228$i = $338;$v$330$i = $t$2$v$3$i;
        continue;
       }
       $340 = (($t$228$i) + 20|0);
       $341 = HEAP32[$340>>2]|0;
       $342 = ($341|0)==(0|0);
       if ($342) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$329$i = $$rsize$3$i;$t$228$i = $341;$v$330$i = $t$2$v$3$i;
       }
      }
     }
     $343 = ($v$3$lcssa$i|0)==(0|0);
     if ($343) {
      $nb$0 = $247;
     } else {
      $344 = HEAP32[((2568 + 8|0))>>2]|0;
      $345 = (($344) - ($247))|0;
      $346 = ($rsize$3$lcssa$i>>>0)<($345>>>0);
      if ($346) {
       $347 = HEAP32[((2568 + 16|0))>>2]|0;
       $348 = ($v$3$lcssa$i>>>0)<($347>>>0);
       if ($348) {
        _abort();
        // unreachable;
       }
       $349 = (($v$3$lcssa$i) + ($247)|0);
       $350 = ($v$3$lcssa$i>>>0)<($349>>>0);
       if (!($350)) {
        _abort();
        // unreachable;
       }
       $351 = (($v$3$lcssa$i) + 24|0);
       $352 = HEAP32[$351>>2]|0;
       $353 = (($v$3$lcssa$i) + 12|0);
       $354 = HEAP32[$353>>2]|0;
       $355 = ($354|0)==($v$3$lcssa$i|0);
       do {
        if ($355) {
         $365 = (($v$3$lcssa$i) + 20|0);
         $366 = HEAP32[$365>>2]|0;
         $367 = ($366|0)==(0|0);
         if ($367) {
          $368 = (($v$3$lcssa$i) + 16|0);
          $369 = HEAP32[$368>>2]|0;
          $370 = ($369|0)==(0|0);
          if ($370) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $369;$RP$0$i17 = $368;
          }
         } else {
          $R$0$i18 = $366;$RP$0$i17 = $365;
         }
         while(1) {
          $371 = (($R$0$i18) + 20|0);
          $372 = HEAP32[$371>>2]|0;
          $373 = ($372|0)==(0|0);
          if (!($373)) {
           $R$0$i18 = $372;$RP$0$i17 = $371;
           continue;
          }
          $374 = (($R$0$i18) + 16|0);
          $375 = HEAP32[$374>>2]|0;
          $376 = ($375|0)==(0|0);
          if ($376) {
           break;
          } else {
           $R$0$i18 = $375;$RP$0$i17 = $374;
          }
         }
         $377 = ($RP$0$i17>>>0)<($347>>>0);
         if ($377) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $356 = (($v$3$lcssa$i) + 8|0);
         $357 = HEAP32[$356>>2]|0;
         $358 = ($357>>>0)<($347>>>0);
         if ($358) {
          _abort();
          // unreachable;
         }
         $359 = (($357) + 12|0);
         $360 = HEAP32[$359>>2]|0;
         $361 = ($360|0)==($v$3$lcssa$i|0);
         if (!($361)) {
          _abort();
          // unreachable;
         }
         $362 = (($354) + 8|0);
         $363 = HEAP32[$362>>2]|0;
         $364 = ($363|0)==($v$3$lcssa$i|0);
         if ($364) {
          HEAP32[$359>>2] = $354;
          HEAP32[$362>>2] = $357;
          $R$1$i20 = $354;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $378 = ($352|0)==(0|0);
       do {
        if (!($378)) {
         $379 = (($v$3$lcssa$i) + 28|0);
         $380 = HEAP32[$379>>2]|0;
         $381 = ((2568 + ($380<<2)|0) + 304|0);
         $382 = HEAP32[$381>>2]|0;
         $383 = ($v$3$lcssa$i|0)==($382|0);
         if ($383) {
          HEAP32[$381>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $384 = 1 << $380;
           $385 = $384 ^ -1;
           $386 = HEAP32[((2568 + 4|0))>>2]|0;
           $387 = $386 & $385;
           HEAP32[((2568 + 4|0))>>2] = $387;
           break;
          }
         } else {
          $388 = HEAP32[((2568 + 16|0))>>2]|0;
          $389 = ($352>>>0)<($388>>>0);
          if ($389) {
           _abort();
           // unreachable;
          }
          $390 = (($352) + 16|0);
          $391 = HEAP32[$390>>2]|0;
          $392 = ($391|0)==($v$3$lcssa$i|0);
          if ($392) {
           HEAP32[$390>>2] = $R$1$i20;
          } else {
           $393 = (($352) + 20|0);
           HEAP32[$393>>2] = $R$1$i20;
          }
          $394 = ($R$1$i20|0)==(0|0);
          if ($394) {
           break;
          }
         }
         $395 = HEAP32[((2568 + 16|0))>>2]|0;
         $396 = ($R$1$i20>>>0)<($395>>>0);
         if ($396) {
          _abort();
          // unreachable;
         }
         $397 = (($R$1$i20) + 24|0);
         HEAP32[$397>>2] = $352;
         $398 = (($v$3$lcssa$i) + 16|0);
         $399 = HEAP32[$398>>2]|0;
         $400 = ($399|0)==(0|0);
         do {
          if (!($400)) {
           $401 = HEAP32[((2568 + 16|0))>>2]|0;
           $402 = ($399>>>0)<($401>>>0);
           if ($402) {
            _abort();
            // unreachable;
           } else {
            $403 = (($R$1$i20) + 16|0);
            HEAP32[$403>>2] = $399;
            $404 = (($399) + 24|0);
            HEAP32[$404>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $405 = (($v$3$lcssa$i) + 20|0);
         $406 = HEAP32[$405>>2]|0;
         $407 = ($406|0)==(0|0);
         if (!($407)) {
          $408 = HEAP32[((2568 + 16|0))>>2]|0;
          $409 = ($406>>>0)<($408>>>0);
          if ($409) {
           _abort();
           // unreachable;
          } else {
           $410 = (($R$1$i20) + 20|0);
           HEAP32[$410>>2] = $406;
           $411 = (($406) + 24|0);
           HEAP32[$411>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $412 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($412) {
         $413 = (($rsize$3$lcssa$i) + ($247))|0;
         $414 = $413 | 3;
         $415 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$415>>2] = $414;
         $$sum18$i = (($413) + 4)|0;
         $416 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $417 = HEAP32[$416>>2]|0;
         $418 = $417 | 1;
         HEAP32[$416>>2] = $418;
        } else {
         $419 = $247 | 3;
         $420 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$420>>2] = $419;
         $421 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $247 | 4;
         $422 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$422>>2] = $421;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($247))|0;
         $423 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$423>>2] = $rsize$3$lcssa$i;
         $424 = $rsize$3$lcssa$i >>> 3;
         $425 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($425) {
          $426 = $424 << 1;
          $427 = ((2568 + ($426<<2)|0) + 40|0);
          $428 = HEAP32[2568>>2]|0;
          $429 = 1 << $424;
          $430 = $428 & $429;
          $431 = ($430|0)==(0);
          do {
           if ($431) {
            $432 = $428 | $429;
            HEAP32[2568>>2] = $432;
            $$sum14$pre$i = (($426) + 2)|0;
            $$pre$i25 = ((2568 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $427;
           } else {
            $$sum17$i = (($426) + 2)|0;
            $433 = ((2568 + ($$sum17$i<<2)|0) + 40|0);
            $434 = HEAP32[$433>>2]|0;
            $435 = HEAP32[((2568 + 16|0))>>2]|0;
            $436 = ($434>>>0)<($435>>>0);
            if (!($436)) {
             $$pre$phi$i26Z2D = $433;$F5$0$i = $434;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $349;
          $437 = (($F5$0$i) + 12|0);
          HEAP32[$437>>2] = $349;
          $$sum15$i = (($247) + 8)|0;
          $438 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$438>>2] = $F5$0$i;
          $$sum16$i = (($247) + 12)|0;
          $439 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$439>>2] = $427;
          break;
         }
         $440 = $rsize$3$lcssa$i >>> 8;
         $441 = ($440|0)==(0);
         if ($441) {
          $I7$0$i = 0;
         } else {
          $442 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($442) {
           $I7$0$i = 31;
          } else {
           $443 = (($440) + 1048320)|0;
           $444 = $443 >>> 16;
           $445 = $444 & 8;
           $446 = $440 << $445;
           $447 = (($446) + 520192)|0;
           $448 = $447 >>> 16;
           $449 = $448 & 4;
           $450 = $449 | $445;
           $451 = $446 << $449;
           $452 = (($451) + 245760)|0;
           $453 = $452 >>> 16;
           $454 = $453 & 2;
           $455 = $450 | $454;
           $456 = (14 - ($455))|0;
           $457 = $451 << $454;
           $458 = $457 >>> 15;
           $459 = (($456) + ($458))|0;
           $460 = $459 << 1;
           $461 = (($459) + 7)|0;
           $462 = $rsize$3$lcssa$i >>> $461;
           $463 = $462 & 1;
           $464 = $463 | $460;
           $I7$0$i = $464;
          }
         }
         $465 = ((2568 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($247) + 28)|0;
         $466 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$466>>2] = $I7$0$i;
         $$sum3$i27 = (($247) + 16)|0;
         $467 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($247) + 20)|0;
         $468 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$468>>2] = 0;
         HEAP32[$467>>2] = 0;
         $469 = HEAP32[((2568 + 4|0))>>2]|0;
         $470 = 1 << $I7$0$i;
         $471 = $469 & $470;
         $472 = ($471|0)==(0);
         if ($472) {
          $473 = $469 | $470;
          HEAP32[((2568 + 4|0))>>2] = $473;
          HEAP32[$465>>2] = $349;
          $$sum5$i = (($247) + 24)|0;
          $474 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$474>>2] = $465;
          $$sum6$i = (($247) + 12)|0;
          $475 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$475>>2] = $349;
          $$sum7$i = (($247) + 8)|0;
          $476 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$476>>2] = $349;
          break;
         }
         $477 = HEAP32[$465>>2]|0;
         $478 = ($I7$0$i|0)==(31);
         if ($478) {
          $486 = 0;
         } else {
          $479 = $I7$0$i >>> 1;
          $480 = (25 - ($479))|0;
          $486 = $480;
         }
         $481 = (($477) + 4|0);
         $482 = HEAP32[$481>>2]|0;
         $483 = $482 & -8;
         $484 = ($483|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($484) {
           $T$0$lcssa$i = $477;
          } else {
           $485 = $rsize$3$lcssa$i << $486;
           $K12$025$i = $485;$T$024$i = $477;
           while(1) {
            $493 = $K12$025$i >>> 31;
            $494 = ((($T$024$i) + ($493<<2)|0) + 16|0);
            $489 = HEAP32[$494>>2]|0;
            $495 = ($489|0)==(0|0);
            if ($495) {
             break;
            }
            $487 = $K12$025$i << 1;
            $488 = (($489) + 4|0);
            $490 = HEAP32[$488>>2]|0;
            $491 = $490 & -8;
            $492 = ($491|0)==($rsize$3$lcssa$i|0);
            if ($492) {
             $T$0$lcssa$i = $489;
             break L225;
            } else {
             $K12$025$i = $487;$T$024$i = $489;
            }
           }
           $496 = HEAP32[((2568 + 16|0))>>2]|0;
           $497 = ($494>>>0)<($496>>>0);
           if ($497) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$494>>2] = $349;
            $$sum11$i = (($247) + 24)|0;
            $498 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$498>>2] = $T$024$i;
            $$sum12$i = (($247) + 12)|0;
            $499 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$499>>2] = $349;
            $$sum13$i = (($247) + 8)|0;
            $500 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$500>>2] = $349;
            break L204;
           }
          }
         } while(0);
         $501 = (($T$0$lcssa$i) + 8|0);
         $502 = HEAP32[$501>>2]|0;
         $503 = HEAP32[((2568 + 16|0))>>2]|0;
         $504 = ($T$0$lcssa$i>>>0)<($503>>>0);
         if ($504) {
          _abort();
          // unreachable;
         }
         $505 = ($502>>>0)<($503>>>0);
         if ($505) {
          _abort();
          // unreachable;
         } else {
          $506 = (($502) + 12|0);
          HEAP32[$506>>2] = $349;
          HEAP32[$501>>2] = $349;
          $$sum8$i = (($247) + 8)|0;
          $507 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$507>>2] = $502;
          $$sum9$i = (($247) + 12)|0;
          $508 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$508>>2] = $T$0$lcssa$i;
          $$sum10$i = (($247) + 24)|0;
          $509 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$509>>2] = 0;
          break;
         }
        }
       } while(0);
       $510 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $510;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $247;
      }
     }
    }
   }
  }
 } while(0);
 $511 = HEAP32[((2568 + 8|0))>>2]|0;
 $512 = ($nb$0>>>0)>($511>>>0);
 if (!($512)) {
  $513 = (($511) - ($nb$0))|0;
  $514 = HEAP32[((2568 + 20|0))>>2]|0;
  $515 = ($513>>>0)>(15);
  if ($515) {
   $516 = (($514) + ($nb$0)|0);
   HEAP32[((2568 + 20|0))>>2] = $516;
   HEAP32[((2568 + 8|0))>>2] = $513;
   $517 = $513 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $518 = (($514) + ($$sum2)|0);
   HEAP32[$518>>2] = $517;
   $519 = (($514) + ($511)|0);
   HEAP32[$519>>2] = $513;
   $520 = $nb$0 | 3;
   $521 = (($514) + 4|0);
   HEAP32[$521>>2] = $520;
  } else {
   HEAP32[((2568 + 8|0))>>2] = 0;
   HEAP32[((2568 + 20|0))>>2] = 0;
   $522 = $511 | 3;
   $523 = (($514) + 4|0);
   HEAP32[$523>>2] = $522;
   $$sum1 = (($511) + 4)|0;
   $524 = (($514) + ($$sum1)|0);
   $525 = HEAP32[$524>>2]|0;
   $526 = $525 | 1;
   HEAP32[$524>>2] = $526;
  }
  $527 = (($514) + 8|0);
  $mem$0 = $527;
  STACKTOP = sp;return ($mem$0|0);
 }
 $528 = HEAP32[((2568 + 12|0))>>2]|0;
 $529 = ($nb$0>>>0)<($528>>>0);
 if ($529) {
  $530 = (($528) - ($nb$0))|0;
  HEAP32[((2568 + 12|0))>>2] = $530;
  $531 = HEAP32[((2568 + 24|0))>>2]|0;
  $532 = (($531) + ($nb$0)|0);
  HEAP32[((2568 + 24|0))>>2] = $532;
  $533 = $530 | 1;
  $$sum = (($nb$0) + 4)|0;
  $534 = (($531) + ($$sum)|0);
  HEAP32[$534>>2] = $533;
  $535 = $nb$0 | 3;
  $536 = (($531) + 4|0);
  HEAP32[$536>>2] = $535;
  $537 = (($531) + 8|0);
  $mem$0 = $537;
  STACKTOP = sp;return ($mem$0|0);
 }
 $538 = HEAP32[3040>>2]|0;
 $539 = ($538|0)==(0);
 do {
  if ($539) {
   $540 = (_sysconf(30)|0);
   $541 = (($540) + -1)|0;
   $542 = $541 & $540;
   $543 = ($542|0)==(0);
   if ($543) {
    HEAP32[((3040 + 8|0))>>2] = $540;
    HEAP32[((3040 + 4|0))>>2] = $540;
    HEAP32[((3040 + 12|0))>>2] = -1;
    HEAP32[((3040 + 16|0))>>2] = -1;
    HEAP32[((3040 + 20|0))>>2] = 0;
    HEAP32[((2568 + 444|0))>>2] = 0;
    $544 = (_time((0|0))|0);
    $545 = $544 & -16;
    $546 = $545 ^ 1431655768;
    HEAP32[3040>>2] = $546;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $547 = (($nb$0) + 48)|0;
 $548 = HEAP32[((3040 + 8|0))>>2]|0;
 $549 = (($nb$0) + 47)|0;
 $550 = (($548) + ($549))|0;
 $551 = (0 - ($548))|0;
 $552 = $550 & $551;
 $553 = ($552>>>0)>($nb$0>>>0);
 if (!($553)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $554 = HEAP32[((2568 + 440|0))>>2]|0;
 $555 = ($554|0)==(0);
 if (!($555)) {
  $556 = HEAP32[((2568 + 432|0))>>2]|0;
  $557 = (($556) + ($552))|0;
  $558 = ($557>>>0)<=($556>>>0);
  $559 = ($557>>>0)>($554>>>0);
  $or$cond1$i = $558 | $559;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $560 = HEAP32[((2568 + 444|0))>>2]|0;
 $561 = $560 & 4;
 $562 = ($561|0)==(0);
 L269: do {
  if ($562) {
   $563 = HEAP32[((2568 + 24|0))>>2]|0;
   $564 = ($563|0)==(0|0);
   L271: do {
    if ($564) {
     label = 182;
    } else {
     $sp$0$i$i = ((2568 + 448|0));
     while(1) {
      $565 = HEAP32[$sp$0$i$i>>2]|0;
      $566 = ($565>>>0)>($563>>>0);
      if (!($566)) {
       $567 = (($sp$0$i$i) + 4|0);
       $568 = HEAP32[$567>>2]|0;
       $569 = (($565) + ($568)|0);
       $570 = ($569>>>0)>($563>>>0);
       if ($570) {
        break;
       }
      }
      $571 = (($sp$0$i$i) + 8|0);
      $572 = HEAP32[$571>>2]|0;
      $573 = ($572|0)==(0|0);
      if ($573) {
       label = 182;
       break L271;
      } else {
       $sp$0$i$i = $572;
      }
     }
     $574 = ($sp$0$i$i|0)==(0|0);
     if ($574) {
      label = 182;
     } else {
      $597 = HEAP32[((2568 + 12|0))>>2]|0;
      $598 = (($550) - ($597))|0;
      $599 = $598 & $551;
      $600 = ($599>>>0)<(2147483647);
      if ($600) {
       $601 = (_sbrk(($599|0))|0);
       $602 = HEAP32[$sp$0$i$i>>2]|0;
       $603 = HEAP32[$567>>2]|0;
       $604 = (($602) + ($603)|0);
       $605 = ($601|0)==($604|0);
       $$3$i = $605 ? $599 : 0;
       $$4$i = $605 ? $601 : (-1);
       $br$0$i = $601;$ssize$1$i = $599;$tbase$0$i = $$4$i;$tsize$0$i = $$3$i;
       label = 191;
      } else {
       $tsize$0323841$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 182) {
     $575 = (_sbrk(0)|0);
     $576 = ($575|0)==((-1)|0);
     if ($576) {
      $tsize$0323841$i = 0;
     } else {
      $577 = $575;
      $578 = HEAP32[((3040 + 4|0))>>2]|0;
      $579 = (($578) + -1)|0;
      $580 = $579 & $577;
      $581 = ($580|0)==(0);
      if ($581) {
       $ssize$0$i = $552;
      } else {
       $582 = (($579) + ($577))|0;
       $583 = (0 - ($578))|0;
       $584 = $582 & $583;
       $585 = (($552) - ($577))|0;
       $586 = (($585) + ($584))|0;
       $ssize$0$i = $586;
      }
      $587 = HEAP32[((2568 + 432|0))>>2]|0;
      $588 = (($587) + ($ssize$0$i))|0;
      $589 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $590 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $589 & $590;
      if ($or$cond$i29) {
       $591 = HEAP32[((2568 + 440|0))>>2]|0;
       $592 = ($591|0)==(0);
       if (!($592)) {
        $593 = ($588>>>0)<=($587>>>0);
        $594 = ($588>>>0)>($591>>>0);
        $or$cond2$i = $593 | $594;
        if ($or$cond2$i) {
         $tsize$0323841$i = 0;
         break;
        }
       }
       $595 = (_sbrk(($ssize$0$i|0))|0);
       $596 = ($595|0)==($575|0);
       $ssize$0$$i = $596 ? $ssize$0$i : 0;
       $$$i = $596 ? $575 : (-1);
       $br$0$i = $595;$ssize$1$i = $ssize$0$i;$tbase$0$i = $$$i;$tsize$0$i = $ssize$0$$i;
       label = 191;
      } else {
       $tsize$0323841$i = 0;
      }
     }
    }
   } while(0);
   L291: do {
    if ((label|0) == 191) {
     $606 = (0 - ($ssize$1$i))|0;
     $607 = ($tbase$0$i|0)==((-1)|0);
     if (!($607)) {
      $tbase$247$i = $tbase$0$i;$tsize$246$i = $tsize$0$i;
      label = 202;
      break L269;
     }
     $608 = ($br$0$i|0)!=((-1)|0);
     $609 = ($ssize$1$i>>>0)<(2147483647);
     $or$cond5$i = $608 & $609;
     $610 = ($ssize$1$i>>>0)<($547>>>0);
     $or$cond6$i = $or$cond5$i & $610;
     do {
      if ($or$cond6$i) {
       $611 = HEAP32[((3040 + 8|0))>>2]|0;
       $612 = (($549) - ($ssize$1$i))|0;
       $613 = (($612) + ($611))|0;
       $614 = (0 - ($611))|0;
       $615 = $613 & $614;
       $616 = ($615>>>0)<(2147483647);
       if ($616) {
        $617 = (_sbrk(($615|0))|0);
        $618 = ($617|0)==((-1)|0);
        if ($618) {
         (_sbrk(($606|0))|0);
         $tsize$0323841$i = $tsize$0$i;
         break L291;
        } else {
         $619 = (($615) + ($ssize$1$i))|0;
         $ssize$2$i = $619;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$i;
       }
      } else {
       $ssize$2$i = $ssize$1$i;
      }
     } while(0);
     $620 = ($br$0$i|0)==((-1)|0);
     if ($620) {
      $tsize$0323841$i = $tsize$0$i;
     } else {
      $tbase$247$i = $br$0$i;$tsize$246$i = $ssize$2$i;
      label = 202;
      break L269;
     }
    }
   } while(0);
   $621 = HEAP32[((2568 + 444|0))>>2]|0;
   $622 = $621 | 4;
   HEAP32[((2568 + 444|0))>>2] = $622;
   $tsize$1$i = $tsize$0323841$i;
   label = 199;
  } else {
   $tsize$1$i = 0;
   label = 199;
  }
 } while(0);
 if ((label|0) == 199) {
  $623 = ($552>>>0)<(2147483647);
  if ($623) {
   $624 = (_sbrk(($552|0))|0);
   $625 = (_sbrk(0)|0);
   $notlhs$i = ($624|0)!=((-1)|0);
   $notrhs$i = ($625|0)!=((-1)|0);
   $or$cond8$not$i = $notrhs$i & $notlhs$i;
   $626 = ($624>>>0)<($625>>>0);
   $or$cond9$i = $or$cond8$not$i & $626;
   if ($or$cond9$i) {
    $627 = $625;
    $628 = $624;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$247$i = $624;$tsize$246$i = $$tsize$1$i;
     label = 202;
    }
   }
  }
 }
 if ((label|0) == 202) {
  $632 = HEAP32[((2568 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$246$i))|0;
  HEAP32[((2568 + 432|0))>>2] = $633;
  $634 = HEAP32[((2568 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((2568 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((2568 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L311: do {
   if ($637) {
    $638 = HEAP32[((2568 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$247$i>>>0)<($638>>>0);
    $or$cond10$i = $639 | $640;
    if ($or$cond10$i) {
     HEAP32[((2568 + 16|0))>>2] = $tbase$247$i;
    }
    HEAP32[((2568 + 448|0))>>2] = $tbase$247$i;
    HEAP32[((2568 + 452|0))>>2] = $tsize$246$i;
    HEAP32[((2568 + 460|0))>>2] = 0;
    $641 = HEAP32[3040>>2]|0;
    HEAP32[((2568 + 36|0))>>2] = $641;
    HEAP32[((2568 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((2568 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((2568 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((2568 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$246$i) + -40)|0;
    $648 = (($tbase$247$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$247$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((2568 + 24|0))>>2] = $654;
    HEAP32[((2568 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i14$i = (($655) + 4)|0;
    $658 = (($tbase$247$i) + ($$sum$i14$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$246$i) + -36)|0;
    $659 = (($tbase$247$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((3040 + 16|0))>>2]|0;
    HEAP32[((2568 + 28|0))>>2] = $660;
   } else {
    $sp$075$i = ((2568 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$075$i>>2]|0;
     $662 = (($sp$075$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$247$i|0)==($664|0);
     if ($665) {
      label = 214;
      break;
     }
     $666 = (($sp$075$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$075$i = $667;
     }
    }
    if ((label|0) == 214) {
     $669 = (($sp$075$i) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($661>>>0);
      $674 = ($636>>>0)<($tbase$247$i>>>0);
      $or$cond49$i = $673 & $674;
      if ($or$cond49$i) {
       $675 = (($663) + ($tsize$246$i))|0;
       HEAP32[$662>>2] = $675;
       $676 = HEAP32[((2568 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$246$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((2568 + 24|0))>>2] = $684;
       HEAP32[((2568 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i18$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i18$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i19$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i19$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((3040 + 16|0))>>2]|0;
       HEAP32[((2568 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((2568 + 16|0))>>2]|0;
    $692 = ($tbase$247$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((2568 + 16|0))>>2] = $tbase$247$i;
    }
    $693 = (($tbase$247$i) + ($tsize$246$i)|0);
    $sp$168$i = ((2568 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$168$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      label = 224;
      break;
     }
     $696 = (($sp$168$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$168$i = $697;
     }
    }
    if ((label|0) == 224) {
     $699 = (($sp$168$i) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$sp$168$i>>2] = $tbase$247$i;
      $703 = (($sp$168$i) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$246$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$247$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$247$i) + ($713)|0);
      $$sum107$i = (($tsize$246$i) + 8)|0;
      $714 = (($tbase$247$i) + ($$sum107$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum108$i = (($720) + ($tsize$246$i))|0;
      $721 = (($tbase$247$i) + ($$sum108$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i21$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$247$i) + ($$sum$i21$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i22$i = (($713) + 4)|0;
      $728 = (($tbase$247$i) + ($$sum1$i22$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = HEAP32[((2568 + 24|0))>>2]|0;
      $730 = ($721|0)==($729|0);
      L338: do {
       if ($730) {
        $731 = HEAP32[((2568 + 12|0))>>2]|0;
        $732 = (($731) + ($726))|0;
        HEAP32[((2568 + 12|0))>>2] = $732;
        HEAP32[((2568 + 24|0))>>2] = $725;
        $733 = $732 | 1;
        $$sum42$i$i = (($$sum$i21$i) + 4)|0;
        $734 = (($tbase$247$i) + ($$sum42$i$i)|0);
        HEAP32[$734>>2] = $733;
       } else {
        $735 = HEAP32[((2568 + 20|0))>>2]|0;
        $736 = ($721|0)==($735|0);
        if ($736) {
         $737 = HEAP32[((2568 + 8|0))>>2]|0;
         $738 = (($737) + ($726))|0;
         HEAP32[((2568 + 8|0))>>2] = $738;
         HEAP32[((2568 + 20|0))>>2] = $725;
         $739 = $738 | 1;
         $$sum40$i$i = (($$sum$i21$i) + 4)|0;
         $740 = (($tbase$247$i) + ($$sum40$i$i)|0);
         HEAP32[$740>>2] = $739;
         $$sum41$i$i = (($738) + ($$sum$i21$i))|0;
         $741 = (($tbase$247$i) + ($$sum41$i$i)|0);
         HEAP32[$741>>2] = $738;
         break;
        }
        $$sum2$i23$i = (($tsize$246$i) + 4)|0;
        $$sum109$i = (($$sum2$i23$i) + ($720))|0;
        $742 = (($tbase$247$i) + ($$sum109$i)|0);
        $743 = HEAP32[$742>>2]|0;
        $744 = $743 & 3;
        $745 = ($744|0)==(1);
        if ($745) {
         $746 = $743 & -8;
         $747 = $743 >>> 3;
         $748 = ($743>>>0)<(256);
         L346: do {
          if ($748) {
           $$sum3738$i$i = $720 | 8;
           $$sum119$i = (($$sum3738$i$i) + ($tsize$246$i))|0;
           $749 = (($tbase$247$i) + ($$sum119$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $$sum39$i$i = (($tsize$246$i) + 12)|0;
           $$sum120$i = (($$sum39$i$i) + ($720))|0;
           $751 = (($tbase$247$i) + ($$sum120$i)|0);
           $752 = HEAP32[$751>>2]|0;
           $753 = $747 << 1;
           $754 = ((2568 + ($753<<2)|0) + 40|0);
           $755 = ($750|0)==($754|0);
           do {
            if (!($755)) {
             $756 = HEAP32[((2568 + 16|0))>>2]|0;
             $757 = ($750>>>0)<($756>>>0);
             if ($757) {
              _abort();
              // unreachable;
             }
             $758 = (($750) + 12|0);
             $759 = HEAP32[$758>>2]|0;
             $760 = ($759|0)==($721|0);
             if ($760) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $761 = ($752|0)==($750|0);
           if ($761) {
            $762 = 1 << $747;
            $763 = $762 ^ -1;
            $764 = HEAP32[2568>>2]|0;
            $765 = $764 & $763;
            HEAP32[2568>>2] = $765;
            break;
           }
           $766 = ($752|0)==($754|0);
           do {
            if ($766) {
             $$pre57$i$i = (($752) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $767 = HEAP32[((2568 + 16|0))>>2]|0;
             $768 = ($752>>>0)<($767>>>0);
             if ($768) {
              _abort();
              // unreachable;
             }
             $769 = (($752) + 8|0);
             $770 = HEAP32[$769>>2]|0;
             $771 = ($770|0)==($721|0);
             if ($771) {
              $$pre$phi58$i$iZ2D = $769;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $772 = (($750) + 12|0);
           HEAP32[$772>>2] = $752;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $750;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum110$i = (($$sum34$i$i) + ($tsize$246$i))|0;
           $773 = (($tbase$247$i) + ($$sum110$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $$sum5$i$i = (($tsize$246$i) + 12)|0;
           $$sum111$i = (($$sum5$i$i) + ($720))|0;
           $775 = (($tbase$247$i) + ($$sum111$i)|0);
           $776 = HEAP32[$775>>2]|0;
           $777 = ($776|0)==($721|0);
           do {
            if ($777) {
             $$sum67$i$i = $720 | 16;
             $$sum117$i = (($$sum2$i23$i) + ($$sum67$i$i))|0;
             $788 = (($tbase$247$i) + ($$sum117$i)|0);
             $789 = HEAP32[$788>>2]|0;
             $790 = ($789|0)==(0|0);
             if ($790) {
              $$sum118$i = (($$sum67$i$i) + ($tsize$246$i))|0;
              $791 = (($tbase$247$i) + ($$sum118$i)|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if ($793) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $792;$RP$0$i$i = $791;
              }
             } else {
              $R$0$i$i = $789;$RP$0$i$i = $788;
             }
             while(1) {
              $794 = (($R$0$i$i) + 20|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if (!($796)) {
               $R$0$i$i = $795;$RP$0$i$i = $794;
               continue;
              }
              $797 = (($R$0$i$i) + 16|0);
              $798 = HEAP32[$797>>2]|0;
              $799 = ($798|0)==(0|0);
              if ($799) {
               break;
              } else {
               $R$0$i$i = $798;$RP$0$i$i = $797;
              }
             }
             $800 = HEAP32[((2568 + 16|0))>>2]|0;
             $801 = ($RP$0$i$i>>>0)<($800>>>0);
             if ($801) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum112$i = (($$sum3536$i$i) + ($tsize$246$i))|0;
             $778 = (($tbase$247$i) + ($$sum112$i)|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = HEAP32[((2568 + 16|0))>>2]|0;
             $781 = ($779>>>0)<($780>>>0);
             if ($781) {
              _abort();
              // unreachable;
             }
             $782 = (($779) + 12|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if (!($784)) {
              _abort();
              // unreachable;
             }
             $785 = (($776) + 8|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==($721|0);
             if ($787) {
              HEAP32[$782>>2] = $776;
              HEAP32[$785>>2] = $779;
              $R$1$i$i = $776;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $802 = ($774|0)==(0|0);
           if ($802) {
            break;
           }
           $$sum30$i$i = (($tsize$246$i) + 28)|0;
           $$sum113$i = (($$sum30$i$i) + ($720))|0;
           $803 = (($tbase$247$i) + ($$sum113$i)|0);
           $804 = HEAP32[$803>>2]|0;
           $805 = ((2568 + ($804<<2)|0) + 304|0);
           $806 = HEAP32[$805>>2]|0;
           $807 = ($721|0)==($806|0);
           do {
            if ($807) {
             HEAP32[$805>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $808 = 1 << $804;
             $809 = $808 ^ -1;
             $810 = HEAP32[((2568 + 4|0))>>2]|0;
             $811 = $810 & $809;
             HEAP32[((2568 + 4|0))>>2] = $811;
             break L346;
            } else {
             $812 = HEAP32[((2568 + 16|0))>>2]|0;
             $813 = ($774>>>0)<($812>>>0);
             if ($813) {
              _abort();
              // unreachable;
             }
             $814 = (($774) + 16|0);
             $815 = HEAP32[$814>>2]|0;
             $816 = ($815|0)==($721|0);
             if ($816) {
              HEAP32[$814>>2] = $R$1$i$i;
             } else {
              $817 = (($774) + 20|0);
              HEAP32[$817>>2] = $R$1$i$i;
             }
             $818 = ($R$1$i$i|0)==(0|0);
             if ($818) {
              break L346;
             }
            }
           } while(0);
           $819 = HEAP32[((2568 + 16|0))>>2]|0;
           $820 = ($R$1$i$i>>>0)<($819>>>0);
           if ($820) {
            _abort();
            // unreachable;
           }
           $821 = (($R$1$i$i) + 24|0);
           HEAP32[$821>>2] = $774;
           $$sum3132$i$i = $720 | 16;
           $$sum114$i = (($$sum3132$i$i) + ($tsize$246$i))|0;
           $822 = (($tbase$247$i) + ($$sum114$i)|0);
           $823 = HEAP32[$822>>2]|0;
           $824 = ($823|0)==(0|0);
           do {
            if (!($824)) {
             $825 = HEAP32[((2568 + 16|0))>>2]|0;
             $826 = ($823>>>0)<($825>>>0);
             if ($826) {
              _abort();
              // unreachable;
             } else {
              $827 = (($R$1$i$i) + 16|0);
              HEAP32[$827>>2] = $823;
              $828 = (($823) + 24|0);
              HEAP32[$828>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum115$i = (($$sum2$i23$i) + ($$sum3132$i$i))|0;
           $829 = (($tbase$247$i) + ($$sum115$i)|0);
           $830 = HEAP32[$829>>2]|0;
           $831 = ($830|0)==(0|0);
           if ($831) {
            break;
           }
           $832 = HEAP32[((2568 + 16|0))>>2]|0;
           $833 = ($830>>>0)<($832>>>0);
           if ($833) {
            _abort();
            // unreachable;
           } else {
            $834 = (($R$1$i$i) + 20|0);
            HEAP32[$834>>2] = $830;
            $835 = (($830) + 24|0);
            HEAP32[$835>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $746 | $720;
         $$sum116$i = (($$sum9$i$i) + ($tsize$246$i))|0;
         $836 = (($tbase$247$i) + ($$sum116$i)|0);
         $837 = (($746) + ($726))|0;
         $oldfirst$0$i$i = $836;$qsize$0$i$i = $837;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $838 = (($oldfirst$0$i$i) + 4|0);
        $839 = HEAP32[$838>>2]|0;
        $840 = $839 & -2;
        HEAP32[$838>>2] = $840;
        $841 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i21$i) + 4)|0;
        $842 = (($tbase$247$i) + ($$sum10$i$i)|0);
        HEAP32[$842>>2] = $841;
        $$sum11$i24$i = (($qsize$0$i$i) + ($$sum$i21$i))|0;
        $843 = (($tbase$247$i) + ($$sum11$i24$i)|0);
        HEAP32[$843>>2] = $qsize$0$i$i;
        $844 = $qsize$0$i$i >>> 3;
        $845 = ($qsize$0$i$i>>>0)<(256);
        if ($845) {
         $846 = $844 << 1;
         $847 = ((2568 + ($846<<2)|0) + 40|0);
         $848 = HEAP32[2568>>2]|0;
         $849 = 1 << $844;
         $850 = $848 & $849;
         $851 = ($850|0)==(0);
         do {
          if ($851) {
           $852 = $848 | $849;
           HEAP32[2568>>2] = $852;
           $$sum26$pre$i$i = (($846) + 2)|0;
           $$pre$i25$i = ((2568 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i26$iZ2D = $$pre$i25$i;$F4$0$i$i = $847;
          } else {
           $$sum29$i$i = (($846) + 2)|0;
           $853 = ((2568 + ($$sum29$i$i<<2)|0) + 40|0);
           $854 = HEAP32[$853>>2]|0;
           $855 = HEAP32[((2568 + 16|0))>>2]|0;
           $856 = ($854>>>0)<($855>>>0);
           if (!($856)) {
            $$pre$phi$i26$iZ2D = $853;$F4$0$i$i = $854;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i26$iZ2D>>2] = $725;
         $857 = (($F4$0$i$i) + 12|0);
         HEAP32[$857>>2] = $725;
         $$sum27$i$i = (($$sum$i21$i) + 8)|0;
         $858 = (($tbase$247$i) + ($$sum27$i$i)|0);
         HEAP32[$858>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i21$i) + 12)|0;
         $859 = (($tbase$247$i) + ($$sum28$i$i)|0);
         HEAP32[$859>>2] = $847;
         break;
        }
        $860 = $qsize$0$i$i >>> 8;
        $861 = ($860|0)==(0);
        do {
         if ($861) {
          $I7$0$i$i = 0;
         } else {
          $862 = ($qsize$0$i$i>>>0)>(16777215);
          if ($862) {
           $I7$0$i$i = 31;
           break;
          }
          $863 = (($860) + 1048320)|0;
          $864 = $863 >>> 16;
          $865 = $864 & 8;
          $866 = $860 << $865;
          $867 = (($866) + 520192)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 4;
          $870 = $869 | $865;
          $871 = $866 << $869;
          $872 = (($871) + 245760)|0;
          $873 = $872 >>> 16;
          $874 = $873 & 2;
          $875 = $870 | $874;
          $876 = (14 - ($875))|0;
          $877 = $871 << $874;
          $878 = $877 >>> 15;
          $879 = (($876) + ($878))|0;
          $880 = $879 << 1;
          $881 = (($879) + 7)|0;
          $882 = $qsize$0$i$i >>> $881;
          $883 = $882 & 1;
          $884 = $883 | $880;
          $I7$0$i$i = $884;
         }
        } while(0);
        $885 = ((2568 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i21$i) + 28)|0;
        $886 = (($tbase$247$i) + ($$sum12$i$i)|0);
        HEAP32[$886>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i21$i) + 16)|0;
        $887 = (($tbase$247$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i21$i) + 20)|0;
        $888 = (($tbase$247$i) + ($$sum14$i$i)|0);
        HEAP32[$888>>2] = 0;
        HEAP32[$887>>2] = 0;
        $889 = HEAP32[((2568 + 4|0))>>2]|0;
        $890 = 1 << $I7$0$i$i;
        $891 = $889 & $890;
        $892 = ($891|0)==(0);
        if ($892) {
         $893 = $889 | $890;
         HEAP32[((2568 + 4|0))>>2] = $893;
         HEAP32[$885>>2] = $725;
         $$sum15$i$i = (($$sum$i21$i) + 24)|0;
         $894 = (($tbase$247$i) + ($$sum15$i$i)|0);
         HEAP32[$894>>2] = $885;
         $$sum16$i$i = (($$sum$i21$i) + 12)|0;
         $895 = (($tbase$247$i) + ($$sum16$i$i)|0);
         HEAP32[$895>>2] = $725;
         $$sum17$i$i = (($$sum$i21$i) + 8)|0;
         $896 = (($tbase$247$i) + ($$sum17$i$i)|0);
         HEAP32[$896>>2] = $725;
         break;
        }
        $897 = HEAP32[$885>>2]|0;
        $898 = ($I7$0$i$i|0)==(31);
        if ($898) {
         $906 = 0;
        } else {
         $899 = $I7$0$i$i >>> 1;
         $900 = (25 - ($899))|0;
         $906 = $900;
        }
        $901 = (($897) + 4|0);
        $902 = HEAP32[$901>>2]|0;
        $903 = $902 & -8;
        $904 = ($903|0)==($qsize$0$i$i|0);
        L435: do {
         if ($904) {
          $T$0$lcssa$i28$i = $897;
         } else {
          $905 = $qsize$0$i$i << $906;
          $K8$052$i$i = $905;$T$051$i$i = $897;
          while(1) {
           $913 = $K8$052$i$i >>> 31;
           $914 = ((($T$051$i$i) + ($913<<2)|0) + 16|0);
           $909 = HEAP32[$914>>2]|0;
           $915 = ($909|0)==(0|0);
           if ($915) {
            break;
           }
           $907 = $K8$052$i$i << 1;
           $908 = (($909) + 4|0);
           $910 = HEAP32[$908>>2]|0;
           $911 = $910 & -8;
           $912 = ($911|0)==($qsize$0$i$i|0);
           if ($912) {
            $T$0$lcssa$i28$i = $909;
            break L435;
           } else {
            $K8$052$i$i = $907;$T$051$i$i = $909;
           }
          }
          $916 = HEAP32[((2568 + 16|0))>>2]|0;
          $917 = ($914>>>0)<($916>>>0);
          if ($917) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$914>>2] = $725;
           $$sum23$i$i = (($$sum$i21$i) + 24)|0;
           $918 = (($tbase$247$i) + ($$sum23$i$i)|0);
           HEAP32[$918>>2] = $T$051$i$i;
           $$sum24$i$i = (($$sum$i21$i) + 12)|0;
           $919 = (($tbase$247$i) + ($$sum24$i$i)|0);
           HEAP32[$919>>2] = $725;
           $$sum25$i$i = (($$sum$i21$i) + 8)|0;
           $920 = (($tbase$247$i) + ($$sum25$i$i)|0);
           HEAP32[$920>>2] = $725;
           break L338;
          }
         }
        } while(0);
        $921 = (($T$0$lcssa$i28$i) + 8|0);
        $922 = HEAP32[$921>>2]|0;
        $923 = HEAP32[((2568 + 16|0))>>2]|0;
        $924 = ($T$0$lcssa$i28$i>>>0)<($923>>>0);
        if ($924) {
         _abort();
         // unreachable;
        }
        $925 = ($922>>>0)<($923>>>0);
        if ($925) {
         _abort();
         // unreachable;
        } else {
         $926 = (($922) + 12|0);
         HEAP32[$926>>2] = $725;
         HEAP32[$921>>2] = $725;
         $$sum20$i$i = (($$sum$i21$i) + 8)|0;
         $927 = (($tbase$247$i) + ($$sum20$i$i)|0);
         HEAP32[$927>>2] = $922;
         $$sum21$i$i = (($$sum$i21$i) + 12)|0;
         $928 = (($tbase$247$i) + ($$sum21$i$i)|0);
         HEAP32[$928>>2] = $T$0$lcssa$i28$i;
         $$sum22$i$i = (($$sum$i21$i) + 24)|0;
         $929 = (($tbase$247$i) + ($$sum22$i$i)|0);
         HEAP32[$929>>2] = 0;
         break;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $930 = (($tbase$247$i) + ($$sum1819$i$i)|0);
      $mem$0 = $930;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((2568 + 448|0));
    while(1) {
     $931 = HEAP32[$sp$0$i$i$i>>2]|0;
     $932 = ($931>>>0)>($636>>>0);
     if (!($932)) {
      $933 = (($sp$0$i$i$i) + 4|0);
      $934 = HEAP32[$933>>2]|0;
      $935 = (($931) + ($934)|0);
      $936 = ($935>>>0)>($636>>>0);
      if ($936) {
       break;
      }
     }
     $937 = (($sp$0$i$i$i) + 8|0);
     $938 = HEAP32[$937>>2]|0;
     $sp$0$i$i$i = $938;
    }
    $$sum$i15$i = (($934) + -47)|0;
    $$sum1$i16$i = (($934) + -39)|0;
    $939 = (($931) + ($$sum1$i16$i)|0);
    $940 = $939;
    $941 = $940 & 7;
    $942 = ($941|0)==(0);
    if ($942) {
     $945 = 0;
    } else {
     $943 = (0 - ($940))|0;
     $944 = $943 & 7;
     $945 = $944;
    }
    $$sum2$i17$i = (($$sum$i15$i) + ($945))|0;
    $946 = (($931) + ($$sum2$i17$i)|0);
    $947 = (($636) + 16|0);
    $948 = ($946>>>0)<($947>>>0);
    $949 = $948 ? $636 : $946;
    $950 = (($949) + 8|0);
    $951 = (($tsize$246$i) + -40)|0;
    $952 = (($tbase$247$i) + 8|0);
    $953 = $952;
    $954 = $953 & 7;
    $955 = ($954|0)==(0);
    if ($955) {
     $959 = 0;
    } else {
     $956 = (0 - ($953))|0;
     $957 = $956 & 7;
     $959 = $957;
    }
    $958 = (($tbase$247$i) + ($959)|0);
    $960 = (($951) - ($959))|0;
    HEAP32[((2568 + 24|0))>>2] = $958;
    HEAP32[((2568 + 12|0))>>2] = $960;
    $961 = $960 | 1;
    $$sum$i$i$i = (($959) + 4)|0;
    $962 = (($tbase$247$i) + ($$sum$i$i$i)|0);
    HEAP32[$962>>2] = $961;
    $$sum2$i$i$i = (($tsize$246$i) + -36)|0;
    $963 = (($tbase$247$i) + ($$sum2$i$i$i)|0);
    HEAP32[$963>>2] = 40;
    $964 = HEAP32[((3040 + 16|0))>>2]|0;
    HEAP32[((2568 + 28|0))>>2] = $964;
    $965 = (($949) + 4|0);
    HEAP32[$965>>2] = 27;
    ;HEAP32[$950+0>>2]=HEAP32[((2568 + 448|0))+0>>2]|0;HEAP32[$950+4>>2]=HEAP32[((2568 + 448|0))+4>>2]|0;HEAP32[$950+8>>2]=HEAP32[((2568 + 448|0))+8>>2]|0;HEAP32[$950+12>>2]=HEAP32[((2568 + 448|0))+12>>2]|0;
    HEAP32[((2568 + 448|0))>>2] = $tbase$247$i;
    HEAP32[((2568 + 452|0))>>2] = $tsize$246$i;
    HEAP32[((2568 + 460|0))>>2] = 0;
    HEAP32[((2568 + 456|0))>>2] = $950;
    $966 = (($949) + 28|0);
    HEAP32[$966>>2] = 7;
    $967 = (($949) + 32|0);
    $968 = ($967>>>0)<($935>>>0);
    if ($968) {
     $970 = $966;
     while(1) {
      $969 = (($970) + 4|0);
      HEAP32[$969>>2] = 7;
      $971 = (($970) + 8|0);
      $972 = ($971>>>0)<($935>>>0);
      if ($972) {
       $970 = $969;
      } else {
       break;
      }
     }
    }
    $973 = ($949|0)==($636|0);
    if (!($973)) {
     $974 = $949;
     $975 = $636;
     $976 = (($974) - ($975))|0;
     $977 = (($636) + ($976)|0);
     $$sum3$i$i = (($976) + 4)|0;
     $978 = (($636) + ($$sum3$i$i)|0);
     $979 = HEAP32[$978>>2]|0;
     $980 = $979 & -2;
     HEAP32[$978>>2] = $980;
     $981 = $976 | 1;
     $982 = (($636) + 4|0);
     HEAP32[$982>>2] = $981;
     HEAP32[$977>>2] = $976;
     $983 = $976 >>> 3;
     $984 = ($976>>>0)<(256);
     if ($984) {
      $985 = $983 << 1;
      $986 = ((2568 + ($985<<2)|0) + 40|0);
      $987 = HEAP32[2568>>2]|0;
      $988 = 1 << $983;
      $989 = $987 & $988;
      $990 = ($989|0)==(0);
      do {
       if ($990) {
        $991 = $987 | $988;
        HEAP32[2568>>2] = $991;
        $$sum10$pre$i$i = (($985) + 2)|0;
        $$pre$i$i = ((2568 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $986;
       } else {
        $$sum11$i$i = (($985) + 2)|0;
        $992 = ((2568 + ($$sum11$i$i<<2)|0) + 40|0);
        $993 = HEAP32[$992>>2]|0;
        $994 = HEAP32[((2568 + 16|0))>>2]|0;
        $995 = ($993>>>0)<($994>>>0);
        if (!($995)) {
         $$pre$phi$i$iZ2D = $992;$F$0$i$i = $993;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $996 = (($F$0$i$i) + 12|0);
      HEAP32[$996>>2] = $636;
      $997 = (($636) + 8|0);
      HEAP32[$997>>2] = $F$0$i$i;
      $998 = (($636) + 12|0);
      HEAP32[$998>>2] = $986;
      break;
     }
     $999 = $976 >>> 8;
     $1000 = ($999|0)==(0);
     if ($1000) {
      $I1$0$i$i = 0;
     } else {
      $1001 = ($976>>>0)>(16777215);
      if ($1001) {
       $I1$0$i$i = 31;
      } else {
       $1002 = (($999) + 1048320)|0;
       $1003 = $1002 >>> 16;
       $1004 = $1003 & 8;
       $1005 = $999 << $1004;
       $1006 = (($1005) + 520192)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 4;
       $1009 = $1008 | $1004;
       $1010 = $1005 << $1008;
       $1011 = (($1010) + 245760)|0;
       $1012 = $1011 >>> 16;
       $1013 = $1012 & 2;
       $1014 = $1009 | $1013;
       $1015 = (14 - ($1014))|0;
       $1016 = $1010 << $1013;
       $1017 = $1016 >>> 15;
       $1018 = (($1015) + ($1017))|0;
       $1019 = $1018 << 1;
       $1020 = (($1018) + 7)|0;
       $1021 = $976 >>> $1020;
       $1022 = $1021 & 1;
       $1023 = $1022 | $1019;
       $I1$0$i$i = $1023;
      }
     }
     $1024 = ((2568 + ($I1$0$i$i<<2)|0) + 304|0);
     $1025 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1025>>2] = $I1$0$c$i$i;
     $1026 = (($636) + 20|0);
     HEAP32[$1026>>2] = 0;
     $1027 = (($636) + 16|0);
     HEAP32[$1027>>2] = 0;
     $1028 = HEAP32[((2568 + 4|0))>>2]|0;
     $1029 = 1 << $I1$0$i$i;
     $1030 = $1028 & $1029;
     $1031 = ($1030|0)==(0);
     if ($1031) {
      $1032 = $1028 | $1029;
      HEAP32[((2568 + 4|0))>>2] = $1032;
      HEAP32[$1024>>2] = $636;
      $1033 = (($636) + 24|0);
      HEAP32[$1033>>2] = $1024;
      $1034 = (($636) + 12|0);
      HEAP32[$1034>>2] = $636;
      $1035 = (($636) + 8|0);
      HEAP32[$1035>>2] = $636;
      break;
     }
     $1036 = HEAP32[$1024>>2]|0;
     $1037 = ($I1$0$i$i|0)==(31);
     if ($1037) {
      $1045 = 0;
     } else {
      $1038 = $I1$0$i$i >>> 1;
      $1039 = (25 - ($1038))|0;
      $1045 = $1039;
     }
     $1040 = (($1036) + 4|0);
     $1041 = HEAP32[$1040>>2]|0;
     $1042 = $1041 & -8;
     $1043 = ($1042|0)==($976|0);
     L489: do {
      if ($1043) {
       $T$0$lcssa$i$i = $1036;
      } else {
       $1044 = $976 << $1045;
       $K2$014$i$i = $1044;$T$013$i$i = $1036;
       while(1) {
        $1052 = $K2$014$i$i >>> 31;
        $1053 = ((($T$013$i$i) + ($1052<<2)|0) + 16|0);
        $1048 = HEAP32[$1053>>2]|0;
        $1054 = ($1048|0)==(0|0);
        if ($1054) {
         break;
        }
        $1046 = $K2$014$i$i << 1;
        $1047 = (($1048) + 4|0);
        $1049 = HEAP32[$1047>>2]|0;
        $1050 = $1049 & -8;
        $1051 = ($1050|0)==($976|0);
        if ($1051) {
         $T$0$lcssa$i$i = $1048;
         break L489;
        } else {
         $K2$014$i$i = $1046;$T$013$i$i = $1048;
        }
       }
       $1055 = HEAP32[((2568 + 16|0))>>2]|0;
       $1056 = ($1053>>>0)<($1055>>>0);
       if ($1056) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1053>>2] = $636;
        $1057 = (($636) + 24|0);
        HEAP32[$1057>>2] = $T$013$i$i;
        $1058 = (($636) + 12|0);
        HEAP32[$1058>>2] = $636;
        $1059 = (($636) + 8|0);
        HEAP32[$1059>>2] = $636;
        break L311;
       }
      }
     } while(0);
     $1060 = (($T$0$lcssa$i$i) + 8|0);
     $1061 = HEAP32[$1060>>2]|0;
     $1062 = HEAP32[((2568 + 16|0))>>2]|0;
     $1063 = ($T$0$lcssa$i$i>>>0)<($1062>>>0);
     if ($1063) {
      _abort();
      // unreachable;
     }
     $1064 = ($1061>>>0)<($1062>>>0);
     if ($1064) {
      _abort();
      // unreachable;
     } else {
      $1065 = (($1061) + 12|0);
      HEAP32[$1065>>2] = $636;
      HEAP32[$1060>>2] = $636;
      $1066 = (($636) + 8|0);
      HEAP32[$1066>>2] = $1061;
      $1067 = (($636) + 12|0);
      HEAP32[$1067>>2] = $T$0$lcssa$i$i;
      $1068 = (($636) + 24|0);
      HEAP32[$1068>>2] = 0;
      break;
     }
    }
   }
  } while(0);
  $1069 = HEAP32[((2568 + 12|0))>>2]|0;
  $1070 = ($1069>>>0)>($nb$0>>>0);
  if ($1070) {
   $1071 = (($1069) - ($nb$0))|0;
   HEAP32[((2568 + 12|0))>>2] = $1071;
   $1072 = HEAP32[((2568 + 24|0))>>2]|0;
   $1073 = (($1072) + ($nb$0)|0);
   HEAP32[((2568 + 24|0))>>2] = $1073;
   $1074 = $1071 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1075 = (($1072) + ($$sum$i32)|0);
   HEAP32[$1075>>2] = $1074;
   $1076 = $nb$0 | 3;
   $1077 = (($1072) + 4|0);
   HEAP32[$1077>>2] = $1076;
   $1078 = (($1072) + 8|0);
   $mem$0 = $1078;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1079 = (___errno_location()|0);
 HEAP32[$1079>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi68Z2D = 0, $$pre$phi70Z2D = 0, $$pre$phiZ2D = 0, $$pre67 = 0, $$pre69 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $322 = 0, $323 = 0, $324 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$057 = 0;
 var $R$0 = 0, $R$1 = 0, $R7$0 = 0, $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$056 = 0, $cond = 0, $cond54 = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((2568 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((2568 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $104 = (($mem) + ($$sum3)|0);
    $105 = HEAP32[$104>>2]|0;
    $106 = $105 & 3;
    $107 = ($106|0)==(3);
    if (!($107)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((2568 + 8|0))>>2] = $15;
    $108 = HEAP32[$104>>2]|0;
    $109 = $108 & -2;
    HEAP32[$104>>2] = $109;
    $110 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $111 = (($mem) + ($$sum26)|0);
    HEAP32[$111>>2] = $110;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((2568 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[2568>>2]|0;
     $36 = $35 & $34;
     HEAP32[2568>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre69 = (($24) + 8|0);
     $$pre$phi70Z2D = $$pre69;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi70Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi70Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((2568 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((2568 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((2568 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((2568 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((2568 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = HEAP32[((2568 + 16|0))>>2]|0;
      $94 = ($91>>>0)<($93>>>0);
      if ($94) {
       _abort();
       // unreachable;
      } else {
       $95 = (($R$1) + 16|0);
       HEAP32[$95>>2] = $91;
       $96 = (($91) + 24|0);
       HEAP32[$96>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $97 = (($mem) + ($$sum34)|0);
    $98 = HEAP32[$97>>2]|0;
    $99 = ($98|0)==(0|0);
    if ($99) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $100 = HEAP32[((2568 + 16|0))>>2]|0;
     $101 = ($98>>>0)<($100>>>0);
     if ($101) {
      _abort();
      // unreachable;
     } else {
      $102 = (($R$1) + 20|0);
      HEAP32[$102>>2] = $98;
      $103 = (($98) + 24|0);
      HEAP32[$103>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $112 = ($p$0>>>0)<($9>>>0);
 if (!($112)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $113 = (($mem) + ($$sum25)|0);
 $114 = HEAP32[$113>>2]|0;
 $115 = $114 & 1;
 $116 = ($115|0)==(0);
 if ($116) {
  _abort();
  // unreachable;
 }
 $117 = $114 & 2;
 $118 = ($117|0)==(0);
 if ($118) {
  $119 = HEAP32[((2568 + 24|0))>>2]|0;
  $120 = ($9|0)==($119|0);
  if ($120) {
   $121 = HEAP32[((2568 + 12|0))>>2]|0;
   $122 = (($121) + ($psize$0))|0;
   HEAP32[((2568 + 12|0))>>2] = $122;
   HEAP32[((2568 + 24|0))>>2] = $p$0;
   $123 = $122 | 1;
   $124 = (($p$0) + 4|0);
   HEAP32[$124>>2] = $123;
   $125 = HEAP32[((2568 + 20|0))>>2]|0;
   $126 = ($p$0|0)==($125|0);
   if (!($126)) {
    STACKTOP = sp;return;
   }
   HEAP32[((2568 + 20|0))>>2] = 0;
   HEAP32[((2568 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $127 = HEAP32[((2568 + 20|0))>>2]|0;
  $128 = ($9|0)==($127|0);
  if ($128) {
   $129 = HEAP32[((2568 + 8|0))>>2]|0;
   $130 = (($129) + ($psize$0))|0;
   HEAP32[((2568 + 8|0))>>2] = $130;
   HEAP32[((2568 + 20|0))>>2] = $p$0;
   $131 = $130 | 1;
   $132 = (($p$0) + 4|0);
   HEAP32[$132>>2] = $131;
   $133 = (($p$0) + ($130)|0);
   HEAP32[$133>>2] = $130;
   STACKTOP = sp;return;
  }
  $134 = $114 & -8;
  $135 = (($134) + ($psize$0))|0;
  $136 = $114 >>> 3;
  $137 = ($114>>>0)<(256);
  do {
   if ($137) {
    $138 = (($mem) + ($8)|0);
    $139 = HEAP32[$138>>2]|0;
    $$sum2324 = $8 | 4;
    $140 = (($mem) + ($$sum2324)|0);
    $141 = HEAP32[$140>>2]|0;
    $142 = $136 << 1;
    $143 = ((2568 + ($142<<2)|0) + 40|0);
    $144 = ($139|0)==($143|0);
    if (!($144)) {
     $145 = HEAP32[((2568 + 16|0))>>2]|0;
     $146 = ($139>>>0)<($145>>>0);
     if ($146) {
      _abort();
      // unreachable;
     }
     $147 = (($139) + 12|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = ($148|0)==($9|0);
     if (!($149)) {
      _abort();
      // unreachable;
     }
    }
    $150 = ($141|0)==($139|0);
    if ($150) {
     $151 = 1 << $136;
     $152 = $151 ^ -1;
     $153 = HEAP32[2568>>2]|0;
     $154 = $153 & $152;
     HEAP32[2568>>2] = $154;
     break;
    }
    $155 = ($141|0)==($143|0);
    if ($155) {
     $$pre67 = (($141) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $156 = HEAP32[((2568 + 16|0))>>2]|0;
     $157 = ($141>>>0)<($156>>>0);
     if ($157) {
      _abort();
      // unreachable;
     }
     $158 = (($141) + 8|0);
     $159 = HEAP32[$158>>2]|0;
     $160 = ($159|0)==($9|0);
     if ($160) {
      $$pre$phi68Z2D = $158;
     } else {
      _abort();
      // unreachable;
     }
    }
    $161 = (($139) + 12|0);
    HEAP32[$161>>2] = $141;
    HEAP32[$$pre$phi68Z2D>>2] = $139;
   } else {
    $$sum5 = (($8) + 16)|0;
    $162 = (($mem) + ($$sum5)|0);
    $163 = HEAP32[$162>>2]|0;
    $$sum67 = $8 | 4;
    $164 = (($mem) + ($$sum67)|0);
    $165 = HEAP32[$164>>2]|0;
    $166 = ($165|0)==($9|0);
    do {
     if ($166) {
      $$sum9 = (($8) + 12)|0;
      $177 = (($mem) + ($$sum9)|0);
      $178 = HEAP32[$177>>2]|0;
      $179 = ($178|0)==(0|0);
      if ($179) {
       $$sum8 = (($8) + 8)|0;
       $180 = (($mem) + ($$sum8)|0);
       $181 = HEAP32[$180>>2]|0;
       $182 = ($181|0)==(0|0);
       if ($182) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $181;$RP9$0 = $180;
       }
      } else {
       $R7$0 = $178;$RP9$0 = $177;
      }
      while(1) {
       $183 = (($R7$0) + 20|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($184|0)==(0|0);
       if (!($185)) {
        $R7$0 = $184;$RP9$0 = $183;
        continue;
       }
       $186 = (($R7$0) + 16|0);
       $187 = HEAP32[$186>>2]|0;
       $188 = ($187|0)==(0|0);
       if ($188) {
        break;
       } else {
        $R7$0 = $187;$RP9$0 = $186;
       }
      }
      $189 = HEAP32[((2568 + 16|0))>>2]|0;
      $190 = ($RP9$0>>>0)<($189>>>0);
      if ($190) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $167 = (($mem) + ($8)|0);
      $168 = HEAP32[$167>>2]|0;
      $169 = HEAP32[((2568 + 16|0))>>2]|0;
      $170 = ($168>>>0)<($169>>>0);
      if ($170) {
       _abort();
       // unreachable;
      }
      $171 = (($168) + 12|0);
      $172 = HEAP32[$171>>2]|0;
      $173 = ($172|0)==($9|0);
      if (!($173)) {
       _abort();
       // unreachable;
      }
      $174 = (($165) + 8|0);
      $175 = HEAP32[$174>>2]|0;
      $176 = ($175|0)==($9|0);
      if ($176) {
       HEAP32[$171>>2] = $165;
       HEAP32[$174>>2] = $168;
       $R7$1 = $165;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $191 = ($163|0)==(0|0);
    if (!($191)) {
     $$sum18 = (($8) + 20)|0;
     $192 = (($mem) + ($$sum18)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ((2568 + ($193<<2)|0) + 304|0);
     $195 = HEAP32[$194>>2]|0;
     $196 = ($9|0)==($195|0);
     if ($196) {
      HEAP32[$194>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $197 = 1 << $193;
       $198 = $197 ^ -1;
       $199 = HEAP32[((2568 + 4|0))>>2]|0;
       $200 = $199 & $198;
       HEAP32[((2568 + 4|0))>>2] = $200;
       break;
      }
     } else {
      $201 = HEAP32[((2568 + 16|0))>>2]|0;
      $202 = ($163>>>0)<($201>>>0);
      if ($202) {
       _abort();
       // unreachable;
      }
      $203 = (($163) + 16|0);
      $204 = HEAP32[$203>>2]|0;
      $205 = ($204|0)==($9|0);
      if ($205) {
       HEAP32[$203>>2] = $R7$1;
      } else {
       $206 = (($163) + 20|0);
       HEAP32[$206>>2] = $R7$1;
      }
      $207 = ($R7$1|0)==(0|0);
      if ($207) {
       break;
      }
     }
     $208 = HEAP32[((2568 + 16|0))>>2]|0;
     $209 = ($R7$1>>>0)<($208>>>0);
     if ($209) {
      _abort();
      // unreachable;
     }
     $210 = (($R7$1) + 24|0);
     HEAP32[$210>>2] = $163;
     $$sum19 = (($8) + 8)|0;
     $211 = (($mem) + ($$sum19)|0);
     $212 = HEAP32[$211>>2]|0;
     $213 = ($212|0)==(0|0);
     do {
      if (!($213)) {
       $214 = HEAP32[((2568 + 16|0))>>2]|0;
       $215 = ($212>>>0)<($214>>>0);
       if ($215) {
        _abort();
        // unreachable;
       } else {
        $216 = (($R7$1) + 16|0);
        HEAP32[$216>>2] = $212;
        $217 = (($212) + 24|0);
        HEAP32[$217>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $218 = (($mem) + ($$sum20)|0);
     $219 = HEAP32[$218>>2]|0;
     $220 = ($219|0)==(0|0);
     if (!($220)) {
      $221 = HEAP32[((2568 + 16|0))>>2]|0;
      $222 = ($219>>>0)<($221>>>0);
      if ($222) {
       _abort();
       // unreachable;
      } else {
       $223 = (($R7$1) + 20|0);
       HEAP32[$223>>2] = $219;
       $224 = (($219) + 24|0);
       HEAP32[$224>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $225 = $135 | 1;
  $226 = (($p$0) + 4|0);
  HEAP32[$226>>2] = $225;
  $227 = (($p$0) + ($135)|0);
  HEAP32[$227>>2] = $135;
  $228 = HEAP32[((2568 + 20|0))>>2]|0;
  $229 = ($p$0|0)==($228|0);
  if ($229) {
   HEAP32[((2568 + 8|0))>>2] = $135;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $135;
  }
 } else {
  $230 = $114 & -2;
  HEAP32[$113>>2] = $230;
  $231 = $psize$0 | 1;
  $232 = (($p$0) + 4|0);
  HEAP32[$232>>2] = $231;
  $233 = (($p$0) + ($psize$0)|0);
  HEAP32[$233>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $234 = $psize$1 >>> 3;
 $235 = ($psize$1>>>0)<(256);
 if ($235) {
  $236 = $234 << 1;
  $237 = ((2568 + ($236<<2)|0) + 40|0);
  $238 = HEAP32[2568>>2]|0;
  $239 = 1 << $234;
  $240 = $238 & $239;
  $241 = ($240|0)==(0);
  if ($241) {
   $242 = $238 | $239;
   HEAP32[2568>>2] = $242;
   $$sum16$pre = (($236) + 2)|0;
   $$pre = ((2568 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $237;
  } else {
   $$sum17 = (($236) + 2)|0;
   $243 = ((2568 + ($$sum17<<2)|0) + 40|0);
   $244 = HEAP32[$243>>2]|0;
   $245 = HEAP32[((2568 + 16|0))>>2]|0;
   $246 = ($244>>>0)<($245>>>0);
   if ($246) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $243;$F16$0 = $244;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $247 = (($F16$0) + 12|0);
  HEAP32[$247>>2] = $p$0;
  $248 = (($p$0) + 8|0);
  HEAP32[$248>>2] = $F16$0;
  $249 = (($p$0) + 12|0);
  HEAP32[$249>>2] = $237;
  STACKTOP = sp;return;
 }
 $250 = $psize$1 >>> 8;
 $251 = ($250|0)==(0);
 if ($251) {
  $I18$0 = 0;
 } else {
  $252 = ($psize$1>>>0)>(16777215);
  if ($252) {
   $I18$0 = 31;
  } else {
   $253 = (($250) + 1048320)|0;
   $254 = $253 >>> 16;
   $255 = $254 & 8;
   $256 = $250 << $255;
   $257 = (($256) + 520192)|0;
   $258 = $257 >>> 16;
   $259 = $258 & 4;
   $260 = $259 | $255;
   $261 = $256 << $259;
   $262 = (($261) + 245760)|0;
   $263 = $262 >>> 16;
   $264 = $263 & 2;
   $265 = $260 | $264;
   $266 = (14 - ($265))|0;
   $267 = $261 << $264;
   $268 = $267 >>> 15;
   $269 = (($266) + ($268))|0;
   $270 = $269 << 1;
   $271 = (($269) + 7)|0;
   $272 = $psize$1 >>> $271;
   $273 = $272 & 1;
   $274 = $273 | $270;
   $I18$0 = $274;
  }
 }
 $275 = ((2568 + ($I18$0<<2)|0) + 304|0);
 $276 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$276>>2] = $I18$0$c;
 $277 = (($p$0) + 20|0);
 HEAP32[$277>>2] = 0;
 $278 = (($p$0) + 16|0);
 HEAP32[$278>>2] = 0;
 $279 = HEAP32[((2568 + 4|0))>>2]|0;
 $280 = 1 << $I18$0;
 $281 = $279 & $280;
 $282 = ($281|0)==(0);
 L199: do {
  if ($282) {
   $283 = $279 | $280;
   HEAP32[((2568 + 4|0))>>2] = $283;
   HEAP32[$275>>2] = $p$0;
   $284 = (($p$0) + 24|0);
   HEAP32[$284>>2] = $275;
   $285 = (($p$0) + 12|0);
   HEAP32[$285>>2] = $p$0;
   $286 = (($p$0) + 8|0);
   HEAP32[$286>>2] = $p$0;
  } else {
   $287 = HEAP32[$275>>2]|0;
   $288 = ($I18$0|0)==(31);
   if ($288) {
    $296 = 0;
   } else {
    $289 = $I18$0 >>> 1;
    $290 = (25 - ($289))|0;
    $296 = $290;
   }
   $291 = (($287) + 4|0);
   $292 = HEAP32[$291>>2]|0;
   $293 = $292 & -8;
   $294 = ($293|0)==($psize$1|0);
   L205: do {
    if ($294) {
     $T$0$lcssa = $287;
    } else {
     $295 = $psize$1 << $296;
     $K19$057 = $295;$T$056 = $287;
     while(1) {
      $303 = $K19$057 >>> 31;
      $304 = ((($T$056) + ($303<<2)|0) + 16|0);
      $299 = HEAP32[$304>>2]|0;
      $305 = ($299|0)==(0|0);
      if ($305) {
       break;
      }
      $297 = $K19$057 << 1;
      $298 = (($299) + 4|0);
      $300 = HEAP32[$298>>2]|0;
      $301 = $300 & -8;
      $302 = ($301|0)==($psize$1|0);
      if ($302) {
       $T$0$lcssa = $299;
       break L205;
      } else {
       $K19$057 = $297;$T$056 = $299;
      }
     }
     $306 = HEAP32[((2568 + 16|0))>>2]|0;
     $307 = ($304>>>0)<($306>>>0);
     if ($307) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$304>>2] = $p$0;
      $308 = (($p$0) + 24|0);
      HEAP32[$308>>2] = $T$056;
      $309 = (($p$0) + 12|0);
      HEAP32[$309>>2] = $p$0;
      $310 = (($p$0) + 8|0);
      HEAP32[$310>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $311 = (($T$0$lcssa) + 8|0);
   $312 = HEAP32[$311>>2]|0;
   $313 = HEAP32[((2568 + 16|0))>>2]|0;
   $314 = ($T$0$lcssa>>>0)<($313>>>0);
   if ($314) {
    _abort();
    // unreachable;
   }
   $315 = ($312>>>0)<($313>>>0);
   if ($315) {
    _abort();
    // unreachable;
   } else {
    $316 = (($312) + 12|0);
    HEAP32[$316>>2] = $p$0;
    HEAP32[$311>>2] = $p$0;
    $317 = (($p$0) + 8|0);
    HEAP32[$317>>2] = $312;
    $318 = (($p$0) + 12|0);
    HEAP32[$318>>2] = $T$0$lcssa;
    $319 = (($p$0) + 24|0);
    HEAP32[$319>>2] = 0;
    break;
   }
  }
 } while(0);
 $320 = HEAP32[((2568 + 32|0))>>2]|0;
 $321 = (($320) + -1)|0;
 HEAP32[((2568 + 32|0))>>2] = $321;
 $322 = ($321|0)==(0);
 if ($322) {
  $sp$0$in$i = ((2568 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $323 = ($sp$0$i|0)==(0|0);
  $324 = (($sp$0$i) + 8|0);
  if ($323) {
   break;
  } else {
   $sp$0$in$i = $324;
  }
 }
 HEAP32[((2568 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _isdigit($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -48)|0;
 $1 = ($0>>>0)<(10);
 $2 = $1&1;
 STACKTOP = sp;return ($2|0);
}
function _isspace($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(32);
 if ($0) {
  $4 = 1;
 } else {
  $1 = (($c) + -9)|0;
  $2 = ($1>>>0)<(5);
  $4 = $2;
 }
 $3 = $4&1;
 STACKTOP = sp;return ($3|0);
}
function ___floatscan($f,$prec,$pok) {
 $f = $f|0;
 $prec = $prec|0;
 $pok = $pok|0;
 var $$$i = 0, $$$i22 = 0, $$0 = 0.0, $$02$i = 0, $$08$i = 0, $$09$i = 0, $$1$be$i = 0, $$1$ph$i = 0, $$10$i = 0, $$14$i = 0, $$2$i = 0, $$3$be$i = 0, $$3$lcssa$i = 0, $$38$i = 0, $$388$i = 0, $$397$i = 0, $$in = 0, $$k$0$i = 0, $$lcssa43$i = 0, $$lnz$0$i = 0;
 var $$neg20$i = 0, $$pn$i = 0.0, $$pre$i = 0.0, $$pre$i17 = 0, $$pre$phi$iZ2D = 0.0, $$promoted$i = 0, $$sink$off0$us$i = 0, $$sink$off0$us53$i = 0, $$x$4$i = 0, $$y$3$i = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0;
 var $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0;
 var $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0;
 var $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0;
 var $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0;
 var $18 = 0, $180 = 0, $181 = 0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0.0, $186 = 0, $187 = 0, $188 = 0.0, $189 = 0.0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0;
 var $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0.0, $209 = 0.0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0;
 var $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0;
 var $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0;
 var $251 = 0, $252 = 0, $253 = 0, $254 = 0.0, $255 = 0.0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0.0, $264 = 0.0, $265 = 0.0, $266 = 0, $267 = 0, $268 = 0, $269 = 0;
 var $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0.0, $277 = 0.0, $278 = 0.0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0.0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0;
 var $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0.0;
 var $305 = 0.0, $306 = 0.0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0.0, $313 = 0.0, $314 = 0.0, $315 = 0.0, $316 = 0.0, $317 = 0.0, $318 = 0, $319 = 0, $32 = 0, $320 = 0.0, $321 = 0, $322 = 0;
 var $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0;
 var $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0;
 var $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0;
 var $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0;
 var $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0;
 var $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0.0, $418 = 0.0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0;
 var $431 = 0, $432 = 0, $433 = 0, $434 = 0.0, $435 = 0.0, $436 = 0.0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0.0, $447 = 0.0, $448 = 0.0, $449 = 0;
 var $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0.0, $459 = 0.0, $46 = 0, $460 = 0.0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0;
 var $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0.0, $473 = 0, $474 = 0.0, $475 = 0.0, $476 = 0, $477 = 0.0, $478 = 0, $479 = 0.0, $48 = 0, $480 = 0.0, $481 = 0, $482 = 0, $483 = 0, $484 = 0.0, $485 = 0.0;
 var $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0.0, $490 = 0, $491 = 0.0, $492 = 0.0, $493 = 0.0, $494 = 0, $495 = 0, $496 = 0, $497 = 0.0, $498 = 0.0, $499 = 0, $5 = 0, $50 = 0.0, $500 = 0, $501 = 0, $502 = 0;
 var $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0.0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0;
 var $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0;
 var $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0;
 var $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0;
 var $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0;
 var $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0;
 var $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0;
 var $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0.0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0;
 var $648 = 0.0, $649 = 0.0, $65 = 0, $650 = 0.0, $651 = 0, $652 = 0.0, $653 = 0.0, $654 = 0.0, $655 = 0.0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0;
 var $666 = 0.0, $667 = 0.0, $668 = 0.0, $669 = 0, $67 = 0, $670 = 0.0, $671 = 0.0, $672 = 0, $673 = 0, $674 = 0, $675 = 0.0, $676 = 0.0, $677 = 0.0, $678 = 0.0, $679 = 0, $68 = 0, $680 = 0, $681 = 0.0, $682 = 0, $683 = 0.0;
 var $684 = 0.0, $685 = 0.0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0.0, $691 = 0, $692 = 0, $693 = 0, $694 = 0.0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0;
 var $701 = 0.0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0.0, $707 = 0, $708 = 0, $709 = 0.0, $71 = 0, $710 = 0.0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0;
 var $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $a$0$lcssa161$i = 0, $a$061$i = 0, $a$1$i = 0, $a$2$ph40$i = 0;
 var $a$3$i = 0, $a$3$i$ph = 0, $a$3$ph$i = 0, $a$427$i = 0, $a$5$i = 0, $bias$0$i = 0.0, $bias$07$i = 0.0, $bits$0$ph = 0, $brmerge = 0, $brmerge107 = 0, $c$0 = 0, $c$0$i = 0, $c$1$lcssa = 0, $c$1$ph$i = 0, $c$169 = 0, $c$2 = 0, $c$2$i = 0, $c$2$lcssa$i = 0, $c$364 = 0, $c$4 = 0;
 var $c$5 = 0, $c$6 = 0, $carry$063$i = 0, $carry1$0$us$i = 0, $carry1$0$us49$i = 0, $carry1$1$lcssa$lcssa$i = 0, $carry1$1$us$i = 0, $carry1$1$us54$i = 0, $carry3$030$i = 0, $cond$i = 0, $d$0$i = 0, $denormal$0$i = 0, $denormal$1$i = 0, $denormal$2$i = 0, $e2$0$ph$i = 0, $e2$0$us$i = 0, $e2$0$us44$i = 0, $e2$1$i = 0, $e2$1$i$ph = 0, $e2$1$ph$i = 0;
 var $e2$2$i = 0, $e2$3$i = 0, $emin$0$ph = 0, $exitcond$i = 0, $frac$0$i = 0.0, $frac$1$i = 0.0, $frac$2$i = 0.0, $gotdig$0$i = 0, $gotdig$0$i9 = 0, $gotdig$2$i = 0, $gotdig$2$i11 = 0, $gotdig$3$i = 0, $gotdig$3$lcssa$i = 0, $gotdig$381$i = 0, $gotdig$393$i = 0, $gotdig$4$i = 0, $gotrad$0$i = 0, $gotrad$0$i12 = 0, $gotrad$1$i = 0, $gotrad$1$lcssa$i = 0;
 var $gotrad$194$i = 0, $gotrad$2$i = 0, $gottail$0$i = 0, $gottail$1$i = 0, $gottail$2$i = 0, $i$0$lcssa = 0, $i$025$i = 0, $i$068 = 0, $i$1$i = 0, $i$166 = 0, $i$263 = 0, $i$3 = 0, $i$4 = 0, $j$0$lcssa$i = 0, $j$086$i = 0, $j$096$i = 0, $j$2$i = 0, $j$371$i = 0, $k$0$lcssa$i = 0, $k$084$i = 0;
 var $k$095$i = 0, $k$2$i = 0, $k$3$i = 0, $k$462$i = 0, $k$5$in$us$i = 0, $k$5$in$us48$i = 0, $k$5$us$i = 0, $k$5$us50$i = 0, $k$5$z$2$us$i = 0, $k$5$z$2$us56$i = 0, $k$628$i = 0, $lnz$0$lcssa$i = 0, $lnz$079$i = 0, $lnz$092$i = 0, $lnz$2$i = 0, $notlhs = 0, $notrhs = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i15 = 0;
 var $or$cond106$not = 0, $or$cond11$i = 0, $or$cond12$us$i = 0, $or$cond12$us55$i = 0, $or$cond13$i = 0, $or$cond15$i = 0, $or$cond16$i = 0, $or$cond17$i = 0, $or$cond3$i = 0, $or$cond3$i16 = 0, $or$cond4$i = 0, $or$cond5 = 0, $or$cond7$i = 0, $or$cond789$i = 0, $or$cond8 = 0, $rp$0$lcssa162$i = 0, $rp$060$i = 0, $rp$1$i18 = 0, $rp$2$ph38$i = 0, $rp$3$i$ph = 0;
 var $rp$3$ph33$i = 0, $rp$426$i = 0, $rp$5$i = 0, $scale$0$i = 0.0, $scale$1$i = 0.0, $scale$2$i = 0.0, $sign$0 = 0, $storemerge$i = 0, $sum$i = 0, $x$0$i = 0, $x$1$i = 0, $x$2$i = 0, $x$3$lcssa$i = 0, $x$313$i = 0, $x$4$lcssa$i = 0, $x$48$i = 0, $x$5$i = 0, $x$6$i = 0, $x$i = 0, $y$0$i = 0.0;
 var $y$1$i = 0.0, $y$1$i23 = 0.0, $y$2$i = 0.0, $y$2$i24 = 0.0, $y$3$i = 0.0, $y$3$lcssa$i = 0.0, $y$39$i = 0.0, $y$4$i = 0.0, $y$5$i = 0.0, $z$0$i = 0, $z$1$ph39$i = 0, $z$1$us$i = 0, $z$1$us45$i = 0, $z$2$us$i = 0, $z$2$us47$i = 0, $z$3$lcssa$lcssa$i = 0, $z$3$us$i = 0, $z$3$us57$i = 0, $z$4$i = 0, $z$5$ph$i = 0;
 var $z$7$1$i = 0, $z$7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $x$i = sp;
 if ((($prec|0) == 0)) {
  $bits$0$ph = 24;$emin$0$ph = -149;
 } else if ((($prec|0) == 1)) {
  $bits$0$ph = 53;$emin$0$ph = -1074;
 } else if ((($prec|0) == 2)) {
  $bits$0$ph = 53;$emin$0$ph = -1074;
 } else {
  $$0 = 0.0;
  STACKTOP = sp;return (+$$0);
 }
 $0 = (($f) + 4|0);
 $1 = (($f) + 100|0);
 while(1) {
  $2 = HEAP32[$0>>2]|0;
  $3 = HEAP32[$1>>2]|0;
  $4 = ($2>>>0)<($3>>>0);
  if ($4) {
   $5 = (($2) + 1|0);
   HEAP32[$0>>2] = $5;
   $6 = HEAP8[$2>>0]|0;
   $7 = $6&255;
   $9 = $7;
  } else {
   $8 = (___shgetc($f)|0);
   $9 = $8;
  }
  $10 = (_isspace($9)|0);
  $11 = ($10|0)==(0);
  if ($11) {
   break;
  }
 }
 $12 = ($9|0)==(45);
 do {
  if ((($9|0) == 43) | (($9|0) == 45)) {
   $13 = $12&1;
   $14 = $13 << 1;
   $15 = (1 - ($14))|0;
   $16 = HEAP32[$0>>2]|0;
   $17 = HEAP32[$1>>2]|0;
   $18 = ($16>>>0)<($17>>>0);
   if ($18) {
    $19 = (($16) + 1|0);
    HEAP32[$0>>2] = $19;
    $20 = HEAP8[$16>>0]|0;
    $21 = $20&255;
    $c$0 = $21;$sign$0 = $15;
    break;
   } else {
    $22 = (___shgetc($f)|0);
    $c$0 = $22;$sign$0 = $15;
    break;
   }
  } else {
   $c$0 = $9;$sign$0 = 1;
  }
 } while(0);
 $c$169 = $c$0;$i$068 = 0;
 while(1) {
  $23 = $c$169 | 32;
  $24 = (3064 + ($i$068)|0);
  $25 = HEAP8[$24>>0]|0;
  $26 = $25 << 24 >> 24;
  $27 = ($23|0)==($26|0);
  if (!($27)) {
   $c$1$lcssa = $c$169;$i$0$lcssa = $i$068;
   break;
  }
  $28 = ($i$068>>>0)<(7);
  do {
   if ($28) {
    $29 = HEAP32[$0>>2]|0;
    $30 = HEAP32[$1>>2]|0;
    $31 = ($29>>>0)<($30>>>0);
    if ($31) {
     $32 = (($29) + 1|0);
     HEAP32[$0>>2] = $32;
     $33 = HEAP8[$29>>0]|0;
     $34 = $33&255;
     $c$2 = $34;
     break;
    } else {
     $35 = (___shgetc($f)|0);
     $c$2 = $35;
     break;
    }
   } else {
    $c$2 = $c$169;
   }
  } while(0);
  $36 = (($i$068) + 1)|0;
  $37 = ($36>>>0)<(8);
  if ($37) {
   $c$169 = $c$2;$i$068 = $36;
  } else {
   $c$1$lcssa = $c$2;$i$0$lcssa = $36;
   break;
  }
 }
 do {
  if ((($i$0$lcssa|0) == 3)) {
   label = 23;
  } else if (!((($i$0$lcssa|0) == 8))) {
   $38 = ($i$0$lcssa>>>0)<(4);
   $39 = ($pok|0)==(0);
   $or$cond = $38 | $39;
   if (!($or$cond)) {
    $40 = ($i$0$lcssa|0)==(8);
    if ($40) {
     break;
    } else {
     label = 23;
     break;
    }
   }
   $52 = ($i$0$lcssa|0)==(0);
   L34: do {
    if ($52) {
     $c$364 = $c$1$lcssa;$i$263 = 0;
     while(1) {
      $53 = $c$364 | 32;
      $54 = (3080 + ($i$263)|0);
      $55 = HEAP8[$54>>0]|0;
      $56 = $55 << 24 >> 24;
      $57 = ($53|0)==($56|0);
      if (!($57)) {
       $c$5 = $c$364;$i$3 = $i$263;
       break L34;
      }
      $58 = ($i$263>>>0)<(2);
      do {
       if ($58) {
        $59 = HEAP32[$0>>2]|0;
        $60 = HEAP32[$1>>2]|0;
        $61 = ($59>>>0)<($60>>>0);
        if ($61) {
         $62 = (($59) + 1|0);
         HEAP32[$0>>2] = $62;
         $63 = HEAP8[$59>>0]|0;
         $64 = $63&255;
         $c$4 = $64;
         break;
        } else {
         $65 = (___shgetc($f)|0);
         $c$4 = $65;
         break;
        }
       } else {
        $c$4 = $c$364;
       }
      } while(0);
      $66 = (($i$263) + 1)|0;
      $67 = ($66>>>0)<(3);
      if ($67) {
       $c$364 = $c$4;$i$263 = $66;
      } else {
       $c$5 = $c$4;$i$3 = $66;
       break;
      }
     }
    } else {
     $c$5 = $c$1$lcssa;$i$3 = $i$0$lcssa;
    }
   } while(0);
   if ((($i$3|0) == 0)) {
    $113 = ($c$5|0)==(48);
    do {
     if ($113) {
      $114 = HEAP32[$0>>2]|0;
      $115 = HEAP32[$1>>2]|0;
      $116 = ($114>>>0)<($115>>>0);
      if ($116) {
       $117 = (($114) + 1|0);
       HEAP32[$0>>2] = $117;
       $118 = HEAP8[$114>>0]|0;
       $119 = $118&255;
       $122 = $119;
      } else {
       $120 = (___shgetc($f)|0);
       $122 = $120;
      }
      $121 = $122 | 32;
      $123 = ($121|0)==(120);
      if (!($123)) {
       $321 = HEAP32[$1>>2]|0;
       $322 = ($321|0)==(0|0);
       if ($322) {
        $c$6 = 48;
        break;
       }
       $323 = HEAP32[$0>>2]|0;
       $324 = (($323) + -1|0);
       HEAP32[$0>>2] = $324;
       $c$6 = 48;
       break;
      }
      $124 = HEAP32[$0>>2]|0;
      $125 = HEAP32[$1>>2]|0;
      $126 = ($124>>>0)<($125>>>0);
      if ($126) {
       $127 = (($124) + 1|0);
       HEAP32[$0>>2] = $127;
       $128 = HEAP8[$124>>0]|0;
       $129 = $128&255;
       $c$0$i = $129;$gotdig$0$i = 0;
      } else {
       $130 = (___shgetc($f)|0);
       $c$0$i = $130;$gotdig$0$i = 0;
      }
      while(1) {
       if ((($c$0$i|0) == 46)) {
        label = 70;
        break;
       } else if (!((($c$0$i|0) == 48))) {
        $168 = 0;$171 = 0;$211 = 0;$213 = 0;$c$2$i = $c$0$i;$gotdig$2$i = $gotdig$0$i;$gotrad$0$i = 0;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
        break;
       }
       $131 = HEAP32[$0>>2]|0;
       $132 = HEAP32[$1>>2]|0;
       $133 = ($131>>>0)<($132>>>0);
       if ($133) {
        $134 = (($131) + 1|0);
        HEAP32[$0>>2] = $134;
        $135 = HEAP8[$131>>0]|0;
        $136 = $135&255;
        $c$0$i = $136;$gotdig$0$i = 1;
        continue;
       } else {
        $137 = (___shgetc($f)|0);
        $c$0$i = $137;$gotdig$0$i = 1;
        continue;
       }
      }
      L66: do {
       if ((label|0) == 70) {
        $138 = HEAP32[$0>>2]|0;
        $139 = HEAP32[$1>>2]|0;
        $140 = ($138>>>0)<($139>>>0);
        if ($140) {
         $141 = (($138) + 1|0);
         HEAP32[$0>>2] = $141;
         $142 = HEAP8[$138>>0]|0;
         $143 = $142&255;
         $c$1$ph$i = $143;
        } else {
         $144 = (___shgetc($f)|0);
         $c$1$ph$i = $144;
        }
        $145 = ($c$1$ph$i|0)==(48);
        if ($145) {
         $155 = -1;$156 = -1;
         while(1) {
          $146 = HEAP32[$0>>2]|0;
          $147 = HEAP32[$1>>2]|0;
          $148 = ($146>>>0)<($147>>>0);
          if ($148) {
           $149 = (($146) + 1|0);
           HEAP32[$0>>2] = $149;
           $150 = HEAP8[$146>>0]|0;
           $151 = $150&255;
           $153 = $151;
          } else {
           $152 = (___shgetc($f)|0);
           $153 = $152;
          }
          $154 = ($153|0)==(48);
          if (!($154)) {
           $168 = 0;$171 = 0;$211 = $155;$213 = $156;$c$2$i = $153;$gotdig$2$i = 1;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
           break L66;
          }
          $157 = (_i64Add(($155|0),($156|0),-1,-1)|0);
          $158 = tempRet0;
          $155 = $157;$156 = $158;
         }
        } else {
         $168 = 0;$171 = 0;$211 = 0;$213 = 0;$c$2$i = $c$1$ph$i;$gotdig$2$i = $gotdig$0$i;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
        }
       }
      } while(0);
      L79: while(1) {
       $159 = (($c$2$i) + -48)|0;
       $160 = ($159>>>0)<(10);
       do {
        if ($160) {
         $d$0$i = $159;
         label = 84;
        } else {
         $161 = $c$2$i | 32;
         $162 = (($161) + -97)|0;
         $163 = ($162>>>0)<(6);
         $164 = ($c$2$i|0)==(46);
         $or$cond$i = $163 | $164;
         if (!($or$cond$i)) {
          $c$2$lcssa$i = $c$2$i;
          break L79;
         }
         if ($164) {
          $165 = ($gotrad$0$i|0)==(0);
          if ($165) {
           $712 = $171;$713 = $168;$714 = $171;$715 = $168;$gotdig$3$i = $gotdig$2$i;$gotrad$1$i = 1;$gottail$2$i = $gottail$0$i;$scale$2$i = $scale$0$i;$x$2$i = $x$0$i;$y$2$i = $y$0$i;
           break;
          } else {
           $c$2$lcssa$i = 46;
           break L79;
          }
         } else {
          $166 = ($c$2$i|0)>(57);
          $167 = (($161) + -87)|0;
          $$38$i = $166 ? $167 : $159;
          $d$0$i = $$38$i;
          label = 84;
          break;
         }
        }
       } while(0);
       if ((label|0) == 84) {
        label = 0;
        $169 = ($168|0)<(0);
        $170 = ($168|0)==(0);
        $172 = ($171>>>0)<(8);
        $173 = $170 & $172;
        $174 = $169 | $173;
        do {
         if ($174) {
          $175 = $x$0$i << 4;
          $176 = (($d$0$i) + ($175))|0;
          $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $176;$y$1$i = $y$0$i;
         } else {
          $177 = ($168|0)<(0);
          $178 = ($168|0)==(0);
          $179 = ($171>>>0)<(14);
          $180 = $178 & $179;
          $181 = $177 | $180;
          if ($181) {
           $182 = (+($d$0$i|0));
           $183 = $scale$0$i * 0.0625;
           $184 = $183 * $182;
           $185 = $y$0$i + $184;
           $gottail$1$i = $gottail$0$i;$scale$1$i = $183;$x$1$i = $x$0$i;$y$1$i = $185;
           break;
          }
          $186 = ($d$0$i|0)!=(0);
          $187 = ($gottail$0$i|0)==(0);
          $or$cond3$i = $186 & $187;
          if ($or$cond3$i) {
           $188 = $scale$0$i * 0.5;
           $189 = $y$0$i + $188;
           $gottail$1$i = 1;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $189;
          } else {
           $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $y$0$i;
          }
         }
        } while(0);
        $190 = (_i64Add(($171|0),($168|0),1,0)|0);
        $191 = tempRet0;
        $712 = $211;$713 = $213;$714 = $190;$715 = $191;$gotdig$3$i = 1;$gotrad$1$i = $gotrad$0$i;$gottail$2$i = $gottail$1$i;$scale$2$i = $scale$1$i;$x$2$i = $x$1$i;$y$2$i = $y$1$i;
       }
       $192 = HEAP32[$0>>2]|0;
       $193 = HEAP32[$1>>2]|0;
       $194 = ($192>>>0)<($193>>>0);
       if ($194) {
        $195 = (($192) + 1|0);
        HEAP32[$0>>2] = $195;
        $196 = HEAP8[$192>>0]|0;
        $197 = $196&255;
        $168 = $715;$171 = $714;$211 = $712;$213 = $713;$c$2$i = $197;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
        continue;
       } else {
        $198 = (___shgetc($f)|0);
        $168 = $715;$171 = $714;$211 = $712;$213 = $713;$c$2$i = $198;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
        continue;
       }
      }
      $199 = ($gotdig$2$i|0)==(0);
      if ($199) {
       $200 = HEAP32[$1>>2]|0;
       $201 = ($200|0)==(0|0);
       if (!($201)) {
        $202 = HEAP32[$0>>2]|0;
        $203 = (($202) + -1|0);
        HEAP32[$0>>2] = $203;
       }
       if ($39) {
        ___shlim($f,0);
       } else {
        if (!($201)) {
         $204 = HEAP32[$0>>2]|0;
         $205 = (($204) + -1|0);
         HEAP32[$0>>2] = $205;
         $206 = ($gotrad$0$i|0)==(0);
         if (!($206)) {
          $207 = (($204) + -2|0);
          HEAP32[$0>>2] = $207;
         }
        }
       }
       $208 = (+($sign$0|0));
       $209 = $208 * 0.0;
       $$0 = $209;
       STACKTOP = sp;return (+$$0);
      }
      $210 = ($gotrad$0$i|0)==(0);
      $212 = $210 ? $171 : $211;
      $214 = $210 ? $168 : $213;
      $215 = ($168|0)<(0);
      $216 = ($168|0)==(0);
      $217 = ($171>>>0)<(8);
      $218 = $216 & $217;
      $219 = $215 | $218;
      if ($219) {
       $221 = $171;$222 = $168;$x$313$i = $x$0$i;
       while(1) {
        $220 = $x$313$i << 4;
        $223 = (_i64Add(($221|0),($222|0),1,0)|0);
        $224 = tempRet0;
        $225 = ($224|0)<(0);
        $226 = ($224|0)==(0);
        $227 = ($223>>>0)<(8);
        $228 = $226 & $227;
        $229 = $225 | $228;
        if ($229) {
         $221 = $223;$222 = $224;$x$313$i = $220;
        } else {
         $x$3$lcssa$i = $220;
         break;
        }
       }
      } else {
       $x$3$lcssa$i = $x$0$i;
      }
      $230 = $c$2$lcssa$i | 32;
      $231 = ($230|0)==(112);
      do {
       if ($231) {
        $232 = (_scanexp($f,$pok)|0);
        $233 = tempRet0;
        $234 = ($232|0)==(0);
        $235 = ($233|0)==(-2147483648);
        $236 = $234 & $235;
        if ($236) {
         if ($39) {
          ___shlim($f,0);
          $$0 = 0.0;
          STACKTOP = sp;return (+$$0);
         } else {
          $237 = HEAP32[$1>>2]|0;
          $238 = ($237|0)==(0|0);
          if ($238) {
           $249 = 0;$250 = 0;
           break;
          }
          $239 = HEAP32[$0>>2]|0;
          $240 = (($239) + -1|0);
          HEAP32[$0>>2] = $240;
          $249 = 0;$250 = 0;
          break;
         }
        } else {
         $249 = $232;$250 = $233;
        }
       } else {
        $241 = HEAP32[$1>>2]|0;
        $242 = ($241|0)==(0|0);
        if ($242) {
         $249 = 0;$250 = 0;
        } else {
         $243 = HEAP32[$0>>2]|0;
         $244 = (($243) + -1|0);
         HEAP32[$0>>2] = $244;
         $249 = 0;$250 = 0;
        }
       }
      } while(0);
      $245 = (_bitshift64Shl(($212|0),($214|0),2)|0);
      $246 = tempRet0;
      $247 = (_i64Add(($245|0),($246|0),-32,-1)|0);
      $248 = tempRet0;
      $251 = (_i64Add(($247|0),($248|0),($249|0),($250|0))|0);
      $252 = tempRet0;
      $253 = ($x$3$lcssa$i|0)==(0);
      if ($253) {
       $254 = (+($sign$0|0));
       $255 = $254 * 0.0;
       $$0 = $255;
       STACKTOP = sp;return (+$$0);
      }
      $256 = (0 - ($emin$0$ph))|0;
      $257 = ($252|0)>(0);
      $258 = ($252|0)==(0);
      $259 = ($251>>>0)>($256>>>0);
      $260 = $258 & $259;
      $261 = $257 | $260;
      if ($261) {
       $262 = (___errno_location()|0);
       HEAP32[$262>>2] = 34;
       $263 = (+($sign$0|0));
       $264 = $263 * 1.7976931348623157E+308;
       $265 = $264 * 1.7976931348623157E+308;
       $$0 = $265;
       STACKTOP = sp;return (+$$0);
      }
      $266 = (($emin$0$ph) + -106)|0;
      $267 = ($266|0)<(0);
      $268 = $267 << 31 >> 31;
      $269 = ($252|0)<($268|0);
      $270 = ($252|0)==($268|0);
      $271 = ($251>>>0)<($266>>>0);
      $272 = $270 & $271;
      $273 = $269 | $272;
      if ($273) {
       $275 = (___errno_location()|0);
       HEAP32[$275>>2] = 34;
       $276 = (+($sign$0|0));
       $277 = $276 * 2.2250738585072014E-308;
       $278 = $277 * 2.2250738585072014E-308;
       $$0 = $278;
       STACKTOP = sp;return (+$$0);
      }
      $274 = ($x$3$lcssa$i|0)>(-1);
      if ($274) {
       $283 = $251;$284 = $252;$x$48$i = $x$3$lcssa$i;$y$39$i = $y$0$i;
       while(1) {
        $279 = !($y$39$i >= 0.5);
        $280 = $x$48$i << 1;
        if ($279) {
         $$pn$i = $y$39$i;$x$5$i = $280;
        } else {
         $281 = $280 | 1;
         $282 = $y$39$i + -1.0;
         $$pn$i = $282;$x$5$i = $281;
        }
        $y$4$i = $y$39$i + $$pn$i;
        $285 = (_i64Add(($283|0),($284|0),-1,-1)|0);
        $286 = tempRet0;
        $287 = ($x$5$i|0)>(-1);
        if ($287) {
         $283 = $285;$284 = $286;$x$48$i = $x$5$i;$y$39$i = $y$4$i;
        } else {
         $292 = $285;$293 = $286;$x$4$lcssa$i = $x$5$i;$y$3$lcssa$i = $y$4$i;
         break;
        }
       }
      } else {
       $292 = $251;$293 = $252;$x$4$lcssa$i = $x$3$lcssa$i;$y$3$lcssa$i = $y$0$i;
      }
      $288 = ($emin$0$ph|0)<(0);
      $289 = $288 << 31 >> 31;
      $290 = (_i64Subtract(32,0,($emin$0$ph|0),($289|0))|0);
      $291 = tempRet0;
      $294 = (_i64Add(($292|0),($293|0),($290|0),($291|0))|0);
      $295 = tempRet0;
      $296 = (0)>($295|0);
      $297 = (0)==($295|0);
      $298 = ($bits$0$ph>>>0)>($294>>>0);
      $299 = $297 & $298;
      $300 = $296 | $299;
      if ($300) {
       $301 = ($294|0)<(0);
       $$$i = $301 ? 0 : $294;
       $$02$i = $$$i;
      } else {
       $$02$i = $bits$0$ph;
      }
      $302 = ($$02$i|0)<(53);
      do {
       if ($302) {
        $303 = (84 - ($$02$i))|0;
        $304 = (+_scalbn(1.0,$303));
        $305 = (+($sign$0|0));
        $306 = (+_copysignl((+$304),(+$305)));
        $307 = ($$02$i|0)<(32);
        $308 = $y$3$lcssa$i != 0.0;
        $or$cond4$i = $307 & $308;
        if (!($or$cond4$i)) {
         $$pre$phi$iZ2D = $305;$bias$07$i = $306;$x$6$i = $x$4$lcssa$i;$y$5$i = $y$3$lcssa$i;
         break;
        }
        $309 = $x$4$lcssa$i & 1;
        $310 = ($309|0)==(0);
        $311 = $309 ^ 1;
        $$x$4$i = (($311) + ($x$4$lcssa$i))|0;
        $$y$3$i = $310 ? 0.0 : $y$3$lcssa$i;
        $$pre$phi$iZ2D = $305;$bias$07$i = $306;$x$6$i = $$x$4$i;$y$5$i = $$y$3$i;
       } else {
        $$pre$i = (+($sign$0|0));
        $$pre$phi$iZ2D = $$pre$i;$bias$07$i = 0.0;$x$6$i = $x$4$lcssa$i;$y$5$i = $y$3$lcssa$i;
       }
      } while(0);
      $312 = (+($x$6$i>>>0));
      $313 = $$pre$phi$iZ2D * $312;
      $314 = $bias$07$i + $313;
      $315 = $$pre$phi$iZ2D * $y$5$i;
      $316 = $315 + $314;
      $317 = $316 - $bias$07$i;
      $318 = $317 != 0.0;
      if (!($318)) {
       $319 = (___errno_location()|0);
       HEAP32[$319>>2] = 34;
      }
      $320 = (+_scalbnl($317,$292));
      $$0 = $320;
      STACKTOP = sp;return (+$$0);
     } else {
      $c$6 = $c$5;
     }
    } while(0);
    $sum$i = (($emin$0$ph) + ($bits$0$ph))|0;
    $325 = (0 - ($sum$i))|0;
    $$08$i = $c$6;$gotdig$0$i9 = 0;
    while(1) {
     if ((($$08$i|0) == 46)) {
      label = 139;
      break;
     } else if (!((($$08$i|0) == 48))) {
      $$2$i = $$08$i;$716 = 0;$717 = 0;$gotdig$2$i11 = $gotdig$0$i9;$gotrad$0$i12 = 0;
      break;
     }
     $326 = HEAP32[$0>>2]|0;
     $327 = HEAP32[$1>>2]|0;
     $328 = ($326>>>0)<($327>>>0);
     if ($328) {
      $329 = (($326) + 1|0);
      HEAP32[$0>>2] = $329;
      $330 = HEAP8[$326>>0]|0;
      $331 = $330&255;
      $$08$i = $331;$gotdig$0$i9 = 1;
      continue;
     } else {
      $332 = (___shgetc($f)|0);
      $$08$i = $332;$gotdig$0$i9 = 1;
      continue;
     }
    }
    L168: do {
     if ((label|0) == 139) {
      $333 = HEAP32[$0>>2]|0;
      $334 = HEAP32[$1>>2]|0;
      $335 = ($333>>>0)<($334>>>0);
      if ($335) {
       $336 = (($333) + 1|0);
       HEAP32[$0>>2] = $336;
       $337 = HEAP8[$333>>0]|0;
       $338 = $337&255;
       $$1$ph$i = $338;
      } else {
       $339 = (___shgetc($f)|0);
       $$1$ph$i = $339;
      }
      $340 = ($$1$ph$i|0)==(48);
      if ($340) {
       $349 = -1;$350 = -1;
       while(1) {
        $341 = HEAP32[$0>>2]|0;
        $342 = HEAP32[$1>>2]|0;
        $343 = ($341>>>0)<($342>>>0);
        if ($343) {
         $344 = (($341) + 1|0);
         HEAP32[$0>>2] = $344;
         $345 = HEAP8[$341>>0]|0;
         $346 = $345&255;
         $$1$be$i = $346;
        } else {
         $347 = (___shgetc($f)|0);
         $$1$be$i = $347;
        }
        $348 = ($$1$be$i|0)==(48);
        if (!($348)) {
         $$2$i = $$1$be$i;$716 = $349;$717 = $350;$gotdig$2$i11 = 1;$gotrad$0$i12 = 1;
         break L168;
        }
        $351 = (_i64Add(($349|0),($350|0),-1,-1)|0);
        $352 = tempRet0;
        $349 = $351;$350 = $352;
       }
      } else {
       $$2$i = $$1$ph$i;$716 = 0;$717 = 0;$gotdig$2$i11 = $gotdig$0$i9;$gotrad$0$i12 = 1;
      }
     }
    } while(0);
    HEAP32[$x$i>>2] = 0;
    $353 = (($$2$i) + -48)|0;
    $354 = ($353>>>0)<(10);
    $355 = ($$2$i|0)==(46);
    $or$cond789$i = $354 | $355;
    L182: do {
     if ($or$cond789$i) {
      $356 = (($x$i) + 496|0);
      $$397$i = $$2$i;$358 = 0;$359 = 0;$718 = $355;$719 = $353;$720 = $716;$721 = $717;$gotdig$393$i = $gotdig$2$i11;$gotrad$194$i = $gotrad$0$i12;$j$096$i = 0;$k$095$i = 0;$lnz$092$i = 0;
      while(1) {
       do {
        if ($718) {
         $cond$i = ($gotrad$194$i|0)==(0);
         if ($cond$i) {
          $722 = $358;$723 = $359;$724 = $358;$725 = $359;$gotdig$4$i = $gotdig$393$i;$gotrad$2$i = 1;$j$2$i = $j$096$i;$k$2$i = $k$095$i;$lnz$2$i = $lnz$092$i;
         } else {
          $$388$i = $$397$i;$405 = $720;$406 = $721;$421 = $358;$424 = $359;$gotdig$381$i = $gotdig$393$i;$j$086$i = $j$096$i;$k$084$i = $k$095$i;$lnz$079$i = $lnz$092$i;
          break L182;
         }
        } else {
         $357 = ($k$095$i|0)<(125);
         $360 = (_i64Add(($358|0),($359|0),1,0)|0);
         $361 = tempRet0;
         $362 = ($$397$i|0)!=(48);
         if (!($357)) {
          if (!($362)) {
           $722 = $720;$723 = $721;$724 = $360;$725 = $361;$gotdig$4$i = $gotdig$393$i;$gotrad$2$i = $gotrad$194$i;$j$2$i = $j$096$i;$k$2$i = $k$095$i;$lnz$2$i = $lnz$092$i;
           break;
          }
          $372 = HEAP32[$356>>2]|0;
          $373 = $372 | 1;
          HEAP32[$356>>2] = $373;
          $722 = $720;$723 = $721;$724 = $360;$725 = $361;$gotdig$4$i = $gotdig$393$i;$gotrad$2$i = $gotrad$194$i;$j$2$i = $j$096$i;$k$2$i = $k$095$i;$lnz$2$i = $lnz$092$i;
          break;
         }
         $$lnz$0$i = $362 ? $360 : $lnz$092$i;
         $363 = ($j$096$i|0)==(0);
         $364 = (($x$i) + ($k$095$i<<2)|0);
         if ($363) {
          $storemerge$i = $719;
         } else {
          $365 = HEAP32[$364>>2]|0;
          $366 = ($365*10)|0;
          $367 = (($$397$i) + -48)|0;
          $368 = (($367) + ($366))|0;
          $storemerge$i = $368;
         }
         HEAP32[$364>>2] = $storemerge$i;
         $369 = (($j$096$i) + 1)|0;
         $370 = ($369|0)==(9);
         $371 = $370&1;
         $$k$0$i = (($371) + ($k$095$i))|0;
         $$10$i = $370 ? 0 : $369;
         $722 = $720;$723 = $721;$724 = $360;$725 = $361;$gotdig$4$i = 1;$gotrad$2$i = $gotrad$194$i;$j$2$i = $$10$i;$k$2$i = $$k$0$i;$lnz$2$i = $$lnz$0$i;
        }
       } while(0);
       $374 = HEAP32[$0>>2]|0;
       $375 = HEAP32[$1>>2]|0;
       $376 = ($374>>>0)<($375>>>0);
       if ($376) {
        $377 = (($374) + 1|0);
        HEAP32[$0>>2] = $377;
        $378 = HEAP8[$374>>0]|0;
        $379 = $378&255;
        $$3$be$i = $379;
       } else {
        $380 = (___shgetc($f)|0);
        $$3$be$i = $380;
       }
       $381 = (($$3$be$i) + -48)|0;
       $382 = ($381>>>0)<(10);
       $383 = ($$3$be$i|0)==(46);
       $or$cond7$i = $382 | $383;
       if ($or$cond7$i) {
        $$397$i = $$3$be$i;$358 = $724;$359 = $725;$718 = $383;$719 = $381;$720 = $722;$721 = $723;$gotdig$393$i = $gotdig$4$i;$gotrad$194$i = $gotrad$2$i;$j$096$i = $j$2$i;$k$095$i = $k$2$i;$lnz$092$i = $lnz$2$i;
       } else {
        $$3$lcssa$i = $$3$be$i;$385 = $722;$386 = $724;$388 = $723;$389 = $725;$gotdig$3$lcssa$i = $gotdig$4$i;$gotrad$1$lcssa$i = $gotrad$2$i;$j$0$lcssa$i = $j$2$i;$k$0$lcssa$i = $k$2$i;$lnz$0$lcssa$i = $lnz$2$i;
        label = 162;
        break;
       }
      }
     } else {
      $$3$lcssa$i = $$2$i;$385 = $716;$386 = 0;$388 = $717;$389 = 0;$gotdig$3$lcssa$i = $gotdig$2$i11;$gotrad$1$lcssa$i = $gotrad$0$i12;$j$0$lcssa$i = 0;$k$0$lcssa$i = 0;$lnz$0$lcssa$i = 0;
      label = 162;
     }
    } while(0);
    if ((label|0) == 162) {
     $384 = ($gotrad$1$lcssa$i|0)==(0);
     $387 = $384 ? $386 : $385;
     $390 = $384 ? $389 : $388;
     $$388$i = $$3$lcssa$i;$405 = $387;$406 = $390;$421 = $386;$424 = $389;$gotdig$381$i = $gotdig$3$lcssa$i;$j$086$i = $j$0$lcssa$i;$k$084$i = $k$0$lcssa$i;$lnz$079$i = $lnz$0$lcssa$i;
    }
    $391 = ($gotdig$381$i|0)!=(0);
    if ($391) {
     $392 = $$388$i | 32;
     $393 = ($392|0)==(101);
     if ($393) {
      $394 = (_scanexp($f,$pok)|0);
      $395 = tempRet0;
      $396 = ($394|0)==(0);
      $397 = ($395|0)==(-2147483648);
      $398 = $396 & $397;
      do {
       if ($398) {
        if ($39) {
         ___shlim($f,0);
         $$0 = 0.0;
         STACKTOP = sp;return (+$$0);
        } else {
         $399 = HEAP32[$1>>2]|0;
         $400 = ($399|0)==(0|0);
         if ($400) {
          $403 = 0;$404 = 0;
          break;
         }
         $401 = HEAP32[$0>>2]|0;
         $402 = (($401) + -1|0);
         HEAP32[$0>>2] = $402;
         $403 = 0;$404 = 0;
         break;
        }
       } else {
        $403 = $394;$404 = $395;
       }
      } while(0);
      $407 = (_i64Add(($403|0),($404|0),($405|0),($406|0))|0);
      $408 = tempRet0;
      $419 = $407;$422 = $408;
     } else {
      label = 171;
     }
    } else {
     label = 171;
    }
    if ((label|0) == 171) {
     $409 = ($$388$i|0)>(-1);
     if ($409) {
      $410 = HEAP32[$1>>2]|0;
      $411 = ($410|0)==(0|0);
      if ($411) {
       $419 = $405;$422 = $406;
      } else {
       $412 = HEAP32[$0>>2]|0;
       $413 = (($412) + -1|0);
       HEAP32[$0>>2] = $413;
       $419 = $405;$422 = $406;
      }
     } else {
      $419 = $405;$422 = $406;
     }
    }
    if (!($391)) {
     $414 = (___errno_location()|0);
     HEAP32[$414>>2] = 22;
     ___shlim($f,0);
     $$0 = 0.0;
     STACKTOP = sp;return (+$$0);
    }
    $415 = HEAP32[$x$i>>2]|0;
    $416 = ($415|0)==(0);
    if ($416) {
     $417 = (+($sign$0|0));
     $418 = $417 * 0.0;
     $$0 = $418;
     STACKTOP = sp;return (+$$0);
    }
    $420 = ($419|0)==($421|0);
    $423 = ($422|0)==($424|0);
    $425 = $420 & $423;
    $426 = ($424|0)<(0);
    $427 = ($424|0)==(0);
    $428 = ($421>>>0)<(10);
    $429 = $427 & $428;
    $430 = $426 | $429;
    $or$cond$i15 = $425 & $430;
    do {
     if ($or$cond$i15) {
      $431 = ($bits$0$ph>>>0)>(30);
      if (!($431)) {
       $432 = $415 >>> $bits$0$ph;
       $433 = ($432|0)==(0);
       if (!($433)) {
        break;
       }
      }
      $434 = (+($sign$0|0));
      $435 = (+($415>>>0));
      $436 = $434 * $435;
      $$0 = $436;
      STACKTOP = sp;return (+$$0);
     }
    } while(0);
    $437 = (($emin$0$ph|0) / -2)&-1;
    $438 = ($437|0)<(0);
    $439 = $438 << 31 >> 31;
    $440 = ($422|0)>($439|0);
    $441 = ($422|0)==($439|0);
    $442 = ($419>>>0)>($437>>>0);
    $443 = $441 & $442;
    $444 = $440 | $443;
    if ($444) {
     $445 = (___errno_location()|0);
     HEAP32[$445>>2] = 34;
     $446 = (+($sign$0|0));
     $447 = $446 * 1.7976931348623157E+308;
     $448 = $447 * 1.7976931348623157E+308;
     $$0 = $448;
     STACKTOP = sp;return (+$$0);
    }
    $449 = (($emin$0$ph) + -106)|0;
    $450 = ($449|0)<(0);
    $451 = $450 << 31 >> 31;
    $452 = ($422|0)<($451|0);
    $453 = ($422|0)==($451|0);
    $454 = ($419>>>0)<($449>>>0);
    $455 = $453 & $454;
    $456 = $452 | $455;
    if ($456) {
     $457 = (___errno_location()|0);
     HEAP32[$457>>2] = 34;
     $458 = (+($sign$0|0));
     $459 = $458 * 2.2250738585072014E-308;
     $460 = $459 * 2.2250738585072014E-308;
     $$0 = $460;
     STACKTOP = sp;return (+$$0);
    }
    $461 = ($j$086$i|0)==(0);
    if ($461) {
     $k$3$i = $k$084$i;
    } else {
     $462 = ($j$086$i|0)<(9);
     if ($462) {
      $463 = (($x$i) + ($k$084$i<<2)|0);
      $$promoted$i = HEAP32[$463>>2]|0;
      $465 = $$promoted$i;$j$371$i = $j$086$i;
      while(1) {
       $464 = ($465*10)|0;
       $466 = (($j$371$i) + 1)|0;
       $exitcond$i = ($466|0)==(9);
       if ($exitcond$i) {
        break;
       } else {
        $465 = $464;$j$371$i = $466;
       }
      }
      HEAP32[$463>>2] = $464;
     }
     $467 = (($k$084$i) + 1)|0;
     $k$3$i = $467;
    }
    $468 = ($lnz$079$i|0)<(9);
    do {
     if ($468) {
      $469 = ($lnz$079$i|0)<=($419|0);
      $470 = ($419|0)<(18);
      $or$cond3$i16 = $469 & $470;
      if ($or$cond3$i16) {
       $471 = ($419|0)==(9);
       if ($471) {
        $472 = (+($sign$0|0));
        $473 = HEAP32[$x$i>>2]|0;
        $474 = (+($473>>>0));
        $475 = $472 * $474;
        $$0 = $475;
        STACKTOP = sp;return (+$$0);
       }
       $476 = ($419|0)<(9);
       if ($476) {
        $477 = (+($sign$0|0));
        $478 = HEAP32[$x$i>>2]|0;
        $479 = (+($478>>>0));
        $480 = $477 * $479;
        $481 = (8 - ($419))|0;
        $482 = (3096 + ($481<<2)|0);
        $483 = HEAP32[$482>>2]|0;
        $484 = (+($483|0));
        $485 = $480 / $484;
        $$0 = $485;
        STACKTOP = sp;return (+$$0);
       }
       $486 = Math_imul($419, -3)|0;
       $$neg20$i = (($bits$0$ph) + 27)|0;
       $487 = (($$neg20$i) + ($486))|0;
       $488 = ($487|0)>(30);
       $$pre$i17 = HEAP32[$x$i>>2]|0;
       if (!($488)) {
        $489 = $$pre$i17 >>> $487;
        $490 = ($489|0)==(0);
        if (!($490)) {
         break;
        }
       }
       $491 = (+($sign$0|0));
       $492 = (+($$pre$i17>>>0));
       $493 = $491 * $492;
       $494 = (($419) + -10)|0;
       $495 = (3096 + ($494<<2)|0);
       $496 = HEAP32[$495>>2]|0;
       $497 = (+($496|0));
       $498 = $493 * $497;
       $$0 = $498;
       STACKTOP = sp;return (+$$0);
      }
     }
    } while(0);
    $499 = (($419|0) % 9)&-1;
    $500 = ($499|0)==(0);
    if ($500) {
     $a$2$ph40$i = 0;$e2$0$ph$i = 0;$rp$2$ph38$i = $419;$z$1$ph39$i = $k$3$i;
    } else {
     $501 = ($419|0)>(-1);
     $502 = (($499) + 9)|0;
     $503 = $501 ? $499 : $502;
     $504 = (8 - ($503))|0;
     $505 = (3096 + ($504<<2)|0);
     $506 = HEAP32[$505>>2]|0;
     $507 = ($k$3$i|0)==(0);
     if ($507) {
      $a$0$lcssa161$i = 0;$rp$0$lcssa162$i = $419;$z$0$i = 0;
     } else {
      $508 = (1000000000 / ($506|0))&-1;
      $a$061$i = 0;$carry$063$i = 0;$k$462$i = 0;$rp$060$i = $419;
      while(1) {
       $509 = (($x$i) + ($k$462$i<<2)|0);
       $510 = HEAP32[$509>>2]|0;
       $511 = (($510>>>0) % ($506>>>0))&-1;
       $512 = (($510>>>0) / ($506>>>0))&-1;
       $513 = (($512) + ($carry$063$i))|0;
       HEAP32[$509>>2] = $513;
       $514 = Math_imul($511, $508)|0;
       $515 = ($k$462$i|0)==($a$061$i|0);
       $516 = ($513|0)==(0);
       $or$cond11$i = $515 & $516;
       $517 = (($k$462$i) + 1)|0;
       if ($or$cond11$i) {
        $518 = $517 & 127;
        $519 = (($rp$060$i) + -9)|0;
        $a$1$i = $518;$rp$1$i18 = $519;
       } else {
        $a$1$i = $a$061$i;$rp$1$i18 = $rp$060$i;
       }
       $520 = ($517|0)==($k$3$i|0);
       if ($520) {
        break;
       } else {
        $a$061$i = $a$1$i;$carry$063$i = $514;$k$462$i = $517;$rp$060$i = $rp$1$i18;
       }
      }
      $521 = ($514|0)==(0);
      if ($521) {
       $a$0$lcssa161$i = $a$1$i;$rp$0$lcssa162$i = $rp$1$i18;$z$0$i = $k$3$i;
      } else {
       $522 = (($k$3$i) + 1)|0;
       $523 = (($x$i) + ($k$3$i<<2)|0);
       HEAP32[$523>>2] = $514;
       $a$0$lcssa161$i = $a$1$i;$rp$0$lcssa162$i = $rp$1$i18;$z$0$i = $522;
      }
     }
     $524 = (9 - ($503))|0;
     $525 = (($524) + ($rp$0$lcssa162$i))|0;
     $a$2$ph40$i = $a$0$lcssa161$i;$e2$0$ph$i = 0;$rp$2$ph38$i = $525;$z$1$ph39$i = $z$0$i;
    }
    L280: while(1) {
     $526 = ($rp$2$ph38$i|0)<(18);
     $527 = (($x$i) + ($a$2$ph40$i<<2)|0);
     if ($526) {
      $e2$0$us$i = $e2$0$ph$i;$z$1$us$i = $z$1$ph39$i;
      while(1) {
       $529 = (($z$1$us$i) + 127)|0;
       $carry1$0$us$i = 0;$k$5$in$us$i = $529;$z$2$us$i = $z$1$us$i;
       while(1) {
        $k$5$us$i = $k$5$in$us$i & 127;
        $530 = (($x$i) + ($k$5$us$i<<2)|0);
        $531 = HEAP32[$530>>2]|0;
        $532 = (_bitshift64Shl(($531|0),0,29)|0);
        $533 = tempRet0;
        $534 = (_i64Add(($532|0),($533|0),($carry1$0$us$i|0),0)|0);
        $535 = tempRet0;
        $536 = ($535>>>0)>(0);
        $537 = ($535|0)==(0);
        $538 = ($534>>>0)>(1000000000);
        $539 = $537 & $538;
        $540 = $536 | $539;
        if ($540) {
         $541 = (___udivdi3(($534|0),($535|0),1000000000,0)|0);
         $542 = tempRet0;
         $543 = (___uremdi3(($534|0),($535|0),1000000000,0)|0);
         $544 = tempRet0;
         $$sink$off0$us$i = $543;$carry1$1$us$i = $541;
        } else {
         $$sink$off0$us$i = $534;$carry1$1$us$i = 0;
        }
        HEAP32[$530>>2] = $$sink$off0$us$i;
        $545 = (($z$2$us$i) + 127)|0;
        $546 = $545 & 127;
        $547 = ($k$5$us$i|0)!=($546|0);
        $548 = ($k$5$us$i|0)==($a$2$ph40$i|0);
        $or$cond12$us$i = $547 | $548;
        if ($or$cond12$us$i) {
         $z$3$us$i = $z$2$us$i;
        } else {
         $549 = ($$sink$off0$us$i|0)==(0);
         $k$5$z$2$us$i = $549 ? $k$5$us$i : $z$2$us$i;
         $z$3$us$i = $k$5$z$2$us$i;
        }
        $550 = (($k$5$us$i) + -1)|0;
        if ($548) {
         break;
        } else {
         $carry1$0$us$i = $carry1$1$us$i;$k$5$in$us$i = $550;$z$2$us$i = $z$3$us$i;
        }
       }
       $551 = (($e2$0$us$i) + -29)|0;
       $552 = ($carry1$1$us$i|0)==(0);
       if ($552) {
        $e2$0$us$i = $551;$z$1$us$i = $z$3$us$i;
       } else {
        $$lcssa43$i = $551;$carry1$1$lcssa$lcssa$i = $carry1$1$us$i;$z$3$lcssa$lcssa$i = $z$3$us$i;
        break;
       }
      }
     } else {
      $528 = ($rp$2$ph38$i|0)==(18);
      if ($528) {
       $e2$0$us44$i = $e2$0$ph$i;$z$1$us45$i = $z$1$ph39$i;
      } else {
       $a$3$ph$i = $a$2$ph40$i;$e2$1$ph$i = $e2$0$ph$i;$rp$3$ph33$i = $rp$2$ph38$i;$z$5$ph$i = $z$1$ph39$i;
       break;
      }
      while(1) {
       $553 = HEAP32[$527>>2]|0;
       $554 = ($553>>>0)<(9007199);
       if (!($554)) {
        $a$3$ph$i = $a$2$ph40$i;$e2$1$ph$i = $e2$0$us44$i;$rp$3$ph33$i = 18;$z$5$ph$i = $z$1$us45$i;
        break L280;
       }
       $555 = (($z$1$us45$i) + 127)|0;
       $carry1$0$us49$i = 0;$k$5$in$us48$i = $555;$z$2$us47$i = $z$1$us45$i;
       while(1) {
        $k$5$us50$i = $k$5$in$us48$i & 127;
        $556 = (($x$i) + ($k$5$us50$i<<2)|0);
        $557 = HEAP32[$556>>2]|0;
        $558 = (_bitshift64Shl(($557|0),0,29)|0);
        $559 = tempRet0;
        $560 = (_i64Add(($558|0),($559|0),($carry1$0$us49$i|0),0)|0);
        $561 = tempRet0;
        $562 = ($561>>>0)>(0);
        $563 = ($561|0)==(0);
        $564 = ($560>>>0)>(1000000000);
        $565 = $563 & $564;
        $566 = $562 | $565;
        if ($566) {
         $567 = (___udivdi3(($560|0),($561|0),1000000000,0)|0);
         $568 = tempRet0;
         $569 = (___uremdi3(($560|0),($561|0),1000000000,0)|0);
         $570 = tempRet0;
         $$sink$off0$us53$i = $569;$carry1$1$us54$i = $567;
        } else {
         $$sink$off0$us53$i = $560;$carry1$1$us54$i = 0;
        }
        HEAP32[$556>>2] = $$sink$off0$us53$i;
        $571 = (($z$2$us47$i) + 127)|0;
        $572 = $571 & 127;
        $573 = ($k$5$us50$i|0)!=($572|0);
        $574 = ($k$5$us50$i|0)==($a$2$ph40$i|0);
        $or$cond12$us55$i = $573 | $574;
        if ($or$cond12$us55$i) {
         $z$3$us57$i = $z$2$us47$i;
        } else {
         $575 = ($$sink$off0$us53$i|0)==(0);
         $k$5$z$2$us56$i = $575 ? $k$5$us50$i : $z$2$us47$i;
         $z$3$us57$i = $k$5$z$2$us56$i;
        }
        $576 = (($k$5$us50$i) + -1)|0;
        if ($574) {
         break;
        } else {
         $carry1$0$us49$i = $carry1$1$us54$i;$k$5$in$us48$i = $576;$z$2$us47$i = $z$3$us57$i;
        }
       }
       $577 = (($e2$0$us44$i) + -29)|0;
       $578 = ($carry1$1$us54$i|0)==(0);
       if ($578) {
        $e2$0$us44$i = $577;$z$1$us45$i = $z$3$us57$i;
       } else {
        $$lcssa43$i = $577;$carry1$1$lcssa$lcssa$i = $carry1$1$us54$i;$z$3$lcssa$lcssa$i = $z$3$us57$i;
        break;
       }
      }
     }
     $579 = (($rp$2$ph38$i) + 9)|0;
     $580 = (($a$2$ph40$i) + 127)|0;
     $581 = $580 & 127;
     $582 = ($581|0)==($z$3$lcssa$lcssa$i|0);
     if ($582) {
      $583 = (($z$3$lcssa$lcssa$i) + 127)|0;
      $584 = $583 & 127;
      $585 = (($x$i) + ($584<<2)|0);
      $586 = HEAP32[$585>>2]|0;
      $587 = (($z$3$lcssa$lcssa$i) + 126)|0;
      $588 = $587 & 127;
      $589 = (($x$i) + ($588<<2)|0);
      $590 = HEAP32[$589>>2]|0;
      $591 = $590 | $586;
      HEAP32[$589>>2] = $591;
      $z$4$i = $584;
     } else {
      $z$4$i = $z$3$lcssa$lcssa$i;
     }
     $592 = (($x$i) + ($581<<2)|0);
     HEAP32[$592>>2] = $carry1$1$lcssa$lcssa$i;
     $a$2$ph40$i = $581;$e2$0$ph$i = $$lcssa43$i;$rp$2$ph38$i = $579;$z$1$ph39$i = $z$4$i;
    }
    L311: while(1) {
     $629 = (($z$5$ph$i) + 1)|0;
     $626 = $629 & 127;
     $630 = (($z$5$ph$i) + 127)|0;
     $631 = $630 & 127;
     $632 = (($x$i) + ($631<<2)|0);
     $a$3$i$ph = $a$3$ph$i;$e2$1$i$ph = $e2$1$ph$i;$rp$3$i$ph = $rp$3$ph33$i;
     while(1) {
      $605 = ($rp$3$i$ph|0)==(18);
      $633 = ($rp$3$i$ph|0)>(27);
      $$14$i = $633 ? 9 : 1;
      $a$3$i = $a$3$i$ph;$e2$1$i = $e2$1$i$ph;
      while(1) {
       $i$025$i = 0;
       while(1) {
        $595 = (($i$025$i) + ($a$3$i))|0;
        $596 = $595 & 127;
        $597 = ($596|0)==($z$5$ph$i|0);
        if ($597) {
         $i$1$i = 2;
         break;
        }
        $598 = (($x$i) + ($596<<2)|0);
        $599 = HEAP32[$598>>2]|0;
        $600 = (3088 + ($i$025$i<<2)|0);
        $601 = HEAP32[$600>>2]|0;
        $602 = ($599>>>0)<($601>>>0);
        if ($602) {
         $i$1$i = 2;
         break;
        }
        $603 = ($599>>>0)>($601>>>0);
        $593 = (($i$025$i) + 1)|0;
        if ($603) {
         $i$1$i = $i$025$i;
         break;
        }
        $594 = ($593|0)<(2);
        if ($594) {
         $i$025$i = $593;
        } else {
         $i$1$i = $593;
         break;
        }
       }
       $604 = ($i$1$i|0)==(2);
       $or$cond13$i = $604 & $605;
       if ($or$cond13$i) {
        break L311;
       }
       $608 = (($$14$i) + ($e2$1$i))|0;
       $609 = ($a$3$i|0)==($z$5$ph$i|0);
       if ($609) {
        $a$3$i = $z$5$ph$i;$e2$1$i = $608;
       } else {
        break;
       }
      }
      $610 = 1 << $$14$i;
      $611 = (($610) + -1)|0;
      $612 = 1000000000 >>> $$14$i;
      $a$427$i = $a$3$i;$carry3$030$i = 0;$k$628$i = $a$3$i;$rp$426$i = $rp$3$i$ph;
      while(1) {
       $613 = (($x$i) + ($k$628$i<<2)|0);
       $614 = HEAP32[$613>>2]|0;
       $615 = $614 & $611;
       $616 = $614 >>> $$14$i;
       $617 = (($616) + ($carry3$030$i))|0;
       HEAP32[$613>>2] = $617;
       $618 = Math_imul($615, $612)|0;
       $619 = ($k$628$i|0)==($a$427$i|0);
       $620 = ($617|0)==(0);
       $or$cond15$i = $619 & $620;
       $621 = (($k$628$i) + 1)|0;
       $622 = $621 & 127;
       $623 = (($rp$426$i) + -9)|0;
       $rp$5$i = $or$cond15$i ? $623 : $rp$426$i;
       $a$5$i = $or$cond15$i ? $622 : $a$427$i;
       $624 = ($622|0)==($z$5$ph$i|0);
       if ($624) {
        break;
       } else {
        $a$427$i = $a$5$i;$carry3$030$i = $618;$k$628$i = $622;$rp$426$i = $rp$5$i;
       }
      }
      $625 = ($618|0)==(0);
      if ($625) {
       $a$3$i$ph = $a$5$i;$e2$1$i$ph = $608;$rp$3$i$ph = $rp$5$i;
       continue;
      }
      $627 = ($626|0)==($a$5$i|0);
      if (!($627)) {
       break;
      }
      $634 = HEAP32[$632>>2]|0;
      $635 = $634 | 1;
      HEAP32[$632>>2] = $635;
      $a$3$i$ph = $a$5$i;$e2$1$i$ph = $608;$rp$3$i$ph = $rp$5$i;
     }
     $628 = (($x$i) + ($z$5$ph$i<<2)|0);
     HEAP32[$628>>2] = $618;
     $a$3$ph$i = $a$5$i;$e2$1$ph$i = $608;$rp$3$ph33$i = $rp$5$i;$z$5$ph$i = $626;
    }
    $606 = $a$3$i & 127;
    $607 = ($606|0)==($z$5$ph$i|0);
    if ($607) {
     $636 = (($626) + -1)|0;
     $637 = (($x$i) + ($636<<2)|0);
     HEAP32[$637>>2] = 0;
     $z$7$i = $626;
    } else {
     $z$7$i = $z$5$ph$i;
    }
    $638 = (($x$i) + ($606<<2)|0);
    $639 = HEAP32[$638>>2]|0;
    $640 = (+($639>>>0));
    $641 = (($a$3$i) + 1)|0;
    $642 = $641 & 127;
    $643 = ($642|0)==($z$7$i|0);
    if ($643) {
     $702 = (($z$7$i) + 1)|0;
     $703 = $702 & 127;
     $704 = (($703) + -1)|0;
     $705 = (($x$i) + ($704<<2)|0);
     HEAP32[$705>>2] = 0;
     $z$7$1$i = $703;
    } else {
     $z$7$1$i = $z$7$i;
    }
    $706 = $640 * 1.0E+9;
    $707 = (($x$i) + ($642<<2)|0);
    $708 = HEAP32[$707>>2]|0;
    $709 = (+($708>>>0));
    $710 = $706 + $709;
    $667 = (+($sign$0|0));
    $649 = $667 * $710;
    $687 = (($e2$1$i) + 53)|0;
    $644 = (($687) - ($emin$0$ph))|0;
    $711 = ($644|0)<($bits$0$ph|0);
    if ($711) {
     $645 = ($644|0)<(0);
     $$$i22 = $645 ? 0 : $644;
     $$09$i = $$$i22;$denormal$0$i = 1;
    } else {
     $$09$i = $bits$0$ph;$denormal$0$i = 0;
    }
    $646 = ($$09$i|0)<(53);
    if ($646) {
     $647 = (105 - ($$09$i))|0;
     $648 = (+_scalbn(1.0,$647));
     $650 = (+_copysignl((+$648),(+$649)));
     $651 = (53 - ($$09$i))|0;
     $652 = (+_scalbn(1.0,$651));
     $653 = (+_fmodl((+$649),(+$652)));
     $654 = $649 - $653;
     $655 = $650 + $654;
     $bias$0$i = $650;$frac$0$i = $653;$y$1$i23 = $655;
    } else {
     $bias$0$i = 0.0;$frac$0$i = 0.0;$y$1$i23 = $649;
    }
    $656 = (($a$3$i) + 2)|0;
    $657 = $656 & 127;
    $658 = ($657|0)==($z$7$1$i|0);
    do {
     if ($658) {
      $frac$2$i = $frac$0$i;
     } else {
      $659 = (($x$i) + ($657<<2)|0);
      $660 = HEAP32[$659>>2]|0;
      $661 = ($660>>>0)<(500000000);
      do {
       if ($661) {
        $662 = ($660|0)==(0);
        if ($662) {
         $663 = (($a$3$i) + 3)|0;
         $664 = $663 & 127;
         $665 = ($664|0)==($z$7$1$i|0);
         if ($665) {
          $frac$1$i = $frac$0$i;
          break;
         }
        }
        $666 = $667 * 0.25;
        $668 = $666 + $frac$0$i;
        $frac$1$i = $668;
       } else {
        $669 = ($660>>>0)>(500000000);
        if ($669) {
         $670 = $667 * 0.75;
         $671 = $670 + $frac$0$i;
         $frac$1$i = $671;
         break;
        }
        $672 = (($a$3$i) + 3)|0;
        $673 = $672 & 127;
        $674 = ($673|0)==($z$7$1$i|0);
        if ($674) {
         $675 = $667 * 0.5;
         $676 = $675 + $frac$0$i;
         $frac$1$i = $676;
         break;
        } else {
         $677 = $667 * 0.75;
         $678 = $677 + $frac$0$i;
         $frac$1$i = $678;
         break;
        }
       }
      } while(0);
      $679 = (53 - ($$09$i))|0;
      $680 = ($679|0)>(1);
      if (!($680)) {
       $frac$2$i = $frac$1$i;
       break;
      }
      $681 = (+_fmodl((+$frac$1$i),1.0));
      $682 = $681 != 0.0;
      if ($682) {
       $frac$2$i = $frac$1$i;
       break;
      }
      $683 = $frac$1$i + 1.0;
      $frac$2$i = $683;
     }
    } while(0);
    $684 = $y$1$i23 + $frac$2$i;
    $685 = $684 - $bias$0$i;
    $686 = $687 & 2147483647;
    $688 = (-2 - ($sum$i))|0;
    $689 = ($686|0)>($688|0);
    do {
     if ($689) {
      $690 = (+Math_abs((+$685)));
      $691 = !($690 >= 9007199254740992.0);
      if ($691) {
       $denormal$2$i = $denormal$0$i;$e2$2$i = $e2$1$i;$y$2$i24 = $685;
      } else {
       $692 = ($denormal$0$i|0)!=(0);
       $693 = ($$09$i|0)==($644|0);
       $or$cond16$i = $692 & $693;
       $denormal$1$i = $or$cond16$i ? 0 : $denormal$0$i;
       $694 = $685 * 0.5;
       $695 = (($e2$1$i) + 1)|0;
       $denormal$2$i = $denormal$1$i;$e2$2$i = $695;$y$2$i24 = $694;
      }
      $696 = (($e2$2$i) + 50)|0;
      $697 = ($696|0)>($325|0);
      if (!($697)) {
       $698 = ($denormal$2$i|0)!=(0);
       $699 = $frac$2$i != 0.0;
       $or$cond17$i = $698 & $699;
       if (!($or$cond17$i)) {
        $e2$3$i = $e2$2$i;$y$3$i = $y$2$i24;
        break;
       }
      }
      $700 = (___errno_location()|0);
      HEAP32[$700>>2] = 34;
      $e2$3$i = $e2$2$i;$y$3$i = $y$2$i24;
     } else {
      $e2$3$i = $e2$1$i;$y$3$i = $685;
     }
    } while(0);
    $701 = (+_scalbnl($y$3$i,$e2$3$i));
    $$0 = $701;
    STACKTOP = sp;return (+$$0);
   } else if ((($i$3|0) == 3)) {
    $68 = HEAP32[$0>>2]|0;
    $69 = HEAP32[$1>>2]|0;
    $70 = ($68>>>0)<($69>>>0);
    if ($70) {
     $71 = (($68) + 1|0);
     HEAP32[$0>>2] = $71;
     $72 = HEAP8[$68>>0]|0;
     $73 = $72&255;
     $75 = $73;
    } else {
     $74 = (___shgetc($f)|0);
     $75 = $74;
    }
    $76 = ($75|0)==(40);
    if ($76) {
     $i$4 = 1;
    } else {
     $77 = HEAP32[$1>>2]|0;
     $78 = ($77|0)==(0|0);
     if ($78) {
      $$0 = nan;
      STACKTOP = sp;return (+$$0);
     }
     $79 = HEAP32[$0>>2]|0;
     $80 = (($79) + -1|0);
     HEAP32[$0>>2] = $80;
     $$0 = nan;
     STACKTOP = sp;return (+$$0);
    }
    while(1) {
     $81 = HEAP32[$0>>2]|0;
     $82 = HEAP32[$1>>2]|0;
     $83 = ($81>>>0)<($82>>>0);
     if ($83) {
      $84 = (($81) + 1|0);
      HEAP32[$0>>2] = $84;
      $85 = HEAP8[$81>>0]|0;
      $86 = $85&255;
      $89 = $86;
     } else {
      $87 = (___shgetc($f)|0);
      $89 = $87;
     }
     $88 = (($89) + -48)|0;
     $90 = ($88>>>0)<(10);
     $91 = (($89) + -65)|0;
     $92 = ($91>>>0)<(26);
     $or$cond8 = $90 | $92;
     if (!($or$cond8)) {
      $93 = (($89) + -97)|0;
      $94 = ($93>>>0)<(26);
      $95 = ($89|0)==(95);
      $or$cond5 = $94 | $95;
      if (!($or$cond5)) {
       break;
      }
     }
     $107 = (($i$4) + 1)|0;
     $i$4 = $107;
    }
    $96 = ($89|0)==(41);
    if ($96) {
     $$0 = nan;
     STACKTOP = sp;return (+$$0);
    }
    $97 = HEAP32[$1>>2]|0;
    $98 = ($97|0)==(0|0);
    if (!($98)) {
     $99 = HEAP32[$0>>2]|0;
     $100 = (($99) + -1|0);
     HEAP32[$0>>2] = $100;
    }
    if ($39) {
     $102 = (___errno_location()|0);
     HEAP32[$102>>2] = 22;
     ___shlim($f,0);
     $$0 = 0.0;
     STACKTOP = sp;return (+$$0);
    }
    $101 = ($i$4|0)==(0);
    $brmerge107 = $101 | $98;
    if ($brmerge107) {
     $$0 = nan;
     STACKTOP = sp;return (+$$0);
    } else {
     $$in = $i$4;
    }
    while(1) {
     $103 = (($$in) + -1)|0;
     $104 = HEAP32[$0>>2]|0;
     $105 = (($104) + -1|0);
     HEAP32[$0>>2] = $105;
     $106 = ($103|0)==(0);
     if ($106) {
      $$0 = nan;
      break;
     } else {
      $$in = $103;
     }
    }
    STACKTOP = sp;return (+$$0);
   } else {
    $108 = HEAP32[$1>>2]|0;
    $109 = ($108|0)==(0|0);
    if (!($109)) {
     $110 = HEAP32[$0>>2]|0;
     $111 = (($110) + -1|0);
     HEAP32[$0>>2] = $111;
    }
    $112 = (___errno_location()|0);
    HEAP32[$112>>2] = 22;
    ___shlim($f,0);
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   }
  }
 } while(0);
 if ((label|0) == 23) {
  $41 = HEAP32[$1>>2]|0;
  $42 = ($41|0)==(0|0);
  if (!($42)) {
   $43 = HEAP32[$0>>2]|0;
   $44 = (($43) + -1|0);
   HEAP32[$0>>2] = $44;
  }
  $notlhs = ($pok|0)==(0);
  $notrhs = ($i$0$lcssa>>>0)<(4);
  $or$cond106$not = $notrhs | $notlhs;
  $brmerge = $or$cond106$not | $42;
  if (!($brmerge)) {
   $i$166 = $i$0$lcssa;
   while(1) {
    $45 = HEAP32[$0>>2]|0;
    $46 = (($45) + -1|0);
    HEAP32[$0>>2] = $46;
    $47 = (($i$166) + -1)|0;
    $48 = ($47>>>0)>(3);
    if ($48) {
     $i$166 = $47;
    } else {
     break;
    }
   }
  }
 }
 $49 = (+($sign$0|0));
 $50 = $49 * inf;
 $51 = $50;
 $$0 = $51;
 STACKTOP = sp;return (+$$0);
}
function _scanexp($f,$pok) {
 $f = $f|0;
 $pok = $pok|0;
 var $$ = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $c$0 = 0, $c$1$be = 0;
 var $c$18 = 0, $c$2$be = 0, $c$2$lcssa = 0, $c$23 = 0, $c$3$be = 0, $neg$0 = 0, $or$cond = 0, $or$cond2 = 0, $phitmp16 = 0, $x$09 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($f) + 100|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)<($3>>>0);
 if ($4) {
  $5 = (($1) + 1|0);
  HEAP32[$0>>2] = $5;
  $6 = HEAP8[$1>>0]|0;
  $7 = $6&255;
  $9 = $7;
 } else {
  $8 = (___shgetc($f)|0);
  $9 = $8;
 }
 $10 = ($9|0)==(45);
 if ((($9|0) == 43) | (($9|0) == 45)) {
  $11 = $10&1;
  $12 = HEAP32[$0>>2]|0;
  $13 = HEAP32[$2>>2]|0;
  $14 = ($12>>>0)<($13>>>0);
  if ($14) {
   $15 = (($12) + 1|0);
   HEAP32[$0>>2] = $15;
   $16 = HEAP8[$12>>0]|0;
   $17 = $16&255;
   $20 = $17;
  } else {
   $18 = (___shgetc($f)|0);
   $20 = $18;
  }
  $19 = (($20) + -48)|0;
  $21 = ($19>>>0)<(10);
  $22 = ($pok|0)==(0);
  $or$cond = $21 | $22;
  if ($or$cond) {
   $c$0 = $20;$neg$0 = $11;
  } else {
   $23 = HEAP32[$2>>2]|0;
   $24 = ($23|0)==(0|0);
   if ($24) {
    $c$0 = $20;$neg$0 = $11;
   } else {
    $25 = HEAP32[$0>>2]|0;
    $26 = (($25) + -1|0);
    HEAP32[$0>>2] = $26;
    $c$0 = $20;$neg$0 = $11;
   }
  }
 } else {
  $c$0 = $9;$neg$0 = 0;
 }
 $27 = (($c$0) + -48)|0;
 $28 = ($27>>>0)>(9);
 if ($28) {
  $29 = HEAP32[$2>>2]|0;
  $30 = ($29|0)==(0|0);
  if ($30) {
   $95 = -2147483648;$96 = 0;
   tempRet0 = $95;
   STACKTOP = sp;return ($96|0);
  }
  $31 = HEAP32[$0>>2]|0;
  $32 = (($31) + -1|0);
  HEAP32[$0>>2] = $32;
  $95 = -2147483648;$96 = 0;
  tempRet0 = $95;
  STACKTOP = sp;return ($96|0);
 } else {
  $c$18 = $c$0;$x$09 = 0;
 }
 while(1) {
  $33 = (($c$18) + -48)|0;
  $34 = (($33) + ($x$09))|0;
  $35 = HEAP32[$0>>2]|0;
  $36 = HEAP32[$2>>2]|0;
  $37 = ($35>>>0)<($36>>>0);
  if ($37) {
   $38 = (($35) + 1|0);
   HEAP32[$0>>2] = $38;
   $39 = HEAP8[$35>>0]|0;
   $40 = $39&255;
   $c$1$be = $40;
  } else {
   $41 = (___shgetc($f)|0);
   $c$1$be = $41;
  }
  $42 = (($c$1$be) + -48)|0;
  $43 = ($42>>>0)<(10);
  $44 = ($34|0)<(214748364);
  $$ = $43 & $44;
  if (!($$)) {
   break;
  }
  $phitmp16 = ($34*10)|0;
  $c$18 = $c$1$be;$x$09 = $phitmp16;
 }
 $45 = ($34|0)<(0);
 $46 = $45 << 31 >> 31;
 $47 = (($c$1$be) + -48)|0;
 $48 = ($47>>>0)<(10);
 if ($48) {
  $51 = $34;$52 = $46;$c$23 = $c$1$be;
  while(1) {
   $53 = (___muldi3(($51|0),($52|0),10,0)|0);
   $54 = tempRet0;
   $55 = ($c$23|0)<(0);
   $56 = $55 << 31 >> 31;
   $57 = (_i64Add(($c$23|0),($56|0),-48,-1)|0);
   $58 = tempRet0;
   $59 = (_i64Add(($57|0),($58|0),($53|0),($54|0))|0);
   $60 = tempRet0;
   $61 = HEAP32[$0>>2]|0;
   $62 = HEAP32[$2>>2]|0;
   $63 = ($61>>>0)<($62>>>0);
   if ($63) {
    $64 = (($61) + 1|0);
    HEAP32[$0>>2] = $64;
    $65 = HEAP8[$61>>0]|0;
    $66 = $65&255;
    $c$2$be = $66;
   } else {
    $67 = (___shgetc($f)|0);
    $c$2$be = $67;
   }
   $68 = (($c$2$be) + -48)|0;
   $69 = ($68>>>0)<(10);
   $70 = ($60|0)<(21474836);
   $71 = ($60|0)==(21474836);
   $72 = ($59>>>0)<(2061584302);
   $73 = $71 & $72;
   $74 = $70 | $73;
   $or$cond2 = $69 & $74;
   if ($or$cond2) {
    $51 = $59;$52 = $60;$c$23 = $c$2$be;
   } else {
    $89 = $59;$90 = $60;$c$2$lcssa = $c$2$be;
    break;
   }
  }
 } else {
  $89 = $34;$90 = $46;$c$2$lcssa = $c$1$be;
 }
 $49 = (($c$2$lcssa) + -48)|0;
 $50 = ($49>>>0)<(10);
 if ($50) {
  while(1) {
   $75 = HEAP32[$0>>2]|0;
   $76 = HEAP32[$2>>2]|0;
   $77 = ($75>>>0)<($76>>>0);
   if ($77) {
    $78 = (($75) + 1|0);
    HEAP32[$0>>2] = $78;
    $79 = HEAP8[$75>>0]|0;
    $80 = $79&255;
    $c$3$be = $80;
   } else {
    $81 = (___shgetc($f)|0);
    $c$3$be = $81;
   }
   $82 = (($c$3$be) + -48)|0;
   $83 = ($82>>>0)<(10);
   if (!($83)) {
    break;
   }
  }
 }
 $84 = HEAP32[$2>>2]|0;
 $85 = ($84|0)==(0|0);
 if (!($85)) {
  $86 = HEAP32[$0>>2]|0;
  $87 = (($86) + -1|0);
  HEAP32[$0>>2] = $87;
 }
 $88 = ($neg$0|0)!=(0);
 $91 = (_i64Subtract(0,0,($89|0),($90|0))|0);
 $92 = tempRet0;
 $93 = $88 ? $91 : $89;
 $94 = $88 ? $92 : $90;
 $95 = $94;$96 = $93;
 tempRet0 = $95;
 STACKTOP = sp;return ($96|0);
}
function ___shlim($f,$lim) {
 $f = $f|0;
 $lim = $lim|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 104|0);
 HEAP32[$0>>2] = $lim;
 $1 = (($f) + 8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = (($f) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $2;
 $6 = $4;
 $7 = (($5) - ($6))|0;
 $8 = (($f) + 108|0);
 HEAP32[$8>>2] = $7;
 $9 = ($lim|0)!=(0);
 $10 = ($7|0)>($lim|0);
 $or$cond = $9 & $10;
 if ($or$cond) {
  $11 = (($4) + ($lim)|0);
  $12 = (($f) + 100|0);
  HEAP32[$12>>2] = $11;
  STACKTOP = sp;return;
 } else {
  $13 = (($f) + 100|0);
  HEAP32[$13>>2] = $2;
  STACKTOP = sp;return;
 }
}
function ___shgetc($f) {
 $f = $f|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$phi$trans$insert2 = 0, $$pre = 0, $$pre3 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 104|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  label = 3;
 } else {
  $3 = (($f) + 108|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)<($1|0);
  if ($5) {
   label = 3;
  }
 }
 if ((label|0) == 3) {
  $6 = (___uflow($f)|0);
  $7 = ($6|0)<(0);
  if (!($7)) {
   $9 = HEAP32[$0>>2]|0;
   $10 = ($9|0)==(0);
   $$phi$trans$insert = (($f) + 8|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   if ($10) {
    label = 8;
   } else {
    $11 = (($f) + 4|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = $$pre;
    $14 = $12;
    $15 = (($13) - ($14))|0;
    $16 = (($f) + 108|0);
    $17 = HEAP32[$16>>2]|0;
    $18 = (($9) - ($17))|0;
    $19 = (($18) + -1)|0;
    $20 = ($15|0)>($19|0);
    if ($20) {
     $21 = (($12) + ($19)|0);
     $22 = (($f) + 100|0);
     HEAP32[$22>>2] = $21;
    } else {
     label = 8;
    }
   }
   if ((label|0) == 8) {
    $23 = (($f) + 100|0);
    HEAP32[$23>>2] = $$pre;
   }
   $24 = ($$pre|0)==(0|0);
   $$phi$trans$insert2 = (($f) + 4|0);
   $$pre3 = HEAP32[$$phi$trans$insert2>>2]|0;
   if (!($24)) {
    $25 = $$pre;
    $26 = $$pre3;
    $27 = (($f) + 108|0);
    $28 = HEAP32[$27>>2]|0;
    $29 = (($25) + 1)|0;
    $30 = (($29) - ($26))|0;
    $31 = (($30) + ($28))|0;
    HEAP32[$27>>2] = $31;
   }
   $32 = (($$pre3) + -1|0);
   $33 = HEAP8[$32>>0]|0;
   $34 = $33&255;
   $35 = ($34|0)==($6|0);
   if ($35) {
    $$0 = $6;
    STACKTOP = sp;return ($$0|0);
   }
   $36 = $6&255;
   HEAP8[$32>>0] = $36;
   $$0 = $6;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $8 = (($f) + 100|0);
 HEAP32[$8>>2] = 0;
 $$0 = -1;
 STACKTOP = sp;return ($$0|0);
}
function _scalbn($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $$ = 0, $$0 = 0, $$1 = 0, $0 = 0, $1 = 0.0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0.0, $9 = 0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)>(1023);
 if ($0) {
  $1 = $x * 8.9884656743115795E+307;
  $2 = (($n) + -1023)|0;
  $3 = ($2|0)>(1023);
  if ($3) {
   $4 = $1 * 8.9884656743115795E+307;
   $5 = (($n) + -2046)|0;
   $6 = ($5|0)>(1023);
   $$ = $6 ? 1023 : $5;
   $$0 = $$;$y$0 = $4;
  } else {
   $$0 = $2;$y$0 = $1;
  }
 } else {
  $7 = ($n|0)<(-1022);
  if ($7) {
   $8 = $x * 2.2250738585072014E-308;
   $9 = (($n) + 1022)|0;
   $10 = ($9|0)<(-1022);
   if ($10) {
    $11 = $8 * 2.2250738585072014E-308;
    $12 = (($n) + 2044)|0;
    $13 = ($12|0)<(-1022);
    $$1 = $13 ? -1022 : $12;
    $$0 = $$1;$y$0 = $11;
   } else {
    $$0 = $9;$y$0 = $8;
   }
  } else {
   $$0 = $n;$y$0 = $x;
  }
 }
 $14 = (($$0) + 1023)|0;
 $15 = (_bitshift64Shl(($14|0),0,52)|0);
 $16 = tempRet0;
 HEAP32[tempDoublePtr>>2] = $15;HEAP32[tempDoublePtr+4>>2] = $16;$17 = +HEAPF64[tempDoublePtr>>3];
 $18 = $y$0 * $17;
 STACKTOP = sp;return (+$18);
}
function _scalbnl($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_scalbn($x,$n));
 STACKTOP = sp;return (+$0);
}
function ___toread($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = (($f) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (($f) + 44|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($7>>>0)>($9>>>0);
 if ($10) {
  $11 = (($f) + 36|0);
  $12 = HEAP32[$11>>2]|0;
  (FUNCTION_TABLE_iiii[$12 & 0]($f,0,0)|0);
 }
 $13 = (($f) + 16|0);
 HEAP32[$13>>2] = 0;
 $14 = (($f) + 28|0);
 HEAP32[$14>>2] = 0;
 HEAP32[$6>>2] = 0;
 $15 = HEAP32[$f>>2]|0;
 $16 = $15 & 20;
 $17 = ($16|0)==(0);
 if ($17) {
  $21 = HEAP32[$8>>2]|0;
  $22 = (($f) + 8|0);
  HEAP32[$22>>2] = $21;
  $23 = (($f) + 4|0);
  HEAP32[$23>>2] = $21;
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $18 = $15 & 4;
 $19 = ($18|0)==(0);
 if ($19) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $20 = $15 | 32;
 HEAP32[$f>>2] = $20;
 $$0 = -1;
 STACKTOP = sp;return ($$0|0);
}
function ___uflow($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $c = sp;
 $0 = (($f) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $3 = (___toread($f)|0);
  $4 = ($3|0)==(0);
  if ($4) {
   label = 3;
  } else {
   $$0 = -1;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $5 = (($f) + 32|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = (FUNCTION_TABLE_iiii[$6 & 0]($f,$c,1)|0);
  $8 = ($7|0)==(1);
  if ($8) {
   $9 = HEAP8[$c>>0]|0;
   $10 = $9&255;
   $$0 = $10;
  } else {
   $$0 = -1;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _atof($s) {
 $s = $s|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_strtod($s,0));
 STACKTOP = sp;return (+$0);
}
function _atoi($s) {
 $s = $s|0;
 var $$0 = 0, $$1$ph = 0, $$12 = 0, $$neg1 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n$0$lcssa = 0, $n$03 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = (($$0) + 1|0);
  if ($3) {
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else {
  $$1$ph = $$0;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$4>>0]|0;
  $$1$ph = $4;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $9 = (_isdigit($7)|0);
 $10 = ($9|0)==(0);
 if ($10) {
  $n$0$lcssa = 0;
  $20 = ($neg$1$ph|0)!=(0);
  $21 = (0 - ($n$0$lcssa))|0;
  $22 = $20 ? $n$0$lcssa : $21;
  STACKTOP = sp;return ($22|0);
 } else {
  $$12 = $$1$ph;$n$03 = 0;
 }
 while(1) {
  $11 = ($n$03*10)|0;
  $12 = (($$12) + 1|0);
  $13 = HEAP8[$$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $$neg1 = (($11) + 48)|0;
  $15 = (($$neg1) - ($14))|0;
  $16 = HEAP8[$12>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = (_isdigit($17)|0);
  $19 = ($18|0)==(0);
  if ($19) {
   $n$0$lcssa = $15;
   break;
  } else {
   $$12 = $12;$n$03 = $15;
  }
 }
 $20 = ($neg$1$ph|0)!=(0);
 $21 = (0 - ($n$0$lcssa))|0;
 $22 = $20 ? $n$0$lcssa : $21;
 STACKTOP = sp;return ($22|0);
}
function _atol($s) {
 $s = $s|0;
 var $$0 = 0, $$1$ph = 0, $$12 = 0, $$neg1 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n$0$lcssa = 0, $n$03 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = (($$0) + 1|0);
  if ($3) {
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else {
  $$1$ph = $$0;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$4>>0]|0;
  $$1$ph = $4;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $9 = (_isdigit($7)|0);
 $10 = ($9|0)==(0);
 if ($10) {
  $n$0$lcssa = 0;
  $20 = ($neg$1$ph|0)!=(0);
  $21 = (0 - ($n$0$lcssa))|0;
  $22 = $20 ? $n$0$lcssa : $21;
  STACKTOP = sp;return ($22|0);
 } else {
  $$12 = $$1$ph;$n$03 = 0;
 }
 while(1) {
  $11 = ($n$03*10)|0;
  $12 = (($$12) + 1|0);
  $13 = HEAP8[$$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $$neg1 = (($11) + 48)|0;
  $15 = (($$neg1) - ($14))|0;
  $16 = HEAP8[$12>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = (_isdigit($17)|0);
  $19 = ($18|0)==(0);
  if ($19) {
   $n$0$lcssa = $15;
   break;
  } else {
   $$12 = $12;$n$03 = $15;
  }
 }
 $20 = ($neg$1$ph|0)!=(0);
 $21 = (0 - ($n$0$lcssa))|0;
 $22 = $20 ? $n$0$lcssa : $21;
 STACKTOP = sp;return ($22|0);
}
function _strtod($s,$p) {
 $s = $s|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 dest=$f$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,1,1));
 $5 = (($f$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  STACKTOP = sp;return (+$4);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 STACKTOP = sp;return (+$4);
}
function _strcmp($l,$r) {
 $l = $l|0;
 $r = $r|0;
 var $$014 = 0, $$05 = 0, $$lcssa = 0, $$lcssa2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$l>>0]|0;
 $1 = HEAP8[$r>>0]|0;
 $2 = ($0<<24>>24)!=($1<<24>>24);
 $3 = ($0<<24>>24)==(0);
 $or$cond3 = $2 | $3;
 if ($or$cond3) {
  $$lcssa = $0;$$lcssa2 = $1;
 } else {
  $$014 = $l;$$05 = $r;
  while(1) {
   $4 = (($$014) + 1|0);
   $5 = (($$05) + 1|0);
   $6 = HEAP8[$4>>0]|0;
   $7 = HEAP8[$5>>0]|0;
   $8 = ($6<<24>>24)!=($7<<24>>24);
   $9 = ($6<<24>>24)==(0);
   $or$cond = $8 | $9;
   if ($or$cond) {
    $$lcssa = $6;$$lcssa2 = $7;
    break;
   } else {
    $$014 = $4;$$05 = $5;
   }
  }
 }
 $10 = $$lcssa&255;
 $11 = $$lcssa2&255;
 $12 = (($10) - ($11))|0;
 STACKTOP = sp;return ($12|0);
}
function runPostSets() {
 
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
  }
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_ctlz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((ctlz_i8)+(x >>> 24))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((ctlz_i8)+(x&0xff))>>0)])|0) + 24)|0;
  }

function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return (tempRet0 = tempRet0, $10$0) | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return (tempRet0 = tempRet0, $1$0) | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (_llvm_ctlz_i32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0, $d_sroa_0_0_insert_insert99$1, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



// EMSCRIPTEN_END_FUNCS

  
  function dynCall_iiii(index,a1,a2,a3) {
    index = index|0;
    a1=a1|0; a2=a2|0; a3=a3|0;
    return FUNCTION_TABLE_iiii[index&0](a1|0,a2|0,a3|0)|0;
  }

function b0(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0; }
  // EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_iiii = [b0];

  return { _strlen: _strlen, _free: _free, _main: _main, _i64Add: _i64Add, _i64Subtract: _i64Subtract, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real__main = asm["_main"]; asm["_main"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__main.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};

var real_runPostSets = asm["runPostSets"]; asm["runPostSets"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real_runPostSets.apply(null, arguments);
};
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _main = Module["_main"] = asm["_main"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so not exiting');
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



