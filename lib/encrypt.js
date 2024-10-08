// https://github.com/shanecurran/node-mceliece/blob/master/mceliece.js
var mceliece = (function() {
    var Module;
    if (!Module) Module = (typeof Module !== "undefined" ? Module : null) || {};
    var moduleOverrides = {};
    for (var key in Module) {
        if (Module.hasOwnProperty(key)) {
            moduleOverrides[key] = Module[key]
        }
    }
    var ENVIRONMENT_IS_WEB = typeof window === "object";
    var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
    var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    if (ENVIRONMENT_IS_NODE) {
        if (!Module["print"]) Module["print"] = function print(x) {
            process["stdout"].write(x + "\n")
        };
        if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
            process["stderr"].write(x + "\n")
        };
        var nodeFS = require("fs");
        var nodePath = require("path");
        Module["read"] = function read(filename, binary) {
            filename = nodePath["normalize"](filename);
            var ret = nodeFS["readFileSync"](filename);
            if (!ret && filename != nodePath["resolve"](filename)) {
                filename = path.join(__dirname, "..", "src", filename);
                ret = nodeFS["readFileSync"](filename)
            }
            if (ret && !binary) ret = ret.toString();
            return ret
        };
        Module["readBinary"] = function readBinary(filename) {
            var ret = Module["read"](filename, true);
            if (!ret.buffer) {
                ret = new Uint8Array(ret)
            }
            assert(ret.buffer);
            return ret
        };
        Module["load"] = function load(f) {
            globalEval(read(f))
        };
        if (!Module["thisProgram"]) {
            if (process["argv"].length > 1) {
                Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
            } else {
                Module["thisProgram"] = "unknown-program"
            }
        }
        Module["arguments"] = process["argv"].slice(2);
        if (typeof module !== "undefined") {
            module["exports"] = Module
        }
        process["on"]("uncaughtException", (function(ex) {
            if (!(ex instanceof ExitStatus)) {
                throw ex
            }
        }));
        Module["inspect"] = (function() {
            return "[Emscripten Module object]"
        })
    } else if (ENVIRONMENT_IS_SHELL) {
        if (!Module["print"]) Module["print"] = print;
        if (typeof printErr != "undefined") Module["printErr"] = printErr;
        if (typeof read != "undefined") {
            Module["read"] = read
        } else {
            Module["read"] = function read() {
                throw "no read() available (jsc?)"
            }
        }
        Module["readBinary"] = function readBinary(f) {
            if (typeof readbuffer === "function") {
                return new Uint8Array(readbuffer(f))
            }
            var data = read(f, "binary");
            assert(typeof data === "object");
            return data
        };
        if (typeof scriptArgs != "undefined") {
            Module["arguments"] = scriptArgs
        } else if (typeof arguments != "undefined") {
            Module["arguments"] = arguments
        }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        Module["read"] = function read(url) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        };
        if (typeof arguments != "undefined") {
            Module["arguments"] = arguments
        }
        if (typeof console !== "undefined") {
            if (!Module["print"]) Module["print"] = function print(x) {
                console.log(x)
            };
            if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
                console.log(x)
            }
        } else {
            var TRY_USE_DUMP = false;
            if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
                dump(x)
            }) : (function(x) {})
        }
        if (ENVIRONMENT_IS_WORKER) {
            Module["load"] = importScripts
        }
        if (typeof Module["setWindowTitle"] === "undefined") {
            Module["setWindowTitle"] = (function(title) {
                document.title = title
            })
        }
    } else {
        throw "Unknown runtime environment. Where are we?"
    }

    function globalEval(x) {
        throw "NO_DYNAMIC_EXECUTION was set, cannot eval"
    }
    if (!Module["load"] && Module["read"]) {
        Module["load"] = function load(f) {
            globalEval(Module["read"](f))
        }
    }
    if (!Module["print"]) {
        Module["print"] = (function() {})
    }
    if (!Module["printErr"]) {
        Module["printErr"] = Module["print"]
    }
    if (!Module["arguments"]) {
        Module["arguments"] = []
    }
    if (!Module["thisProgram"]) {
        Module["thisProgram"] = "./this.program"
    }
    Module.print = Module["print"];
    Module.printErr = Module["printErr"];
    Module["preRun"] = [];
    Module["postRun"] = [];
    for (var key in moduleOverrides) {
        if (moduleOverrides.hasOwnProperty(key)) {
            Module[key] = moduleOverrides[key]
        }
    }
    var Runtime = {
        setTempRet0: (function(value) {
            tempRet0 = value
        }),
        getTempRet0: (function() {
            return tempRet0
        }),
        stackSave: (function() {
            return STACKTOP
        }),
        stackRestore: (function(stackTop) {
            STACKTOP = stackTop
        }),
        getNativeTypeSize: (function(type) {
            switch (type) {
                case "i1":
                case "i8":
                    return 1;
                case "i16":
                    return 2;
                case "i32":
                    return 4;
                case "i64":
                    return 8;
                case "float":
                    return 4;
                case "double":
                    return 8;
                default:
                    {
                        if (type[type.length - 1] === "*") {
                            return Runtime.QUANTUM_SIZE
                        } else if (type[0] === "i") {
                            var bits = parseInt(type.substr(1));
                            assert(bits % 8 === 0);
                            return bits / 8
                        } else {
                            return 0
                        }
                    }
            }
        }),
        getNativeFieldSize: (function(type) {
            return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE)
        }),
        STACK_ALIGN: 16,
        prepVararg: (function(ptr, type) {
            if (type === "double" || type === "i64") {
                if (ptr & 7) {
                    assert((ptr & 7) === 4);
                    ptr += 4
                }
            } else {
                assert((ptr & 3) === 0)
            }
            return ptr
        }),
        getAlignSize: (function(type, size, vararg) {
            if (!vararg && (type == "i64" || type == "double")) return 8;
            if (!type) return Math.min(size, 8);
            return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE)
        }),
        dynCall: (function(sig, ptr, args) {
            if (args && args.length) {
                if (!args.splice) args = Array.prototype.slice.call(args);
                args.splice(0, 0, ptr);
                return Module["dynCall_" + sig].apply(null, args)
            } else {
                return Module["dynCall_" + sig].call(null, ptr)
            }
        }),
        functionPointers: [null, null, null, null, null, null, null, null],
        addFunction: (function(func) {
            for (var i = 0; i < Runtime.functionPointers.length; i++) {
                if (!Runtime.functionPointers[i]) {
                    Runtime.functionPointers[i] = func;
                    return 1 * (1 + i)
                }
            }
            throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."
        }),
        removeFunction: (function(index) {
            Runtime.functionPointers[(index - 1) / 1] = null
        }),
        warnOnce: (function(text) {
            if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
            if (!Runtime.warnOnce.shown[text]) {
                Runtime.warnOnce.shown[text] = 1;
                Module.printErr(text)
            }
        }),
        funcWrappers: {},
        getFuncWrapper: (function(func, sig) {
            assert(sig);
            if (!Runtime.funcWrappers[sig]) {
                Runtime.funcWrappers[sig] = {}
            }
            var sigCache = Runtime.funcWrappers[sig];
            if (!sigCache[func]) {
                sigCache[func] = function dynCall_wrapper() {
                    return Runtime.dynCall(sig, func, arguments)
                }
            }
            return sigCache[func]
        }),
        getCompilerSetting: (function(name) {
            throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"
        }),
        stackAlloc: (function(size) {
            var ret = STACKTOP;
            STACKTOP = STACKTOP + size | 0;
            STACKTOP = STACKTOP + 15 & -16;
            return ret
        }),
        staticAlloc: (function(size) {
            var ret = STATICTOP;
            STATICTOP = STATICTOP + size | 0;
            STATICTOP = STATICTOP + 15 & -16;
            return ret
        }),
        dynamicAlloc: (function(size) {
            var ret = DYNAMICTOP;
            DYNAMICTOP = DYNAMICTOP + size | 0;
            DYNAMICTOP = DYNAMICTOP + 15 & -16;
            if (DYNAMICTOP >= TOTAL_MEMORY) {
                var success = enlargeMemory();
                if (!success) {
                    DYNAMICTOP = ret;
                    return 0
                }
            }
            return ret
        }),
        alignMemory: (function(size, quantum) {
            var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
            return ret
        }),
        makeBigInt: (function(low, high, unsigned) {
            var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
            return ret
        }),
        GLOBAL_BASE: 8,
        QUANTUM_SIZE: 4,
        __dummy__: 0
    };
    Module["Runtime"] = Runtime;
    var __THREW__ = 0;
    var ABORT = false;
    var EXITSTATUS = 0;
    var undef = 0;
    var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
    var tempI64, tempI64b;
    var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

    function assert(condition, text) {
        if (!condition) {
            abort("Assertion failed: " + text)
        }
    }
    var globalScope = this;

    function getCFunc(ident) {
        var func = Module["_" + ident];
        if (!func) {
            abort("NO_DYNAMIC_EXECUTION was set, cannot eval - ccall/cwrap are not functional")
        }
        assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
        return func
    }
    var cwrap, ccall;
    ((function() {
        var JSfuncs = {
            "stackSave": (function() {
                Runtime.stackSave()
            }),
            "stackRestore": (function() {
                Runtime.stackRestore()
            }),
            "arrayToC": (function(arr) {
                var ret = Runtime.stackAlloc(arr.length);
                writeArrayToMemory(arr, ret);
                return ret
            }),
            "stringToC": (function(str) {
                var ret = 0;
                if (str !== null && str !== undefined && str !== 0) {
                    ret = Runtime.stackAlloc((str.length << 2) + 1);
                    writeStringToMemory(str, ret)
                }
                return ret
            })
        };
        var toC = {
            "string": JSfuncs["stringToC"],
            "array": JSfuncs["arrayToC"]
        };
        ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
            var func = getCFunc(ident);
            var cArgs = [];
            var stack = 0;
            if (args) {
                for (var i = 0; i < args.length; i++) {
                    var converter = toC[argTypes[i]];
                    if (converter) {
                        if (stack === 0) stack = Runtime.stackSave();
                        cArgs[i] = converter(args[i])
                    } else {
                        cArgs[i] = args[i]
                    }
                }
            }
            var ret = func.apply(null, cArgs);
            if (returnType === "string") ret = Pointer_stringify(ret);
            if (stack !== 0) {
                if (opts && opts.async) {
                    EmterpreterAsync.asyncFinalizers.push((function() {
                        Runtime.stackRestore(stack)
                    }));
                    return
                }
                Runtime.stackRestore(stack)
            }
            return ret
        };
        cwrap = function cwrap(ident, returnType, argTypes) {
            return (function() {
                return ccall(ident, returnType, argTypes, arguments)
            })
        }
    }))();
    Module["ccall"] = ccall;
    Module["cwrap"] = cwrap;

    function setValue(ptr, value, type, noSafe) {
        type = type || "i8";
        if (type.charAt(type.length - 1) === "*") type = "i32";
        switch (type) {
            case "i1":
                HEAP8[ptr >> 0] = value;
                break;
            case "i8":
                HEAP8[ptr >> 0] = value;
                break;
            case "i16":
                HEAP16[ptr >> 1] = value;
                break;
            case "i32":
                HEAP32[ptr >> 2] = value;
                break;
            case "i64":
                tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
                break;
            case "float":
                HEAPF32[ptr >> 2] = value;
                break;
            case "double":
                HEAPF64[ptr >> 3] = value;
                break;
            default:
                abort("invalid type for setValue: " + type)
        }
    }
    Module["setValue"] = setValue;

    function getValue(ptr, type, noSafe) {
        type = type || "i8";
        if (type.charAt(type.length - 1) === "*") type = "i32";
        switch (type) {
            case "i1":
                return HEAP8[ptr >> 0];
            case "i8":
                return HEAP8[ptr >> 0];
            case "i16":
                return HEAP16[ptr >> 1];
            case "i32":
                return HEAP32[ptr >> 2];
            case "i64":
                return HEAP32[ptr >> 2];
            case "float":
                return HEAPF32[ptr >> 2];
            case "double":
                return HEAPF64[ptr >> 3];
            default:
                abort("invalid type for setValue: " + type)
        }
        return null
    }
    Module["getValue"] = getValue;
    var ALLOC_NORMAL = 0;
    var ALLOC_STACK = 1;
    var ALLOC_STATIC = 2;
    var ALLOC_DYNAMIC = 3;
    var ALLOC_NONE = 4;
    Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
    Module["ALLOC_STACK"] = ALLOC_STACK;
    Module["ALLOC_STATIC"] = ALLOC_STATIC;
    Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
    Module["ALLOC_NONE"] = ALLOC_NONE;

    function allocate(slab, types, allocator, ptr) {
        var zeroinit, size;
        if (typeof slab === "number") {
            zeroinit = true;
            size = slab
        } else {
            zeroinit = false;
            size = slab.length
        }
        var singleType = typeof types === "string" ? types : null;
        var ret;
        if (allocator == ALLOC_NONE) {
            ret = ptr
        } else {
            ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
        }
        if (zeroinit) {
            var ptr = ret,
                stop;
            assert((ret & 3) == 0);
            stop = ret + (size & ~3);
            for (; ptr < stop; ptr += 4) {
                HEAP32[ptr >> 2] = 0
            }
            stop = ret + size;
            while (ptr < stop) {
                HEAP8[ptr++ >> 0] = 0
            }
            return ret
        }
        if (singleType === "i8") {
            if (slab.subarray || slab.slice) {
                HEAPU8.set(slab, ret)
            } else {
                HEAPU8.set(new Uint8Array(slab), ret)
            }
            return ret
        }
        var i = 0,
            type, typeSize, previousType;
        while (i < size) {
            var curr = slab[i];
            if (typeof curr === "function") {
                curr = Runtime.getFunctionIndex(curr)
            }
            type = singleType || types[i];
            if (type === 0) {
                i++;
                continue
            }
            if (type == "i64") type = "i32";
            setValue(ret + i, curr, type);
            if (previousType !== type) {
                typeSize = Runtime.getNativeTypeSize(type);
                previousType = type
            }
            i += typeSize
        }
        return ret
    }
    Module["allocate"] = allocate;

    function getMemory(size) {
        if (!staticSealed) return Runtime.staticAlloc(size);
        if (typeof _sbrk !== "undefined" && !_sbrk.called || !runtimeInitialized) return Runtime.dynamicAlloc(size);
        return _malloc(size)
    }
    Module["getMemory"] = getMemory;

    function Pointer_stringify(ptr, length) {
        if (length === 0 || !ptr) return "";
        var hasUtf = 0;
        var t;
        var i = 0;
        while (1) {
            t = HEAPU8[ptr + i >> 0];
            hasUtf |= t;
            if (t == 0 && !length) break;
            i++;
            if (length && i == length) break
        }
        if (!length) length = i;
        var ret = "";
        if (hasUtf < 128) {
            var MAX_CHUNK = 1024;
            var curr;
            while (length > 0) {
                curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
                ret = ret ? ret + curr : curr;
                ptr += MAX_CHUNK;
                length -= MAX_CHUNK
            }
            return ret
        }
        return Module["UTF8ToString"](ptr)
    }
    Module["Pointer_stringify"] = Pointer_stringify;

    function AsciiToString(ptr) {
        var str = "";
        while (1) {
            var ch = HEAP8[ptr++ >> 0];
            if (!ch) return str;
            str += String.fromCharCode(ch)
        }
    }
    Module["AsciiToString"] = AsciiToString;

    function stringToAscii(str, outPtr) {
        return writeAsciiToMemory(str, outPtr, false)
    }
    Module["stringToAscii"] = stringToAscii;

    function UTF8ArrayToString(u8Array, idx) {
        var u0, u1, u2, u3, u4, u5;
        var str = "";
        while (1) {
            u0 = u8Array[idx++];
            if (!u0) return str;
            if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue
            }
            u1 = u8Array[idx++] & 63;
            if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue
            }
            u2 = u8Array[idx++] & 63;
            if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2
            } else {
                u3 = u8Array[idx++] & 63;
                if ((u0 & 248) == 240) {
                    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
                } else {
                    u4 = u8Array[idx++] & 63;
                    if ((u0 & 252) == 248) {
                        u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
                    } else {
                        u5 = u8Array[idx++] & 63;
                        u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
                    }
                }
            }
            if (u0 < 65536) {
                str += String.fromCharCode(u0)
            } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
            }
        }
    }
    Module["UTF8ArrayToString"] = UTF8ArrayToString;

    function UTF8ToString(ptr) {
        return UTF8ArrayToString(HEAPU8, ptr)
    }
    Module["UTF8ToString"] = UTF8ToString;

    function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
        if (!(maxBytesToWrite > 0)) return 0;
        var startIdx = outIdx;
        var endIdx = outIdx + maxBytesToWrite - 1;
        for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
            if (u <= 127) {
                if (outIdx >= endIdx) break;
                outU8Array[outIdx++] = u
            } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx) break;
                outU8Array[outIdx++] = 192 | u >> 6;
                outU8Array[outIdx++] = 128 | u & 63
            } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx) break;
                outU8Array[outIdx++] = 224 | u >> 12;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            } else if (u <= 2097151) {
                if (outIdx + 3 >= endIdx) break;
                outU8Array[outIdx++] = 240 | u >> 18;
                outU8Array[outIdx++] = 128 | u >> 12 & 63;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            } else if (u <= 67108863) {
                if (outIdx + 4 >= endIdx) break;
                outU8Array[outIdx++] = 248 | u >> 24;
                outU8Array[outIdx++] = 128 | u >> 18 & 63;
                outU8Array[outIdx++] = 128 | u >> 12 & 63;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            } else {
                if (outIdx + 5 >= endIdx) break;
                outU8Array[outIdx++] = 252 | u >> 30;
                outU8Array[outIdx++] = 128 | u >> 24 & 63;
                outU8Array[outIdx++] = 128 | u >> 18 & 63;
                outU8Array[outIdx++] = 128 | u >> 12 & 63;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            }
        }
        outU8Array[outIdx] = 0;
        return outIdx - startIdx
    }
    Module["stringToUTF8Array"] = stringToUTF8Array;

    function stringToUTF8(str, outPtr, maxBytesToWrite) {
        return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
    }
    Module["stringToUTF8"] = stringToUTF8;

    function lengthBytesUTF8(str) {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
            if (u <= 127) {
                ++len
            } else if (u <= 2047) {
                len += 2
            } else if (u <= 65535) {
                len += 3
            } else if (u <= 2097151) {
                len += 4
            } else if (u <= 67108863) {
                len += 5
            } else {
                len += 6
            }
        }
        return len
    }
    Module["lengthBytesUTF8"] = lengthBytesUTF8;

    function UTF16ToString(ptr) {
        var i = 0;
        var str = "";
        while (1) {
            var codeUnit = HEAP16[ptr + i * 2 >> 1];
            if (codeUnit == 0) return str;
            ++i;
            str += String.fromCharCode(codeUnit)
        }
    }
    Module["UTF16ToString"] = UTF16ToString;

    function stringToUTF16(str, outPtr, maxBytesToWrite) {
        if (maxBytesToWrite === undefined) {
            maxBytesToWrite = 2147483647
        }
        if (maxBytesToWrite < 2) return 0;
        maxBytesToWrite -= 2;
        var startPtr = outPtr;
        var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
        for (var i = 0; i < numCharsToWrite; ++i) {
            var codeUnit = str.charCodeAt(i);
            HEAP16[outPtr >> 1] = codeUnit;
            outPtr += 2
        }
        HEAP16[outPtr >> 1] = 0;
        return outPtr - startPtr
    }
    Module["stringToUTF16"] = stringToUTF16;

    function lengthBytesUTF16(str) {
        return str.length * 2
    }
    Module["lengthBytesUTF16"] = lengthBytesUTF16;

    function UTF32ToString(ptr) {
        var i = 0;
        var str = "";
        while (1) {
            var utf32 = HEAP32[ptr + i * 4 >> 2];
            if (utf32 == 0) return str;
            ++i;
            if (utf32 >= 65536) {
                var ch = utf32 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
            } else {
                str += String.fromCharCode(utf32)
            }
        }
    }
    Module["UTF32ToString"] = UTF32ToString;

    function stringToUTF32(str, outPtr, maxBytesToWrite) {
        if (maxBytesToWrite === undefined) {
            maxBytesToWrite = 2147483647
        }
        if (maxBytesToWrite < 4) return 0;
        var startPtr = outPtr;
        var endPtr = startPtr + maxBytesToWrite - 4;
        for (var i = 0; i < str.length; ++i) {
            var codeUnit = str.charCodeAt(i);
            if (codeUnit >= 55296 && codeUnit <= 57343) {
                var trailSurrogate = str.charCodeAt(++i);
                codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
            }
            HEAP32[outPtr >> 2] = codeUnit;
            outPtr += 4;
            if (outPtr + 4 > endPtr) break
        }
        HEAP32[outPtr >> 2] = 0;
        return outPtr - startPtr
    }
    Module["stringToUTF32"] = stringToUTF32;

    function lengthBytesUTF32(str) {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
            var codeUnit = str.charCodeAt(i);
            if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
            len += 4
        }
        return len
    }
    Module["lengthBytesUTF32"] = lengthBytesUTF32;

    function demangle(func) {
        var hasLibcxxabi = !!Module["___cxa_demangle"];
        if (hasLibcxxabi) {
            try {
                var buf = _malloc(func.length);
                writeStringToMemory(func.substr(1), buf);
                var status = _malloc(4);
                var ret = Module["___cxa_demangle"](buf, 0, 0, status);
                if (getValue(status, "i32") === 0 && ret) {
                    return Pointer_stringify(ret)
                }
            } catch (e) {} finally {
                if (buf) _free(buf);
                if (status) _free(status);
                if (ret) _free(ret)
            }
        }
        var i = 3;
        var basicTypes = {
            "v": "void",
            "b": "bool",
            "c": "char",
            "s": "short",
            "i": "int",
            "l": "long",
            "f": "float",
            "d": "double",
            "w": "wchar_t",
            "a": "signed char",
            "h": "unsigned char",
            "t": "unsigned short",
            "j": "unsigned int",
            "m": "unsigned long",
            "x": "long long",
            "y": "unsigned long long",
            "z": "..."
        };
        var subs = [];
        var first = true;

        function dump(x) {
            if (x) Module.print(x);
            Module.print(func);
            var pre = "";
            for (var a = 0; a < i; a++) pre += " ";
            Module.print(pre + "^")
        }

        function parseNested() {
            i++;
            if (func[i] === "K") i++;
            var parts = [];
            while (func[i] !== "E") {
                if (func[i] === "S") {
                    i++;
                    var next = func.indexOf("_", i);
                    var num = func.substring(i, next) || 0;
                    parts.push(subs[num] || "?");
                    i = next + 1;
                    continue
                }
                if (func[i] === "C") {
                    parts.push(parts[parts.length - 1]);
                    i += 2;
                    continue
                }
                var size = parseInt(func.substr(i));
                var pre = size.toString().length;
                if (!size || !pre) {
                    i--;
                    break
                }
                var curr = func.substr(i + pre, size);
                parts.push(curr);
                subs.push(curr);
                i += pre + size
            }
            i++;
            return parts
        }

        function parse(rawList, limit, allowVoid) {
            limit = limit || Infinity;
            var ret = "",
                list = [];

            function flushList() {
                return "(" + list.join(", ") + ")"
            }
            var name;
            if (func[i] === "N") {
                name = parseNested().join("::");
                limit--;
                if (limit === 0) return rawList ? [name] : name
            } else {
                if (func[i] === "K" || first && func[i] === "L") i++;
                var size = parseInt(func.substr(i));
                if (size) {
                    var pre = size.toString().length;
                    name = func.substr(i + pre, size);
                    i += pre + size
                }
            }
            first = false;
            if (func[i] === "I") {
                i++;
                var iList = parse(true);
                var iRet = parse(true, 1, true);
                ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">"
            } else {
                ret = name
            }
            paramLoop: while (i < func.length && limit-- > 0) {
                var c = func[i++];
                if (c in basicTypes) {
                    list.push(basicTypes[c])
                } else {
                    switch (c) {
                        case "P":
                            list.push(parse(true, 1, true)[0] + "*");
                            break;
                        case "R":
                            list.push(parse(true, 1, true)[0] + "&");
                            break;
                        case "L":
                            {
                                i++;
                                var end = func.indexOf("E", i);
                                var size = end - i;
                                list.push(func.substr(i, size));
                                i += size + 2;
                                break
                            };
                        case "A":
                            {
                                var size = parseInt(func.substr(i));
                                i += size.toString().length;
                                if (func[i] !== "_") throw "?";
                                i++;
                                list.push(parse(true, 1, true)[0] + " [" + size + "]");
                                break
                            };
                        case "E":
                            break paramLoop;
                        default:
                            ret += "?" + c;
                            break paramLoop
                    }
                }
            }
            if (!allowVoid && list.length === 1 && list[0] === "void") list = [];
            if (rawList) {
                if (ret) {
                    list.push(ret + "?")
                }
                return list
            } else {
                return ret + flushList()
            }
        }
        var parsed = func;
        try {
            if (func == "Object._main" || func == "_main") {
                return "main()"
            }
            if (typeof func === "number") func = Pointer_stringify(func);
            if (func[0] !== "_") return func;
            if (func[1] !== "_") return func;
            if (func[2] !== "Z") return func;
            switch (func[3]) {
                case "n":
                    return "operator new()";
                case "d":
                    return "operator delete()"
            }
            parsed = parse()
        } catch (e) {
            parsed += "?"
        }
        if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
            Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling")
        }
        return parsed
    }

    function demangleAll(text) {
        return text.replace(/__Z[\w\d_]+/g, (function(x) {
            var y = demangle(x);
            return x === y ? x : x + " [" + y + "]"
        }))
    }

    function jsStackTrace() {
        var err = new Error;
        if (!err.stack) {
            try {
                throw new Error(0)
            } catch (e) {
                err = e
            }
            if (!err.stack) {
                return "(no stack trace available)"
            }
        }
        return err.stack.toString()
    }

    function stackTrace() {
        return demangleAll(jsStackTrace())
    }
    Module["stackTrace"] = stackTrace;
    var PAGE_SIZE = 4096;

    function alignMemoryPage(x) {
        if (x % 4096 > 0) {
            x += 4096 - x % 4096
        }
        return x
    }
    var HEAP;
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    var STATIC_BASE = 0,
        STATICTOP = 0,
        staticSealed = false;
    var STACK_BASE = 0,
        STACKTOP = 0,
        STACK_MAX = 0;
    var DYNAMIC_BASE = 0,
        DYNAMICTOP = 0;

    function abortOnCannotGrowMemory() {
        abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")
    }

    function enlargeMemory() {
        abortOnCannotGrowMemory()
    }
    var TOTAL_STACK = Module["TOTAL_STACK"] || 52443072;
    var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 1049e5;
    var totalMemory = 64 * 1024;
    while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
        if (totalMemory < 16 * 1024 * 1024) {
            totalMemory *= 2
        } else {
            totalMemory += 16 * 1024 * 1024
        }
    }
    if (totalMemory !== TOTAL_MEMORY) {
        TOTAL_MEMORY = totalMemory
    }
    assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
    var buffer;
    buffer = new ArrayBuffer(TOTAL_MEMORY);
    HEAP8 = new Int8Array(buffer);
    HEAP16 = new Int16Array(buffer);
    HEAP32 = new Int32Array(buffer);
    HEAPU8 = new Uint8Array(buffer);
    HEAPU16 = new Uint16Array(buffer);
    HEAPU32 = new Uint32Array(buffer);
    HEAPF32 = new Float32Array(buffer);
    HEAPF64 = new Float64Array(buffer);
    HEAP32[0] = 255;
    assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
    Module["HEAP"] = HEAP;
    Module["buffer"] = buffer;
    Module["HEAP8"] = HEAP8;
    Module["HEAP16"] = HEAP16;
    Module["HEAP32"] = HEAP32;
    Module["HEAPU8"] = HEAPU8;
    Module["HEAPU16"] = HEAPU16;
    Module["HEAPU32"] = HEAPU32;
    Module["HEAPF32"] = HEAPF32;
    Module["HEAPF64"] = HEAPF64;

    function callRuntimeCallbacks(callbacks) {
        while (callbacks.length > 0) {
            var callback = callbacks.shift();
            if (typeof callback == "function") {
                callback();
                continue
            }
            var func = callback.func;
            if (typeof func === "number") {
                if (callback.arg === undefined) {
                    Runtime.dynCall("v", func)
                } else {
                    Runtime.dynCall("vi", func, [callback.arg])
                }
            } else {
                func(callback.arg === undefined ? null : callback.arg)
            }
        }
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATEXIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    var runtimeExited = false;

    function preRun() {
        if (Module["preRun"]) {
            if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
            while (Module["preRun"].length) {
                addOnPreRun(Module["preRun"].shift())
            }
        }
        callRuntimeCallbacks(__ATPRERUN__)
    }

    function ensureInitRuntime() {
        if (runtimeInitialized) return;
        runtimeInitialized = true;
        callRuntimeCallbacks(__ATINIT__)
    }

    function preMain() {
        callRuntimeCallbacks(__ATMAIN__)
    }

    function exitRuntime() {
        callRuntimeCallbacks(__ATEXIT__);
        runtimeExited = true
    }

    function postRun() {
        if (Module["postRun"]) {
            if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
            while (Module["postRun"].length) {
                addOnPostRun(Module["postRun"].shift())
            }
        }
        callRuntimeCallbacks(__ATPOSTRUN__)
    }

    function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb)
    }
    Module["addOnPreRun"] = addOnPreRun;

    function addOnInit(cb) {
        __ATINIT__.unshift(cb)
    }
    Module["addOnInit"] = addOnInit;

    function addOnPreMain(cb) {
        __ATMAIN__.unshift(cb)
    }
    Module["addOnPreMain"] = addOnPreMain;

    function addOnExit(cb) {
        __ATEXIT__.unshift(cb)
    }
    Module["addOnExit"] = addOnExit;

    function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb)
    }
    Module["addOnPostRun"] = addOnPostRun;

    function intArrayFromString(stringy, dontAddNull, length) {
        var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
        var u8array = new Array(len);
        var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
        if (dontAddNull) u8array.length = numBytesWritten;
        return u8array
    }
    Module["intArrayFromString"] = intArrayFromString;

    function intArrayToString(array) {
        var ret = [];
        for (var i = 0; i < array.length; i++) {
            var chr = array[i];
            if (chr > 255) {
                chr &= 255
            }
            ret.push(String.fromCharCode(chr))
        }
        return ret.join("")
    }
    Module["intArrayToString"] = intArrayToString;

    function writeStringToMemory(string, buffer, dontAddNull) {
        var array = intArrayFromString(string, dontAddNull);
        var i = 0;
        while (i < array.length) {
            var chr = array[i];
            HEAP8[buffer + i >> 0] = chr;
            i = i + 1
        }
    }
    Module["writeStringToMemory"] = writeStringToMemory;

    function writeArrayToMemory(array, buffer) {
        for (var i = 0; i < array.length; i++) {
            HEAP8[buffer++ >> 0] = array[i]
        }
    }
    Module["writeArrayToMemory"] = writeArrayToMemory;

    function writeAsciiToMemory(str, buffer, dontAddNull) {
        for (var i = 0; i < str.length; ++i) {
            HEAP8[buffer++ >> 0] = str.charCodeAt(i)
        }
        if (!dontAddNull) HEAP8[buffer >> 0] = 0
    }
    Module["writeAsciiToMemory"] = writeAsciiToMemory;

    function unSign(value, bits, ignore) {
        if (value >= 0) {
            return value
        }
        return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value
    }

    function reSign(value, bits, ignore) {
        if (value <= 0) {
            return value
        }
        var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
        if (value >= half && (bits <= 32 || value > half)) {
            value = -2 * half + value
        }
        return value
    }
    if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) Math["imul"] = function imul(a, b) {
        var ah = a >>> 16;
        var al = a & 65535;
        var bh = b >>> 16;
        var bl = b & 65535;
        return al * bl + (ah * bl + al * bh << 16) | 0
    };
    Math.imul = Math["imul"];
    if (!Math["clz32"]) Math["clz32"] = (function(x) {
        x = x >>> 0;
        for (var i = 0; i < 32; i++) {
            if (x & 1 << 31 - i) return i
        }
        return 32
    });
    Math.clz32 = Math["clz32"];
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
    var Math_clz32 = Math.clz32;
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;

    function getUniqueRunDependency(id) {
        return id
    }

    function addRunDependency(id) {
        runDependencies++;
        if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies)
        }
    }
    Module["addRunDependency"] = addRunDependency;

    function removeRunDependency(id) {
        runDependencies--;
        if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies)
        }
        if (runDependencies == 0) {
            if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null
            }
            if (dependenciesFulfilled) {
                var callback = dependenciesFulfilled;
                dependenciesFulfilled = null;
                callback()
            }
        }
    }
    Module["removeRunDependency"] = removeRunDependency;
    Module["preloadedImages"] = {};
    Module["preloadedAudios"] = {};
    var memoryInitializer = null;
    var ASM_CONSTS = [(function() {
        {
            if (Module.getRandomValue === undefined) {
                try {
                    var window_ = "object" === typeof window ? window : self,
                        crypto_ = typeof window_.crypto !== "undefined" ? window_.crypto : window_.msCrypto,
                        randomValuesStandard = (function() {
                            var buf = new Uint32Array(1);
                            crypto_.getRandomValues(buf);
                            return buf[0] >>> 0
                        });
                    randomValuesStandard();
                    Module.getRandomValue = randomValuesStandard
                } catch (e) {
                    try {
                        var crypto = require("crypto"),
                            randomValueNodeJS = (function() {
                                var buf = crypto.randomBytes(4);
                                return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0
                            });
                        randomValueNodeJS();
                        Module.getRandomValue = randomValueNodeJS
                    } catch (e) {
                        throw "No secure random number generator found"
                    }
                }
            }
        }
    }), (function() {
        {
            return Module.getRandomValue()
        }
    })];

    function _emscripten_asm_const_0(code) {
        return ASM_CONSTS[code]()
    }
    STATIC_BASE = 8;
    STATICTOP = STATIC_BASE + 13088;
    __ATINIT__.push();
    allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 4, 0, 0, 0, 155, 0, 0, 0, 5, 0, 0, 0, 49, 2, 0, 0, 6, 0, 0, 0, 137, 1, 0, 0, 9, 0, 0, 0, 221, 0, 0, 0, 12, 0, 0, 0, 53, 3, 0, 0, 12, 0, 0, 0, 129, 2, 0, 0, 14, 0, 0, 0, 87, 3, 0, 0, 15, 0, 0, 0, 123, 0, 0, 0, 19, 0, 0, 0, 123, 0, 0, 0, 20, 0, 0, 0, 215, 0, 0, 0, 20, 0, 0, 0, 75, 1, 0, 0, 20, 0, 0, 0, 131, 3, 0, 0, 19, 0, 0, 0, 27, 2, 0, 0, 20, 0, 0, 0, 61, 2, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 5, 0, 0, 0, 139, 2, 0, 0, 6, 0, 0, 0, 155, 0, 0, 0, 12, 0, 0, 0, 209, 1, 0, 0, 14, 0, 0, 0, 143, 0, 0, 0, 19, 0, 0, 0, 37, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 127, 0, 0, 0, 6, 0, 0, 0, 77, 1, 0, 0, 10, 0, 0, 0, 139, 2, 0, 0, 14, 0, 0, 0, 63, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 7, 0, 0, 0, 81, 1, 0, 0, 13, 0, 0, 0, 77, 1, 0, 0, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 1, 0, 0, 8, 0, 0, 0, 83, 1, 0, 0, 16, 0, 0, 0, 81, 1, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 3, 0, 0, 9, 0, 0, 0, 85, 0, 0, 0, 21, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 3, 0, 0, 11, 0, 0, 0, 169, 2, 0, 0, 21, 0, 0, 0, 1, 0, 0, 0, 7, 0, 0, 0, 88, 18, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 116, 18, 0, 0, 1, 0, 0, 0, 9, 0, 0, 0, 156, 18, 0, 0, 2, 0, 0, 0, 9, 0, 0, 0, 192, 18, 0, 0, 2, 0, 0, 0, 10, 0, 0, 0, 224, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 244, 16, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 16, 17, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 48, 17, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 84, 17, 0, 0, 1, 0, 0, 0, 9, 0, 0, 0, 124, 17, 0, 0, 1, 0, 0, 0, 10, 0, 0, 0, 160, 17, 0, 0, 2, 0, 0, 0, 10, 0, 0, 0, 200, 17, 0, 0, 3, 0, 0, 0, 10, 0, 0, 0, 236, 17, 0, 0, 3, 0, 0, 0, 11, 0, 0, 0, 12, 18, 0, 0, 3, 0, 0, 0, 12, 0, 0, 0, 48, 18, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 188, 14, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 212, 14, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 240, 14, 0, 0, 1, 0, 0, 0, 7, 0, 0, 0, 8, 15, 0, 0, 1, 0, 0, 0, 8, 0, 0, 0, 36, 15, 0, 0, 1, 0, 0, 0, 9, 0, 0, 0, 68, 15, 0, 0, 2, 0, 0, 0, 9, 0, 0, 0, 104, 15, 0, 0, 2, 0, 0, 0, 10, 0, 0, 0, 136, 15, 0, 0, 2, 0, 0, 0, 11, 0, 0, 0, 172, 15, 0, 0, 3, 0, 0, 0, 11, 0, 0, 0, 212, 15, 0, 0, 3, 0, 0, 0, 12, 0, 0, 0, 248, 15, 0, 0, 4, 0, 0, 0, 12, 0, 0, 0, 32, 16, 0, 0, 4, 0, 0, 0, 13, 0, 0, 0, 68, 16, 0, 0, 4, 0, 0, 0, 14, 0, 0, 0, 108, 16, 0, 0, 4, 0, 0, 0, 15, 0, 0, 0, 152, 16, 0, 0, 5, 0, 0, 0, 15, 0, 0, 0, 200, 16, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 212, 10, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 236, 10, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 8, 11, 0, 0, 1, 0, 0, 0, 7, 0, 0, 0, 40, 11, 0, 0, 1, 0, 0, 0, 8, 0, 0, 0, 68, 11, 0, 0, 1, 0, 0, 0, 9, 0, 0, 0, 100, 11, 0, 0, 1, 0, 0, 0, 10, 0, 0, 0, 136, 11, 0, 0, 2, 0, 0, 0, 10, 0, 0, 0, 176, 11, 0, 0, 2, 0, 0, 0, 11, 0, 0, 0, 212, 11, 0, 0, 3, 0, 0, 0, 11, 0, 0, 0, 252, 11, 0, 0, 3, 0, 0, 0, 12, 0, 0, 0, 32, 12, 0, 0, 3, 0, 0, 0, 13, 0, 0, 0, 72, 12, 0, 0, 4, 0, 0, 0, 13, 0, 0, 0, 116, 12, 0, 0, 4, 0, 0, 0, 14, 0, 0, 0, 156, 12, 0, 0, 5, 0, 0, 0, 14, 0, 0, 0, 200, 12, 0, 0, 4, 0, 0, 0, 16, 0, 0, 0, 240, 12, 0, 0, 4, 0, 0, 0, 17, 0, 0, 0, 36, 13, 0, 0, 5, 0, 0, 0, 17, 0, 0, 0, 92, 13, 0, 0, 5, 0, 0, 0, 18, 0, 0, 0, 144, 13, 0, 0, 7, 0, 0, 0, 17, 0, 0, 0, 200, 13, 0, 0, 7, 0, 0, 0, 18, 0, 0, 0, 244, 13, 0, 0, 7, 0, 0, 0, 19, 0, 0, 0, 36, 14, 0, 0, 8, 0, 0, 0, 19, 0, 0, 0, 88, 14, 0, 0, 8, 0, 0, 0, 20, 0, 0, 0, 136, 14, 0, 0, 4, 0, 0, 0, 16, 0, 0, 0, 56, 6, 0, 0, 5, 0, 0, 0, 16, 0, 0, 0, 108, 6, 0, 0, 4, 0, 0, 0, 18, 0, 0, 0, 156, 6, 0, 0, 6, 0, 0, 0, 17, 0, 0, 0, 216, 6, 0, 0, 7, 0, 0, 0, 17, 0, 0, 0, 8, 7, 0, 0, 6, 0, 0, 0, 19, 0, 0, 0, 52, 7, 0, 0, 6, 0, 0, 0, 20, 0, 0, 0, 108, 7, 0, 0, 8, 0, 0, 0, 19, 0, 0, 0, 168, 7, 0, 0, 8, 0, 0, 0, 20, 0, 0, 0, 216, 7, 0, 0, 8, 0, 0, 0, 21, 0, 0, 0, 12, 8, 0, 0, 8, 0, 0, 0, 22, 0, 0, 0, 68, 8, 0, 0, 9, 0, 0, 0, 22, 0, 0, 0, 128, 8, 0, 0, 10, 0, 0, 0, 22, 0, 0, 0, 184, 8, 0, 0, 9, 0, 0, 0, 24, 0, 0, 0, 236, 8, 0, 0, 11, 0, 0, 0, 23, 0, 0, 0, 44, 9, 0, 0, 10, 0, 0, 0, 25, 0, 0, 0, 96, 9, 0, 0, 11, 0, 0, 0, 25, 0, 0, 0, 160, 9, 0, 0, 12, 0, 0, 0, 25, 0, 0, 0, 220, 9, 0, 0, 12, 0, 0, 0, 26, 0, 0, 0, 20, 10, 0, 0, 12, 0, 0, 0, 27, 0, 0, 0, 80, 10, 0, 0, 12, 0, 0, 0, 28, 0, 0, 0, 144, 10, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 40, 0, 0, 0, 228, 5, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 60, 0, 0, 0, 12, 0, 0, 0, 60, 0, 0, 0, 84, 5, 0, 0, 132, 5, 0, 0, 180, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 6, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 20, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144, 1, 0, 0, 208, 1, 0, 0, 72, 2, 0, 0, 8, 3, 0, 0, 40, 4, 0, 0, 40, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 144, 0, 0, 0, 208, 0, 0, 0, 0, 1, 0, 0, 40, 1, 0, 0, 80, 1, 0, 0, 112, 1, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 20, 0, 0, 0, 44, 0, 0, 0, 85, 0, 0, 0, 148, 0, 0, 0, 239, 0, 0, 0, 108, 1, 0, 0, 10, 2, 0, 0, 198, 2, 0, 0, 149, 3, 0, 0, 107, 4, 0, 0, 58, 5, 0, 0, 246, 5, 0, 0, 148, 6, 0, 0, 17, 7, 0, 0, 108, 7, 0, 0, 171, 7, 0, 0, 212, 7, 0, 0, 236, 7, 0, 0, 249, 7, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 38, 0, 0, 0, 112, 0, 0, 0, 7, 1, 0, 0, 254, 1, 0, 0, 73, 3, 0, 0, 183, 4, 0, 0, 2, 6, 0, 0, 249, 6, 0, 0, 144, 7, 0, 0, 218, 7, 0, 0, 247, 7, 0, 0, 0, 0, 0, 0, 19, 0, 0, 0, 71, 0, 0, 0, 184, 0, 0, 0, 127, 1, 0, 0, 162, 2, 0, 0, 0, 4, 0, 0, 94, 5, 0, 0, 129, 6, 0, 0, 72, 7, 0, 0, 185, 7, 0, 0, 237, 7, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 15, 0, 0, 0, 50, 0, 0, 0, 132, 0, 0, 0, 31, 1, 0, 0, 19, 2, 0, 0, 82, 3, 0, 0, 174, 4, 0, 0, 237, 5, 0, 0, 225, 6, 0, 0, 124, 7, 0, 0, 206, 7, 0, 0, 241, 7, 0, 0, 253, 7, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 82, 0, 0, 0, 202, 0, 0, 0, 147, 1, 0, 0, 175, 2, 0, 0, 0, 4, 0, 0, 81, 5, 0, 0, 109, 6, 0, 0, 54, 7, 0, 0, 174, 7, 0, 0, 232, 7, 0, 0, 0, 0, 0, 0, 42, 0, 0, 0, 131, 0, 0, 0, 37, 1, 0, 0, 27, 2, 0, 0, 85, 3, 0, 0, 171, 4, 0, 0, 229, 5, 0, 0, 219, 6, 0, 0, 125, 7, 0, 0, 214, 7, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 38, 0, 0, 0, 103, 0, 0, 0, 226, 0, 0, 0, 170, 1, 0, 0, 190, 2, 0, 0, 0, 4, 0, 0, 66, 5, 0, 0, 86, 6, 0, 0, 30, 7, 0, 0, 153, 7, 0, 0, 218, 7, 0, 0, 246, 7, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 25, 0, 0, 0, 71, 0, 0, 0, 165, 0, 0, 0, 71, 1, 0, 0, 52, 2, 0, 0, 95, 3, 0, 0, 161, 4, 0, 0, 204, 5, 0, 0, 185, 6, 0, 0, 91, 7, 0, 0, 185, 7, 0, 0, 231, 7, 0, 0, 250, 7, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 104, 0, 0, 0, 233, 0, 0, 0, 180, 1, 0, 0, 196, 2, 0, 0, 0, 4, 0, 0, 60, 5, 0, 0, 76, 6, 0, 0, 23, 7, 0, 0, 152, 7, 0, 0, 223, 7, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 74, 0, 0, 0, 173, 0, 0, 0, 83, 1, 0, 0, 63, 2, 0, 0, 99, 3, 0, 0, 157, 4, 0, 0, 193, 5, 0, 0, 173, 6, 0, 0, 83, 7, 0, 0, 182, 7, 0, 0, 233, 7, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 52, 0, 0, 0, 127, 0, 0, 0, 3, 1, 0, 0, 202, 1, 0, 0, 210, 2, 0, 0, 0, 4, 0, 0, 46, 5, 0, 0, 54, 6, 0, 0, 253, 6, 0, 0, 129, 7, 0, 0, 204, 7, 0, 0, 241, 7, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 36, 0, 0, 0, 92, 0, 0, 0, 195, 0, 0, 0, 104, 1, 0, 0, 79, 2, 0, 0, 105, 3, 0, 0, 151, 4, 0, 0, 177, 5, 0, 0, 152, 6, 0, 0, 61, 7, 0, 0, 164, 7, 0, 0, 220, 7, 0, 0, 246, 7, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 59, 0, 0, 0, 138, 0, 0, 0, 17, 1, 0, 0, 216, 1, 0, 0, 218, 2, 0, 0, 0, 4, 0, 0, 38, 5, 0, 0, 40, 6, 0, 0, 239, 6, 0, 0, 118, 7, 0, 0, 197, 7, 0, 0, 238, 7, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 90, 0, 0, 0, 198, 0, 0, 0, 110, 1, 0, 0, 85, 2, 0, 0, 108, 3, 0, 0, 148, 4, 0, 0, 171, 5, 0, 0, 146, 6, 0, 0, 58, 7, 0, 0, 166, 7, 0, 0, 226, 7, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 29, 0, 0, 0, 73, 0, 0, 0, 156, 0, 0, 0, 36, 1, 0, 0, 233, 1, 0, 0, 228, 2, 0, 0, 0, 4, 0, 0, 28, 5, 0, 0, 23, 6, 0, 0, 220, 6, 0, 0, 100, 7, 0, 0, 183, 7, 0, 0, 227, 7, 0, 0, 248, 7, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 98, 0, 0, 0, 209, 0, 0, 0, 122, 1, 0, 0, 95, 2, 0, 0, 111, 3, 0, 0, 145, 4, 0, 0, 161, 5, 0, 0, 134, 6, 0, 0, 47, 7, 0, 0, 158, 7, 0, 0, 223, 7, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 33, 0, 0, 0, 81, 0, 0, 0, 168, 0, 0, 0, 50, 1, 0, 0, 245, 1, 0, 0, 236, 2, 0, 0, 0, 4, 0, 0, 20, 5, 0, 0, 11, 6, 0, 0, 206, 6, 0, 0, 88, 7, 0, 0, 175, 7, 0, 0, 223, 7, 0, 0, 246, 7, 0, 0, 0, 0, 0, 0, 17, 0, 0, 0, 52, 0, 0, 0, 120, 0, 0, 0, 232, 0, 0, 0, 144, 1, 0, 0, 110, 2, 0, 0, 117, 3, 0, 0, 139, 4, 0, 0, 146, 5, 0, 0, 112, 6, 0, 0, 24, 7, 0, 0, 136, 7, 0, 0, 204, 7, 0, 0, 239, 7, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 78, 0, 0, 0, 169, 0, 0, 0, 54, 1, 0, 0, 250, 1, 0, 0, 239, 2, 0, 0, 0, 4, 0, 0, 17, 5, 0, 0, 6, 6, 0, 0, 202, 6, 0, 0, 87, 7, 0, 0, 178, 7, 0, 0, 230, 7, 0, 0, 0, 0, 0, 0, 19, 0, 0, 0, 58, 0, 0, 0, 128, 0, 0, 0, 243, 0, 0, 0, 155, 1, 0, 0, 119, 2, 0, 0, 120, 3, 0, 0, 136, 4, 0, 0, 137, 5, 0, 0, 101, 6, 0, 0, 13, 7, 0, 0, 128, 7, 0, 0, 198, 7, 0, 0, 237, 7, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 42, 0, 0, 0, 96, 0, 0, 0, 189, 0, 0, 0, 74, 1, 0, 0, 10, 2, 0, 0, 248, 2, 0, 0, 0, 4, 0, 0, 8, 5, 0, 0, 246, 5, 0, 0, 182, 6, 0, 0, 67, 7, 0, 0, 160, 7, 0, 0, 214, 7, 0, 0, 243, 7, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 30, 0, 0, 0, 71, 0, 0, 0, 144, 0, 0, 0, 5, 1, 0, 0, 171, 1, 0, 0, 130, 2, 0, 0, 124, 3, 0, 0, 132, 4, 0, 0, 126, 5, 0, 0, 85, 6, 0, 0, 251, 6, 0, 0, 112, 7, 0, 0, 185, 7, 0, 0, 226, 7, 0, 0, 247, 7, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 125, 1, 0, 0, 0, 4, 0, 0, 131, 6, 0, 0, 193, 7, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 221, 0, 0, 0, 190, 2, 0, 0, 66, 5, 0, 0, 35, 7, 0, 0, 225, 7, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 125, 0, 0, 0, 205, 1, 0, 0, 0, 4, 0, 0, 51, 6, 0, 0, 131, 7, 0, 0, 241, 7, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 31, 1, 0, 0, 228, 2, 0, 0, 28, 5, 0, 0, 225, 6, 0, 0, 193, 7, 0, 0, 0, 0, 0, 0, 35, 0, 0, 0, 177, 0, 0, 0, 2, 2, 0, 0, 0, 4, 0, 0, 254, 5, 0, 0, 79, 7, 0, 0, 221, 7, 0, 0, 0, 0, 0, 0, 19, 0, 0, 0, 107, 0, 0, 0, 90, 1, 0, 0, 1, 3, 0, 0, 255, 4, 0, 0, 166, 6, 0, 0, 149, 7, 0, 0, 237, 7, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 63, 0, 0, 0, 226, 0, 0, 0, 45, 2, 0, 0, 0, 4, 0, 0, 211, 5, 0, 0, 30, 7, 0, 0, 193, 7, 0, 0, 246, 7, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 140, 0, 0, 0, 131, 1, 0, 0, 21, 3, 0, 0, 235, 4, 0, 0, 125, 6, 0, 0, 116, 7, 0, 0, 224, 7, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 87, 0, 0, 0, 9, 1, 0, 0, 77, 2, 0, 0, 0, 4, 0, 0, 179, 5, 0, 0, 247, 6, 0, 0, 169, 7, 0, 0, 238, 7, 0, 0, 0, 0, 0, 0, 44, 0, 0, 0, 168, 0, 0, 0, 164, 1, 0, 0, 36, 3, 0, 0, 220, 4, 0, 0, 92, 6, 0, 0, 88, 7, 0, 0, 212, 7, 0, 0, 0, 0, 0, 0, 27, 0, 0, 0, 110, 0, 0, 0, 41, 1, 0, 0, 101, 2, 0, 0, 0, 4, 0, 0, 155, 5, 0, 0, 215, 6, 0, 0, 146, 7, 0, 0, 229, 7, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 71, 0, 0, 0, 205, 0, 0, 0, 200, 1, 0, 0, 51, 3, 0, 0, 205, 4, 0, 0, 56, 6, 0, 0, 51, 7, 0, 0, 185, 7, 0, 0, 240, 7, 0, 0, 0, 0, 0, 0, 35, 0, 0, 0, 130, 0, 0, 0, 68, 1, 0, 0, 122, 2, 0, 0, 0, 4, 0, 0, 134, 5, 0, 0, 188, 6, 0, 0, 126, 7, 0, 0, 221, 7, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 86, 0, 0, 0, 230, 0, 0, 0, 224, 1, 0, 0, 61, 3, 0, 0, 195, 4, 0, 0, 32, 6, 0, 0, 26, 7, 0, 0, 170, 7, 0, 0, 234, 7, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 148, 0, 0, 0, 91, 1, 0, 0, 138, 2, 0, 0, 0, 4, 0, 0, 118, 5, 0, 0, 165, 6, 0, 0, 108, 7, 0, 0, 213, 7, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 36, 0, 0, 0, 109, 0, 0, 0, 2, 1, 0, 0, 250, 1, 0, 0, 72, 3, 0, 0, 184, 4, 0, 0, 6, 6, 0, 0, 254, 6, 0, 0, 147, 7, 0, 0, 220, 7, 0, 0, 248, 7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 23, 0, 0, 0, 73, 0, 0, 0, 183, 0, 0, 0, 125, 1, 0, 0, 160, 2, 0, 0, 0, 4, 0, 0, 96, 5, 0, 0, 131, 6, 0, 0, 73, 7, 0, 0, 183, 7, 0, 0, 233, 7, 0, 0, 251, 7, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 45, 0, 0, 0, 125, 0, 0, 0, 24, 1, 0, 0, 13, 2, 0, 0, 79, 3, 0, 0, 177, 4, 0, 0, 243, 5, 0, 0, 232, 6, 0, 0, 131, 7, 0, 0, 211, 7, 0, 0, 245, 7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 29, 0, 0, 0, 86, 0, 0, 0, 203, 0, 0, 0, 146, 1, 0, 0, 174, 2, 0, 0, 0, 4, 0, 0, 82, 5, 0, 0, 110, 6, 0, 0, 53, 7, 0, 0, 170, 7, 0, 0, 227, 7, 0, 0, 249, 7, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 128, 0, 0, 0, 32, 1, 0, 0, 23, 2, 0, 0, 84, 3, 0, 0, 172, 4, 0, 0, 233, 5, 0, 0, 224, 6, 0, 0, 128, 7, 0, 0, 216, 7, 0, 0, 0, 0, 0, 0, 27, 0, 0, 0, 90, 0, 0, 0, 213, 0, 0, 0, 159, 1, 0, 0, 183, 2, 0, 0, 0, 4, 0, 0, 73, 5, 0, 0, 97, 6, 0, 0, 43, 7, 0, 0, 166, 7, 0, 0, 229, 7, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 62, 0, 0, 0, 155, 0, 0, 0, 60, 1, 0, 0, 44, 2, 0, 0, 92, 3, 0, 0, 164, 4, 0, 0, 212, 5, 0, 0, 196, 6, 0, 0, 101, 7, 0, 0, 194, 7, 0, 0, 238, 7, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 100, 0, 0, 0, 228, 0, 0, 0, 174, 1, 0, 0, 193, 2, 0, 0, 0, 4, 0, 0, 63, 5, 0, 0, 82, 6, 0, 0, 28, 7, 0, 0, 156, 7, 0, 0, 225, 7, 0, 0, 0, 0, 0, 0, 21, 0, 0, 0, 71, 0, 0, 0, 168, 0, 0, 0, 76, 1, 0, 0, 57, 2, 0, 0, 97, 3, 0, 0, 159, 4, 0, 0, 199, 5, 0, 0, 180, 6, 0, 0, 88, 7, 0, 0, 185, 7, 0, 0, 235, 7, 0, 0, 0, 0, 0, 0, 62, 0, 0, 0, 123, 1, 0, 0, 0, 4, 0, 0, 133, 6, 0, 0, 194, 7, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 218, 0, 0, 0, 188, 2, 0, 0, 68, 5, 0, 0, 38, 7, 0, 0, 226, 7, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 193, 1, 0, 0, 0, 4, 0, 0, 63, 6, 0, 0, 146, 7, 0, 0, 0, 0, 0, 0, 61, 0, 0, 0, 27, 1, 0, 0, 226, 2, 0, 0, 30, 5, 0, 0, 229, 6, 0, 0, 195, 7, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 173, 0, 0, 0, 254, 1, 0, 0, 0, 4, 0, 0, 2, 6, 0, 0, 83, 7, 0, 0, 223, 7, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 103, 0, 0, 0, 85, 1, 0, 0, 255, 2, 0, 0, 1, 5, 0, 0, 171, 6, 0, 0, 153, 7, 0, 0, 238, 7, 0, 0, 0, 0, 0, 0, 51, 0, 0, 0, 213, 0, 0, 0, 36, 2, 0, 0, 0, 4, 0, 0, 220, 5, 0, 0, 43, 7, 0, 0, 205, 7, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 135, 0, 0, 0, 126, 1, 0, 0, 18, 3, 0, 0, 238, 4, 0, 0, 130, 6, 0, 0, 121, 7, 0, 0, 226, 7, 0, 0, 0, 0, 0, 0, 17, 0, 0, 0, 84, 0, 0, 0, 2, 1, 0, 0, 71, 2, 0, 0, 0, 4, 0, 0, 185, 5, 0, 0, 254, 6, 0, 0, 172, 7, 0, 0, 239, 7, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 162, 0, 0, 0, 158, 1, 0, 0, 33, 3, 0, 0, 223, 4, 0, 0, 98, 6, 0, 0, 94, 7, 0, 0, 215, 7, 0, 0, 0, 0, 0, 0, 25, 0, 0, 0, 105, 0, 0, 0, 34, 1, 0, 0, 96, 2, 0, 0, 0, 4, 0, 0, 160, 5, 0, 0, 222, 6, 0, 0, 151, 7, 0, 0, 231, 7, 0, 0, 0, 0, 0, 0, 52, 0, 0, 0, 185, 0, 0, 0, 184, 1, 0, 0, 45, 3, 0, 0, 211, 4, 0, 0, 72, 6, 0, 0, 71, 7, 0, 0, 204, 7, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 124, 0, 0, 0, 60, 1, 0, 0, 116, 2, 0, 0, 0, 4, 0, 0, 140, 5, 0, 0, 196, 6, 0, 0, 132, 7, 0, 0, 223, 7, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 81, 0, 0, 0, 222, 0, 0, 0, 216, 1, 0, 0, 58, 3, 0, 0, 198, 4, 0, 0, 40, 6, 0, 0, 34, 7, 0, 0, 175, 7, 0, 0, 236, 7, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 52, 0, 0, 0, 152, 0, 0, 0, 91, 1, 0, 0, 137, 2, 0, 0, 0, 4, 0, 0, 119, 5, 0, 0, 165, 6, 0, 0, 104, 7, 0, 0, 204, 7, 0, 0, 244, 7, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 95, 0, 0, 0, 243, 0, 0, 0, 237, 1, 0, 0, 66, 3, 0, 0, 190, 4, 0, 0, 19, 6, 0, 0, 13, 7, 0, 0, 161, 7, 0, 0, 230, 7, 0, 0, 0, 0, 0, 0, 28, 0, 0, 0, 213, 0, 0, 0, 184, 2, 0, 0, 72, 5, 0, 0, 43, 7, 0, 0, 228, 7, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 117, 0, 0, 0, 194, 1, 0, 0, 0, 4, 0, 0, 62, 6, 0, 0, 139, 7, 0, 0, 243, 7, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 63, 0, 0, 0, 24, 1, 0, 0, 223, 2, 0, 0, 33, 5, 0, 0, 232, 6, 0, 0, 193, 7, 0, 0, 250, 7, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 33, 0, 0, 0, 168, 0, 0, 0, 248, 1, 0, 0, 0, 4, 0, 0, 8, 6, 0, 0, 88, 7, 0, 0, 223, 7, 0, 0, 253, 7, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 97, 0, 0, 0, 75, 1, 0, 0, 249, 2, 0, 0, 7, 5, 0, 0, 181, 6, 0, 0, 159, 7, 0, 0, 240, 7, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 55, 0, 0, 0, 210, 0, 0, 0, 31, 2, 0, 0, 0, 4, 0, 0, 225, 5, 0, 0, 46, 7, 0, 0, 201, 7, 0, 0, 248, 7, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 126, 0, 0, 0, 114, 1, 0, 0, 12, 3, 0, 0, 244, 4, 0, 0, 142, 6, 0, 0, 130, 7, 0, 0, 230, 7, 0, 0, 0, 0, 0, 0, 62, 0, 0, 0, 234, 0, 0, 0, 54, 2, 0, 0, 0, 4, 0, 0, 202, 5, 0, 0, 22, 7, 0, 0, 194, 7, 0, 0, 0, 0, 0, 0, 37, 0, 0, 0, 151, 0, 0, 0, 145, 1, 0, 0, 27, 3, 0, 0, 229, 4, 0, 0, 111, 6, 0, 0, 105, 7, 0, 0, 219, 7, 0, 0, 0, 0, 0, 0, 21, 0, 0, 0, 95, 0, 0, 0, 19, 1, 0, 0, 84, 2, 0, 0, 0, 4, 0, 0, 172, 5, 0, 0, 237, 6, 0, 0, 161, 7, 0, 0, 235, 7, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 3, 1, 0, 0, 211, 2, 0, 0, 45, 5, 0, 0, 253, 6, 0, 0, 206, 7, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 27, 0, 0, 0, 151, 0, 0, 0, 230, 1, 0, 0, 0, 4, 0, 0, 26, 6, 0, 0, 105, 7, 0, 0, 229, 7, 0, 0, 254, 7, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 83, 0, 0, 0, 53, 1, 0, 0, 238, 2, 0, 0, 18, 5, 0, 0, 203, 6, 0, 0, 173, 7, 0, 0, 244, 7, 0, 0, 0, 0, 0, 0, 39, 0, 0, 0, 183, 0, 0, 0, 6, 2, 0, 0, 0, 4, 0, 0, 250, 5, 0, 0, 73, 7, 0, 0, 217, 7, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 107, 0, 0, 0, 87, 1, 0, 0, 255, 2, 0, 0, 1, 5, 0, 0, 169, 6, 0, 0, 149, 7, 0, 0, 236, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 64, 0, 0, 0, 64, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 20, 0, 0, 196, 22, 0, 0, 200, 23, 0, 0, 204, 24, 0, 0, 80, 25, 0, 0, 212, 25, 0, 0, 88, 26, 0, 0, 220, 26, 0, 0, 96, 27, 0, 0, 228, 27, 0, 0, 104, 28, 0, 0, 236, 28, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 21, 0, 0, 0, 56, 0, 0, 0, 126, 0, 0, 0, 252, 0, 0, 0, 206, 1, 0, 0, 24, 3, 0, 0, 7, 5, 0, 0, 210, 7, 0, 0, 187, 11, 0, 0, 16, 17, 0, 0, 44, 24, 0, 0, 120, 33, 0, 0, 108, 45, 0, 0, 144, 60, 0, 0, 125, 79, 0, 0, 222, 102, 0, 0, 113, 131, 0, 0, 8, 166, 0, 0, 138, 207, 0, 0, 244, 0, 1, 0, 90, 59, 1, 0, 232, 127, 1, 0, 227, 207, 1, 0, 170, 44, 2, 0, 183, 151, 2, 0, 160, 18, 3, 0, 24, 159, 3, 0, 240, 62, 4, 0, 24, 244, 4, 0, 160, 192, 5, 0, 185, 166, 6, 0, 182, 168, 7, 0, 13, 201, 8, 0, 88, 10, 10, 0, 86, 111, 11, 0, 236, 250, 12, 0, 38, 176, 14, 0, 56, 146, 16, 0, 127, 164, 18, 0, 130, 234, 20, 0, 243, 103, 23, 0, 176, 32, 26, 0, 196, 24, 29, 0, 104, 84, 32, 0, 4, 216, 35, 0, 48, 168, 39, 0, 181, 201, 43, 0, 142, 65, 48, 0, 233, 20, 53, 0, 40, 73, 58, 0, 226, 227, 63, 0, 228, 234, 69, 0, 50, 100, 76, 0, 8, 86, 83, 0, 219, 198, 90, 0, 90, 189, 98, 0, 111, 64, 107, 0, 64, 87, 116, 0, 48, 9, 126, 0, 224, 93, 136, 0, 48, 93, 147, 0, 64, 15, 159, 0, 113, 124, 171, 0, 102, 173, 184, 0, 5, 171, 198, 0, 120, 126, 213, 0, 46, 49, 229, 0, 220, 204, 245, 0, 126, 91, 7, 1, 88, 231, 25, 1, 247, 122, 45, 1, 50, 33, 66, 1, 43, 229, 87, 1, 80, 210, 110, 1, 92, 244, 134, 1, 88, 87, 160, 1, 156, 7, 187, 1, 208, 17, 215, 1, 237, 130, 244, 1, 62, 104, 19, 2, 97, 207, 51, 2, 72, 198, 85, 2, 58, 91, 121, 2, 212, 156, 158, 2, 10, 154, 197, 2, 40, 98, 238, 2, 211, 4, 25, 3, 10, 146, 69, 3, 39, 26, 116, 3, 224, 173, 164, 3, 72, 94, 215, 3, 208, 60, 12, 4, 72, 91, 67, 4, 224, 203, 124, 4, 41, 161, 184, 4, 22, 238, 246, 4, 253, 197, 55, 5, 152, 60, 123, 5, 6, 102, 193, 5, 204, 86, 10, 6, 214, 35, 86, 6, 120, 226, 164, 6, 111, 168, 246, 6, 226, 139, 75, 7, 99, 163, 163, 7, 240, 5, 255, 7, 244, 202, 93, 8, 72, 10, 192, 8, 52, 220, 37, 9, 112, 89, 143, 9, 37, 155, 252, 9, 238, 186, 109, 10, 217, 210, 226, 10, 104, 253, 91, 11, 146, 85, 217, 11, 196, 246, 90, 12, 226, 252, 224, 12, 72, 132, 107, 13, 203, 169, 250, 13, 186, 138, 142, 14, 223, 68, 39, 15, 128, 246, 196, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 7, 0, 0, 0, 28, 0, 0, 0, 84, 0, 0, 0, 210, 0, 0, 0, 206, 1, 0, 0, 156, 3, 0, 0, 180, 6, 0, 0, 187, 11, 0, 0, 141, 19, 0, 0, 72, 31, 0, 0, 88, 48, 0, 0, 132, 72, 0, 0, 252, 105, 0, 0, 104, 151, 0, 0, 248, 211, 0, 0, 117, 35, 1, 0, 83, 138, 1, 0, 196, 13, 2, 0, 204, 179, 2, 0, 86, 131, 3, 0, 74, 132, 4, 0, 164, 191, 5, 0, 140, 63, 7, 0, 111, 15, 9, 0, 25, 60, 11, 0, 208, 211, 13, 0, 112, 230, 16, 0, 136, 133, 20, 0, 120, 196, 24, 0, 144, 184, 29, 0, 48, 121, 35, 0, 233, 31, 42, 0, 159, 200, 49, 0, 172, 145, 58, 0, 4, 156, 68, 0, 90, 11, 80, 0, 70, 6, 93, 0, 108, 182, 107, 0, 164, 72, 124, 0, 35, 237, 142, 0, 165, 215, 163, 0, 152, 63, 187, 0, 72, 96, 213, 0, 12, 121, 242, 0, 116, 205, 18, 1, 120, 165, 54, 1, 168, 77, 94, 1, 93, 23, 138, 1, 235, 88, 186, 1, 212, 109, 239, 1, 252, 182, 41, 2, 222, 154, 105, 2, 194, 133, 175, 2, 244, 233, 251, 2, 252, 63, 79, 3, 215, 6, 170, 3, 49, 196, 12, 4, 160, 4, 120, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 8, 0, 0, 0, 36, 0, 0, 0, 120, 0, 0, 0, 74, 1, 0, 0, 24, 3, 0, 0, 180, 6, 0, 0, 104, 13, 0, 0, 35, 25, 0, 0, 176, 44, 0, 0, 248, 75, 0, 0, 80, 124, 0, 0, 212, 196, 0, 0, 208, 46, 1, 0, 56, 198, 1, 0, 48, 154, 2, 0, 165, 189, 3, 0, 248, 71, 5, 0, 188, 85, 7, 0, 136, 9, 10, 0, 222, 140, 13, 0, 40, 17, 18, 0, 204, 208, 23, 0, 88, 16, 31, 0, 199, 31, 40, 0, 224, 91, 51, 0, 176, 47, 65, 0, 32, 22, 82, 0, 168, 155, 102, 0, 32, 96, 127, 0, 176, 24, 157, 0, 224, 145, 192, 0, 201, 177, 234, 0, 104, 122, 28, 1, 20, 12, 87, 1, 24, 168, 155, 1, 114, 179, 235, 1, 184, 185, 72, 2, 36, 112, 180, 2, 200, 184, 48, 3, 235, 165, 191, 3, 144, 125, 99, 4, 40, 189, 30, 5, 112, 29, 244, 5, 124, 150, 230, 6, 240, 99, 249, 7, 104, 9, 48, 9, 16, 87, 142, 10, 109, 110, 24, 12, 88, 199, 210, 13, 44, 53, 194, 15, 40, 236, 235, 17, 6, 135, 85, 20, 200, 12, 5, 23, 188, 246, 0, 26, 184, 54, 80, 29, 143, 61, 250, 32, 192, 1, 7, 37, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 9, 0, 0, 0, 45, 0, 0, 0, 165, 0, 0, 0, 239, 1, 0, 0, 7, 5, 0, 0, 187, 11, 0, 0, 35, 25, 0, 0, 70, 50, 0, 0, 246, 94, 0, 0, 238, 170, 0, 0, 62, 39, 1, 0, 18, 236, 1, 0, 226, 26, 3, 0, 26, 225, 4, 0, 74, 123, 7, 0, 239, 56, 11, 0, 231, 128, 16, 0, 163, 214, 23, 0, 43, 224, 33, 0, 9, 109, 47, 0, 49, 126, 65, 0, 253, 78, 89, 0, 85, 95, 120, 0, 28, 127, 160, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 10, 0, 0, 0, 55, 0, 0, 0, 220, 0, 0, 0, 203, 2, 0, 0, 210, 7, 0, 0, 141, 19, 0, 0, 176, 44, 0, 0, 246, 94, 0, 0, 236, 189, 0, 0, 218, 104, 1, 0, 24, 144, 2, 0, 42, 124, 4, 0, 12, 151, 7, 0, 38, 120, 12, 0, 112, 243, 19, 0, 95, 44, 31, 0, 70, 173, 47, 0, 233, 131, 71, 0, 20, 100, 105, 0, 29, 209, 152, 0, 78, 79, 218, 0, 75, 158, 51, 1, 160, 253, 171, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 11, 0, 0, 0, 66, 0, 0, 0, 30, 1, 0, 0, 233, 3, 0, 0, 187, 11, 0, 0, 72, 31, 0, 0, 248, 75, 0, 0, 238, 170, 0, 0, 218, 104, 1, 0, 180, 209, 2, 0, 204, 97, 5, 0, 246, 221, 9, 0, 2, 117, 17, 0, 40, 237, 29, 0, 152, 224, 49, 0, 247, 12, 81, 0, 61, 186, 128, 0, 38, 62, 200, 0, 58, 162, 49, 1, 87, 115, 202, 1, 165, 194, 164, 2, 240, 96, 216, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 12, 0, 0, 0, 78, 0, 0, 0, 108, 1, 0, 0, 85, 5, 0, 0, 16, 17, 0, 0, 88, 48, 0, 0, 80, 124, 0, 0, 62, 39, 1, 0, 24, 144, 2, 0, 204, 97, 5, 0, 152, 195, 10, 0, 142, 161, 20, 0, 144, 22, 38, 0, 184, 3, 68, 0, 80, 228, 117, 0, 71, 241, 198, 0, 132, 171, 71, 1, 170, 233, 15, 2, 228, 139, 65, 3, 59, 255, 11, 5, 224, 193, 176, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 13, 0, 0, 0, 91, 0, 0, 0, 199, 1, 0, 0, 28, 7, 0, 0, 44, 24, 0, 0, 132, 72, 0, 0, 212, 196, 0, 0, 18, 236, 1, 0, 42, 124, 4, 0, 246, 221, 9, 0, 142, 161, 20, 0, 28, 67, 41, 0, 172, 89, 79, 0, 100, 93, 147, 0, 180, 65, 9, 1, 251, 50, 208, 1, 127, 222, 23, 3, 41, 200, 39, 5, 13, 84, 105, 8, 72, 83, 117, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 14, 0, 0, 0, 105, 0, 0, 0, 48, 2, 0, 0, 76, 9, 0, 0, 120, 33, 0, 0, 252, 105, 0, 0, 208, 46, 1, 0, 226, 26, 3, 0, 12, 151, 7, 0, 2, 117, 17, 0, 144, 22, 38, 0, 172, 89, 79, 0, 88, 179, 158, 0, 188, 16, 50, 1, 112, 82, 59, 2, 107, 133, 11, 4, 234, 99, 35, 7, 19, 44, 75, 12, 32, 128, 180, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 15, 0, 0, 0, 120, 0, 0, 0, 168, 2, 0, 0, 244, 11, 0, 0, 108, 45, 0, 0, 104, 151, 0, 0, 56, 198, 1, 0, 26, 225, 4, 0, 38, 120, 12, 0, 40, 237, 29, 0, 184, 3, 68, 0, 100, 93, 147, 0, 188, 16, 50, 1, 120, 33, 100, 2, 232, 115, 159, 4, 83, 249, 170, 8, 61, 93, 206, 15, 80, 137, 25, 28, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 16, 0, 0, 0, 136, 0, 0, 0, 48, 3, 0, 0, 36, 15, 0, 0, 144, 60, 0, 0, 248, 211, 0, 0, 48, 154, 2, 0, 74, 123, 7, 0, 112, 243, 19, 0, 152, 224, 49, 0, 80, 228, 117, 0, 180, 65, 9, 1, 112, 82, 59, 2, 232, 115, 159, 4, 208, 231, 62, 9, 35, 225, 233, 17, 96, 62, 184, 33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 17, 0, 0, 0, 153, 0, 0, 0, 201, 3, 0, 0, 237, 18, 0, 0, 125, 79, 0, 0, 117, 35, 1, 0, 165, 189, 3, 0, 239, 56, 11, 0, 95, 44, 31, 0, 247, 12, 81, 0, 71, 241, 198, 0, 251, 50, 208, 1, 107, 133, 11, 4, 83, 249, 170, 8, 35, 225, 233, 17, 70, 194, 211, 35, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 7, 0, 0, 0, 11, 0, 0, 0, 19, 0, 0, 0, 37, 0, 0, 0, 67, 0, 0, 0, 131, 0, 0, 0, 29, 1, 0, 0, 33, 2, 0, 0, 9, 4, 0, 0, 5, 8, 0, 0, 83, 16, 0, 0, 27, 32, 0, 0, 67, 68, 0, 0, 3, 128, 0, 0, 11, 16, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 30, 0, 0, 120, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 236, 30, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 19, 0, 0, 0, 4, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 19, 0, 0, 0, 252, 44, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 45, 244, 81, 88, 207, 140, 177, 192, 70, 246, 181, 203, 41, 49, 3, 199, 4, 91, 112, 48, 180, 93, 253, 32, 120, 127, 139, 154, 216, 89, 41, 80, 104, 72, 137, 171, 167, 86, 3, 108, 255, 183, 205, 136, 63, 212, 119, 180, 43, 165, 163, 112, 241, 186, 228, 168, 252, 65, 131, 253, 217, 111, 225, 138, 122, 47, 45, 116, 150, 7, 31, 13, 9, 94, 3, 118, 44, 112, 247, 64, 165, 44, 167, 111, 87, 65, 168, 170, 116, 223, 160, 88, 100, 3, 74, 199, 196, 60, 83, 174, 175, 95, 24, 4, 21, 177, 227, 109, 40, 134, 171, 12, 164, 191, 67, 240, 233, 80, 129, 57, 87, 22, 82, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 123, 32, 114, 101, 116, 117, 114, 110, 32, 77, 111, 100, 117, 108, 101, 46, 103, 101, 116, 82, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 40, 41, 59, 32, 125, 0, 123, 32, 105, 102, 32, 40, 77, 111, 100, 117, 108, 101, 46, 103, 101, 116, 82, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 32, 61, 61, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 41, 32, 123, 32, 116, 114, 121, 32, 123, 32, 118, 97, 114, 32, 119, 105, 110, 100, 111, 119, 95, 32, 61, 32, 34, 111, 98, 106, 101, 99, 116, 34, 32, 61, 61, 61, 32, 116, 121, 112, 101, 111, 102, 32, 119, 105, 110, 100, 111, 119, 32, 63, 32, 119, 105, 110, 100, 111, 119, 32, 58, 32, 115, 101, 108, 102, 44, 32, 99, 114, 121, 112, 116, 111, 95, 32, 61, 32, 116, 121, 112, 101, 111, 102, 32, 119, 105, 110, 100, 111, 119, 95, 46, 99, 114, 121, 112, 116, 111, 32, 33, 61, 61, 32, 34, 117, 110, 100, 101, 102, 105, 110, 101, 100, 34, 32, 63, 32, 119, 105, 110, 100, 111, 119, 95, 46, 99, 114, 121, 112, 116, 111, 32, 58, 32, 119, 105, 110, 100, 111, 119, 95, 46, 109, 115, 67, 114, 121, 112, 116, 111, 44, 32, 114, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 115, 83, 116, 97, 110, 100, 97, 114, 100, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 40, 41, 32, 123, 32, 118, 97, 114, 32, 98, 117, 102, 32, 61, 32, 110, 101, 119, 32, 85, 105, 110, 116, 51, 50, 65, 114, 114, 97, 121, 40, 49, 41, 59, 32, 99, 114, 121, 112, 116, 111, 95, 46, 103, 101, 116, 82, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 115, 40, 98, 117, 102, 41, 59, 32, 114, 101, 116, 117, 114, 110, 32, 98, 117, 102, 91, 48, 93, 32, 62, 62, 62, 32, 48, 59, 32, 125, 59, 32, 114, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 115, 83, 116, 97, 110, 100, 97, 114, 100, 40, 41, 59, 32, 77, 111, 100, 117, 108, 101, 46, 103, 101, 116, 82, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 32, 61, 32, 114, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 115, 83, 116, 97, 110, 100, 97, 114, 100, 59, 32, 125, 32, 99, 97, 116, 99, 104, 32, 40, 101, 41, 32, 123, 32, 116, 114, 121, 32, 123, 32, 118, 97, 114, 32, 99, 114, 121, 112, 116, 111, 32, 61, 32, 114, 101, 113, 117, 105, 114, 101, 40, 39, 99, 114, 121, 112, 116, 111, 39, 41, 44, 32, 114, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 78, 111, 100, 101, 74, 83, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 40, 41, 32, 123, 32, 118, 97, 114, 32, 98, 117, 102, 32, 61, 32, 99, 114, 121, 112, 116, 111, 46, 114, 97, 110, 100, 111, 109, 66, 121, 116, 101, 115, 40, 52, 41, 59, 32, 114, 101, 116, 117, 114, 110, 32, 40, 98, 117, 102, 91, 48, 93, 32, 60, 60, 32, 50, 52, 32, 124, 32, 98, 117, 102, 91, 49, 93, 32, 60, 60, 32, 49, 54, 32, 124, 32, 98, 117, 102, 91, 50, 93, 32, 60, 60, 32, 56, 32, 124, 32, 98, 117, 102, 91, 51, 93, 41, 32, 62, 62, 62, 32, 48, 59, 32, 125, 59, 32, 114, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 78, 111, 100, 101, 74, 83, 40, 41, 59, 32, 77, 111, 100, 117, 108, 101, 46, 103, 101, 116, 82, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 32, 61, 32, 114, 97, 110, 100, 111, 109, 86, 97, 108, 117, 101, 78, 111, 100, 101, 74, 83, 59, 32, 125, 32, 99, 97, 116, 99, 104, 32, 40, 101, 41, 32, 123, 32, 116, 104, 114, 111, 119, 32, 39, 78, 111, 32, 115, 101, 99, 117, 114, 101, 32, 114, 97, 110, 100, 111, 109, 32, 110, 117, 109, 98, 101, 114, 32, 103, 101, 110, 101, 114, 97, 116, 111, 114, 32, 102, 111, 117, 110, 100, 39, 59, 32, 125, 32, 125, 32, 125, 32, 125, 0, 0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 105, 110, 99, 111, 110, 115, 105, 115, 116, 101, 110, 116, 32, 100, 97, 116, 97, 32, 102, 111, 114, 32, 99, 119, 44, 32, 114, 101, 114, 117, 110, 32, 103, 101, 110, 112, 97, 114, 97, 109, 115, 0, 69, 120, 116, 101, 110, 115, 105, 111, 110, 32, 100, 101, 103, 114, 101, 101, 32, 37, 100, 32, 110, 111, 116, 32, 105, 109, 112, 108, 101, 109, 101, 110, 116, 101, 100, 32, 33, 10, 0, 84, 33, 34, 25, 13, 1, 2, 3, 17, 75, 28, 12, 16, 4, 11, 29, 18, 30, 39, 104, 110, 111, 112, 113, 98, 32, 5, 6, 15, 19, 20, 21, 26, 8, 22, 7, 40, 36, 23, 24, 9, 10, 14, 27, 31, 37, 35, 131, 130, 125, 38, 42, 43, 60, 61, 62, 63, 67, 71, 74, 77, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 99, 100, 101, 102, 103, 105, 106, 107, 108, 114, 115, 116, 121, 122, 123, 124, 0, 73, 108, 108, 101, 103, 97, 108, 32, 98, 121, 116, 101, 32, 115, 101, 113, 117, 101, 110, 99, 101, 0, 68, 111, 109, 97, 105, 110, 32, 101, 114, 114, 111, 114, 0, 82, 101, 115, 117, 108, 116, 32, 110, 111, 116, 32, 114, 101, 112, 114, 101, 115, 101, 110, 116, 97, 98, 108, 101, 0, 78, 111, 116, 32, 97, 32, 116, 116, 121, 0, 80, 101, 114, 109, 105, 115, 115, 105, 111, 110, 32, 100, 101, 110, 105, 101, 100, 0, 79, 112, 101, 114, 97, 116, 105, 111, 110, 32, 110, 111, 116, 32, 112, 101, 114, 109, 105, 116, 116, 101, 100, 0, 78, 111, 32, 115, 117, 99, 104, 32, 102, 105, 108, 101, 32, 111, 114, 32, 100, 105, 114, 101, 99, 116, 111, 114, 121, 0, 78, 111, 32, 115, 117, 99, 104, 32, 112, 114, 111, 99, 101, 115, 115, 0, 70, 105, 108, 101, 32, 101, 120, 105, 115, 116, 115, 0, 86, 97, 108, 117, 101, 32, 116, 111, 111, 32, 108, 97, 114, 103, 101, 32, 102, 111, 114, 32, 100, 97, 116, 97, 32, 116, 121, 112, 101, 0, 78, 111, 32, 115, 112, 97, 99, 101, 32, 108, 101, 102, 116, 32, 111, 110, 32, 100, 101, 118, 105, 99, 101, 0, 79, 117, 116, 32, 111, 102, 32, 109, 101, 109, 111, 114, 121, 0, 82, 101, 115, 111, 117, 114, 99, 101, 32, 98, 117, 115, 121, 0, 73, 110, 116, 101, 114, 114, 117, 112, 116, 101, 100, 32, 115, 121, 115, 116, 101, 109, 32, 99, 97, 108, 108, 0, 82, 101, 115, 111, 117, 114, 99, 101, 32, 116, 101, 109, 112, 111, 114, 97, 114, 105, 108, 121, 32, 117, 110, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 73, 110, 118, 97, 108, 105, 100, 32, 115, 101, 101, 107, 0, 67, 114, 111, 115, 115, 45, 100, 101, 118, 105, 99, 101, 32, 108, 105, 110, 107, 0, 82, 101, 97, 100, 45, 111, 110, 108, 121, 32, 102, 105, 108, 101, 32, 115, 121, 115, 116, 101, 109, 0, 68, 105, 114, 101, 99, 116, 111, 114, 121, 32, 110, 111, 116, 32, 101, 109, 112, 116, 121, 0, 67, 111, 110, 110, 101, 99, 116, 105, 111, 110, 32, 114, 101, 115, 101, 116, 32, 98, 121, 32, 112, 101, 101, 114, 0, 79, 112, 101, 114, 97, 116, 105, 111, 110, 32, 116, 105, 109, 101, 100, 32, 111, 117, 116, 0, 67, 111, 110, 110, 101, 99, 116, 105, 111, 110, 32, 114, 101, 102, 117, 115, 101, 100, 0, 72, 111, 115, 116, 32, 105, 115, 32, 100, 111, 119, 110, 0, 72, 111, 115, 116, 32, 105, 115, 32, 117, 110, 114, 101, 97, 99, 104, 97, 98, 108, 101, 0, 65, 100, 100, 114, 101, 115, 115, 32, 105, 110, 32, 117, 115, 101, 0, 66, 114, 111, 107, 101, 110, 32, 112, 105, 112, 101, 0, 73, 47, 79, 32, 101, 114, 114, 111, 114, 0, 78, 111, 32, 115, 117, 99, 104, 32, 100, 101, 118, 105, 99, 101, 32, 111, 114, 32, 97, 100, 100, 114, 101, 115, 115, 0, 66, 108, 111, 99, 107, 32], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
    allocate([100, 101, 118, 105, 99, 101, 32, 114, 101, 113, 117, 105, 114, 101, 100, 0, 78, 111, 32, 115, 117, 99, 104, 32, 100, 101, 118, 105, 99, 101, 0, 78, 111, 116, 32, 97, 32, 100, 105, 114, 101, 99, 116, 111, 114, 121, 0, 73, 115, 32, 97, 32, 100, 105, 114, 101, 99, 116, 111, 114, 121, 0, 84, 101, 120, 116, 32, 102, 105, 108, 101, 32, 98, 117, 115, 121, 0, 69, 120, 101, 99, 32, 102, 111, 114, 109, 97, 116, 32, 101, 114, 114, 111, 114, 0, 73, 110, 118, 97, 108, 105, 100, 32, 97, 114, 103, 117, 109, 101, 110, 116, 0, 65, 114, 103, 117, 109, 101, 110, 116, 32, 108, 105, 115, 116, 32, 116, 111, 111, 32, 108, 111, 110, 103, 0, 83, 121, 109, 98, 111, 108, 105, 99, 32, 108, 105, 110, 107, 32, 108, 111, 111, 112, 0, 70, 105, 108, 101, 110, 97, 109, 101, 32, 116, 111, 111, 32, 108, 111, 110, 103, 0, 84, 111, 111, 32, 109, 97, 110, 121, 32, 111, 112, 101, 110, 32, 102, 105, 108, 101, 115, 32, 105, 110, 32, 115, 121, 115, 116, 101, 109, 0, 78, 111, 32, 102, 105, 108, 101, 32, 100, 101, 115, 99, 114, 105, 112, 116, 111, 114, 115, 32, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 66, 97, 100, 32, 102, 105, 108, 101, 32, 100, 101, 115, 99, 114, 105, 112, 116, 111, 114, 0, 78, 111, 32, 99, 104, 105, 108, 100, 32, 112, 114, 111, 99, 101, 115, 115, 0, 66, 97, 100, 32, 97, 100, 100, 114, 101, 115, 115, 0, 70, 105, 108, 101, 32, 116, 111, 111, 32, 108, 97, 114, 103, 101, 0, 84, 111, 111, 32, 109, 97, 110, 121, 32, 108, 105, 110, 107, 115, 0, 78, 111, 32, 108, 111, 99, 107, 115, 32, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 82, 101, 115, 111, 117, 114, 99, 101, 32, 100, 101, 97, 100, 108, 111, 99, 107, 32, 119, 111, 117, 108, 100, 32, 111, 99, 99, 117, 114, 0, 83, 116, 97, 116, 101, 32, 110, 111, 116, 32, 114, 101, 99, 111, 118, 101, 114, 97, 98, 108, 101, 0, 80, 114, 101, 118, 105, 111, 117, 115, 32, 111, 119, 110, 101, 114, 32, 100, 105, 101, 100, 0, 79, 112, 101, 114, 97, 116, 105, 111, 110, 32, 99, 97, 110, 99, 101, 108, 101, 100, 0, 70, 117, 110, 99, 116, 105, 111, 110, 32, 110, 111, 116, 32, 105, 109, 112, 108, 101, 109, 101, 110, 116, 101, 100, 0, 78, 111, 32, 109, 101, 115, 115, 97, 103, 101, 32, 111, 102, 32, 100, 101, 115, 105, 114, 101, 100, 32, 116, 121, 112, 101, 0, 73, 100, 101, 110, 116, 105, 102, 105, 101, 114, 32, 114, 101, 109, 111, 118, 101, 100, 0, 68, 101, 118, 105, 99, 101, 32, 110, 111, 116, 32, 97, 32, 115, 116, 114, 101, 97, 109, 0, 78, 111, 32, 100, 97, 116, 97, 32, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 68, 101, 118, 105, 99, 101, 32, 116, 105, 109, 101, 111, 117, 116, 0, 79, 117, 116, 32, 111, 102, 32, 115, 116, 114, 101, 97, 109, 115, 32, 114, 101, 115, 111, 117, 114, 99, 101, 115, 0, 76, 105, 110, 107, 32, 104, 97, 115, 32, 98, 101, 101, 110, 32, 115, 101, 118, 101, 114, 101, 100, 0, 80, 114, 111, 116, 111, 99, 111, 108, 32, 101, 114, 114, 111, 114, 0, 66, 97, 100, 32, 109, 101, 115, 115, 97, 103, 101, 0, 70, 105, 108, 101, 32, 100, 101, 115, 99, 114, 105, 112, 116, 111, 114, 32, 105, 110, 32, 98, 97, 100, 32, 115, 116, 97, 116, 101, 0, 78, 111, 116, 32, 97, 32, 115, 111, 99, 107, 101, 116, 0, 68, 101, 115, 116, 105, 110, 97, 116, 105, 111, 110, 32, 97, 100, 100, 114, 101, 115, 115, 32, 114, 101, 113, 117, 105, 114, 101, 100, 0, 77, 101, 115, 115, 97, 103, 101, 32, 116, 111, 111, 32, 108, 97, 114, 103, 101, 0, 80, 114, 111, 116, 111, 99, 111, 108, 32, 119, 114, 111, 110, 103, 32, 116, 121, 112, 101, 32, 102, 111, 114, 32, 115, 111, 99, 107, 101, 116, 0, 80, 114, 111, 116, 111, 99, 111, 108, 32, 110, 111, 116, 32, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 80, 114, 111, 116, 111, 99, 111, 108, 32, 110, 111, 116, 32, 115, 117, 112, 112, 111, 114, 116, 101, 100, 0, 83, 111, 99, 107, 101, 116, 32, 116, 121, 112, 101, 32, 110, 111, 116, 32, 115, 117, 112, 112, 111, 114, 116, 101, 100, 0, 78, 111, 116, 32, 115, 117, 112, 112, 111, 114, 116, 101, 100, 0, 80, 114, 111, 116, 111, 99, 111, 108, 32, 102, 97, 109, 105, 108, 121, 32, 110, 111, 116, 32, 115, 117, 112, 112, 111, 114, 116, 101, 100, 0, 65, 100, 100, 114, 101, 115, 115, 32, 102, 97, 109, 105, 108, 121, 32, 110, 111, 116, 32, 115, 117, 112, 112, 111, 114, 116, 101, 100, 32, 98, 121, 32, 112, 114, 111, 116, 111, 99, 111, 108, 0, 65, 100, 100, 114, 101, 115, 115, 32, 110, 111, 116, 32, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 78, 101, 116, 119, 111, 114, 107, 32, 105, 115, 32, 100, 111, 119, 110, 0, 78, 101, 116, 119, 111, 114, 107, 32, 117, 110, 114, 101, 97, 99, 104, 97, 98, 108, 101, 0, 67, 111, 110, 110, 101, 99, 116, 105, 111, 110, 32, 114, 101, 115, 101, 116, 32, 98, 121, 32, 110, 101, 116, 119, 111, 114, 107, 0, 67, 111, 110, 110, 101, 99, 116, 105, 111, 110, 32, 97, 98, 111, 114, 116, 101, 100, 0, 78, 111, 32, 98, 117, 102, 102, 101, 114, 32, 115, 112, 97, 99, 101, 32, 97, 118, 97, 105, 108, 97, 98, 108, 101, 0, 83, 111, 99, 107, 101, 116, 32, 105, 115, 32, 99, 111, 110, 110, 101, 99, 116, 101, 100, 0, 83, 111, 99, 107, 101, 116, 32, 110, 111, 116, 32, 99, 111, 110, 110, 101, 99, 116, 101, 100, 0, 67, 97, 110, 110, 111, 116, 32, 115, 101, 110, 100, 32, 97, 102, 116, 101, 114, 32, 115, 111, 99, 107, 101, 116, 32, 115, 104, 117, 116, 100, 111, 119, 110, 0, 79, 112, 101, 114, 97, 116, 105, 111, 110, 32, 97, 108, 114, 101, 97, 100, 121, 32, 105, 110, 32, 112, 114, 111, 103, 114, 101, 115, 115, 0, 79, 112, 101, 114, 97, 116, 105, 111, 110, 32, 105, 110, 32, 112, 114, 111, 103, 114, 101, 115, 115, 0, 83, 116, 97, 108, 101, 32, 102, 105, 108, 101, 32, 104, 97, 110, 100, 108, 101, 0, 82, 101, 109, 111, 116, 101, 32, 73, 47, 79, 32, 101, 114, 114, 111, 114, 0, 81, 117, 111, 116, 97, 32, 101, 120, 99, 101, 101, 100, 101, 100, 0, 78, 111, 32, 109, 101, 100, 105, 117, 109, 32, 102, 111, 117, 110, 100, 0, 87, 114, 111, 110, 103, 32, 109, 101, 100, 105, 117, 109, 32, 116, 121, 112, 101, 0, 78, 111, 32, 101, 114, 114, 111, 114, 32, 105, 110, 102, 111, 114, 109, 97, 116, 105, 111, 110], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 10240);
    allocate([17, 0, 10, 0, 17, 17, 17, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 15, 10, 17, 17, 17, 3, 10, 7, 0, 1, 19, 9, 11, 11, 0, 0, 9, 6, 11, 0, 0, 11, 0, 6, 17, 0, 0, 0, 17, 17, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 10, 10, 17, 17, 17, 0, 10, 0, 0, 2, 0, 9, 11, 0, 0, 0, 9, 0, 11, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 0, 0, 9, 12, 0, 0, 0, 0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 4, 13, 0, 0, 0, 0, 9, 14, 0, 0, 0, 0, 0, 14, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 16, 0, 0, 0, 0, 0, 16, 0, 0, 16, 0, 0, 18, 0, 0, 0, 18, 18, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 18, 18, 18, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 11, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 0, 0, 9, 12, 0, 0, 0, 0, 0, 12, 0, 0, 12, 0, 0, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 45, 43, 32, 32, 32, 48, 88, 48, 120, 0, 40, 110, 117, 108, 108, 41, 0, 45, 48, 88, 43, 48, 88, 32, 48, 88, 45, 48, 120, 43, 48, 120, 32, 48, 120, 0, 105, 110, 102, 0, 73, 78, 70, 0, 110, 97, 110, 0, 78, 65, 78, 0, 46, 0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 12540);
    var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
    assert(tempDoublePtr % 8 == 0);

    function copyTempFloat(ptr) {
        HEAP8[tempDoublePtr] = HEAP8[ptr];
        HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
        HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
        HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3]
    }

    function copyTempDouble(ptr) {
        HEAP8[tempDoublePtr] = HEAP8[ptr];
        HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
        HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
        HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
        HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
        HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
        HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
        HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7]
    }
    var _BDtoIHigh = true;
    Module["_i64Subtract"] = _i64Subtract;

    function ___setErrNo(value) {
        if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
        return value
    }
    var ERRNO_CODES = {
        EPERM: 1,
        ENOENT: 2,
        ESRCH: 3,
        EINTR: 4,
        EIO: 5,
        ENXIO: 6,
        E2BIG: 7,
        ENOEXEC: 8,
        EBADF: 9,
        ECHILD: 10,
        EAGAIN: 11,
        EWOULDBLOCK: 11,
        ENOMEM: 12,
        EACCES: 13,
        EFAULT: 14,
        ENOTBLK: 15,
        EBUSY: 16,
        EEXIST: 17,
        EXDEV: 18,
        ENODEV: 19,
        ENOTDIR: 20,
        EISDIR: 21,
        EINVAL: 22,
        ENFILE: 23,
        EMFILE: 24,
        ENOTTY: 25,
        ETXTBSY: 26,
        EFBIG: 27,
        ENOSPC: 28,
        ESPIPE: 29,
        EROFS: 30,
        EMLINK: 31,
        EPIPE: 32,
        EDOM: 33,
        ERANGE: 34,
        ENOMSG: 42,
        EIDRM: 43,
        ECHRNG: 44,
        EL2NSYNC: 45,
        EL3HLT: 46,
        EL3RST: 47,
        ELNRNG: 48,
        EUNATCH: 49,
        ENOCSI: 50,
        EL2HLT: 51,
        EDEADLK: 35,
        ENOLCK: 37,
        EBADE: 52,
        EBADR: 53,
        EXFULL: 54,
        ENOANO: 55,
        EBADRQC: 56,
        EBADSLT: 57,
        EDEADLOCK: 35,
        EBFONT: 59,
        ENOSTR: 60,
        ENODATA: 61,
        ETIME: 62,
        ENOSR: 63,
        ENONET: 64,
        ENOPKG: 65,
        EREMOTE: 66,
        ENOLINK: 67,
        EADV: 68,
        ESRMNT: 69,
        ECOMM: 70,
        EPROTO: 71,
        EMULTIHOP: 72,
        EDOTDOT: 73,
        EBADMSG: 74,
        ENOTUNIQ: 76,
        EBADFD: 77,
        EREMCHG: 78,
        ELIBACC: 79,
        ELIBBAD: 80,
        ELIBSCN: 81,
        ELIBMAX: 82,
        ELIBEXEC: 83,
        ENOSYS: 38,
        ENOTEMPTY: 39,
        ENAMETOOLONG: 36,
        ELOOP: 40,
        EOPNOTSUPP: 95,
        EPFNOSUPPORT: 96,
        ECONNRESET: 104,
        ENOBUFS: 105,
        EAFNOSUPPORT: 97,
        EPROTOTYPE: 91,
        ENOTSOCK: 88,
        ENOPROTOOPT: 92,
        ESHUTDOWN: 108,
        ECONNREFUSED: 111,
        EADDRINUSE: 98,
        ECONNABORTED: 103,
        ENETUNREACH: 101,
        ENETDOWN: 100,
        ETIMEDOUT: 110,
        EHOSTDOWN: 112,
        EHOSTUNREACH: 113,
        EINPROGRESS: 115,
        EALREADY: 114,
        EDESTADDRREQ: 89,
        EMSGSIZE: 90,
        EPROTONOSUPPORT: 93,
        ESOCKTNOSUPPORT: 94,
        EADDRNOTAVAIL: 99,
        ENETRESET: 102,
        EISCONN: 106,
        ENOTCONN: 107,
        ETOOMANYREFS: 109,
        EUSERS: 87,
        EDQUOT: 122,
        ESTALE: 116,
        ENOTSUP: 95,
        ENOMEDIUM: 123,
        EILSEQ: 84,
        EOVERFLOW: 75,
        ECANCELED: 125,
        ENOTRECOVERABLE: 131,
        EOWNERDEAD: 130,
        ESTRPIPE: 86
    };

    function _sysconf(name) {
        switch (name) {
            case 30:
                return PAGE_SIZE;
            case 85:
                return totalMemory / PAGE_SIZE;
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
            case 79:
                return 0;
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
            case 0:
                return 2097152;
            case 3:
                return 65536;
            case 28:
                return 32768;
            case 44:
                return 32767;
            case 75:
                return 16384;
            case 39:
                return 1e3;
            case 89:
                return 700;
            case 71:
                return 256;
            case 40:
                return 255;
            case 2:
                return 100;
            case 180:
                return 64;
            case 25:
                return 20;
            case 5:
                return 16;
            case 6:
                return 6;
            case 73:
                return 4;
            case 84:
                {
                    if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
                    return 1
                }
        }
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1
    }

    function _pthread_cleanup_push(routine, arg) {
        __ATEXIT__.push((function() {
            Runtime.dynCall("vi", routine, [arg])
        }));
        _pthread_cleanup_push.level = __ATEXIT__.length
    }
    Module["_memset"] = _memset;
    var _BDtoILow = true;
    Module["_bitshift64Lshr"] = _bitshift64Lshr;
    Module["_bitshift64Shl"] = _bitshift64Shl;

    function _pthread_cleanup_pop() {
        assert(_pthread_cleanup_push.level == __ATEXIT__.length, "cannot pop if something else added meanwhile!");
        __ATEXIT__.pop();
        _pthread_cleanup_push.level = __ATEXIT__.length
    }

    function _abort() {
        Module["abort"]()
    }

    function _pthread_self() {
        return 0
    }

    function ___lock() {}

    function ___unlock() {}
    var SYSCALLS = {
        varargs: 0,
        get: (function(varargs) {
            SYSCALLS.varargs += 4;
            var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
            return ret
        }),
        getStr: (function() {
            var ret = Pointer_stringify(SYSCALLS.get());
            return ret
        }),
        get64: (function() {
            var low = SYSCALLS.get(),
                high = SYSCALLS.get();
            if (low >= 0) assert(high === 0);
            else assert(high === -1);
            return low
        }),
        getZero: (function() {
            assert(SYSCALLS.get() === 0)
        })
    };

    function ___syscall6(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD();
            FS.close(stream);
            return 0
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno
        }
    }
    var _llvm_pow_f32 = Math_pow;
    var _emscripten_asm_const = true;
    Module["_i64Add"] = _i64Add;

    function _sbrk(bytes) {
        var self = _sbrk;
        if (!self.called) {
            DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
            self.called = true;
            assert(Runtime.dynamicAlloc);
            self.alloc = Runtime.dynamicAlloc;
            Runtime.dynamicAlloc = (function() {
                abort("cannot dynamically allocate, sbrk now has control")
            })
        }
        var ret = DYNAMICTOP;
        if (bytes != 0) {
            var success = self.alloc(bytes);
            if (!success) return -1 >>> 0
        }
        return ret
    }
    var _BItoD = true;
    var _sqrt = Math_sqrt;

    function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
        return dest
    }
    Module["_memcpy"] = _memcpy;
    var _emscripten_asm_const_int = true;
    var PATH = undefined;

    function _emscripten_set_main_loop_timing(mode, value) {
        Browser.mainLoop.timingMode = mode;
        Browser.mainLoop.timingValue = value;
        if (!Browser.mainLoop.func) {
            return 1
        }
        if (mode == 0) {
            Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
                setTimeout(Browser.mainLoop.runner, value)
            };
            Browser.mainLoop.method = "timeout"
        } else if (mode == 1) {
            Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
                Browser.requestAnimationFrame(Browser.mainLoop.runner)
            };
            Browser.mainLoop.method = "rAF"
        } else if (mode == 2) {
            if (!window["setImmediate"]) {
                var setImmediates = [];
                var emscriptenMainLoopMessageId = "__emcc";

                function Browser_setImmediate_messageHandler(event) {
                    if (event.source === window && event.data === emscriptenMainLoopMessageId) {
                        event.stopPropagation();
                        setImmediates.shift()()
                    }
                }
                window.addEventListener("message", Browser_setImmediate_messageHandler, true);
                window["setImmediate"] = function Browser_emulated_setImmediate(func) {
                    setImmediates.push(func);
                    window.postMessage(emscriptenMainLoopMessageId, "*")
                }
            }
            Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
                window["setImmediate"](Browser.mainLoop.runner)
            };
            Browser.mainLoop.method = "immediate"
        }
        return 0
    }

    function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
        Module["noExitRuntime"] = true;
        assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
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
                    var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
                    if (blocker.counted) {
                        Browser.mainLoop.remainingBlockers = next
                    } else {
                        next = next + .5;
                        Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9
                    }
                }
                console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
                Browser.mainLoop.updateStatus();
                setTimeout(Browser.mainLoop.runner, 0);
                return
            }
            if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
            Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
            if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
                Browser.mainLoop.scheduler();
                return
            }
            if (Browser.mainLoop.method === "timeout" && Module.ctx) {
                Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
                Browser.mainLoop.method = ""
            }
            Browser.mainLoop.runIter((function() {
                if (typeof arg !== "undefined") {
                    Runtime.dynCall("vi", func, [arg])
                } else {
                    Runtime.dynCall("v", func)
                }
            }));
            if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
            if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
            Browser.mainLoop.scheduler()
        };
        if (!noSetTiming) {
            if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
            else _emscripten_set_main_loop_timing(1, 1);
            Browser.mainLoop.scheduler()
        }
        if (simulateInfiniteLoop) {
            throw "SimulateInfiniteLoop"
        }
    }
    var Browser = {
        mainLoop: {
            scheduler: null,
            method: "",
            currentlyRunningMainloop: 0,
            func: null,
            arg: 0,
            timingMode: 0,
            timingValue: 0,
            currentFrameNumber: 0,
            queue: [],
            pause: (function() {
                Browser.mainLoop.scheduler = null;
                Browser.mainLoop.currentlyRunningMainloop++
            }),
            resume: (function() {
                Browser.mainLoop.currentlyRunningMainloop++;
                var timingMode = Browser.mainLoop.timingMode;
                var timingValue = Browser.mainLoop.timingValue;
                var func = Browser.mainLoop.func;
                Browser.mainLoop.func = null;
                _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
                _emscripten_set_main_loop_timing(timingMode, timingValue);
                Browser.mainLoop.scheduler()
            }),
            updateStatus: (function() {
                if (Module["setStatus"]) {
                    var message = Module["statusMessage"] || "Please wait...";
                    var remaining = Browser.mainLoop.remainingBlockers;
                    var expected = Browser.mainLoop.expectedBlockers;
                    if (remaining) {
                        if (remaining < expected) {
                            Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")")
                        } else {
                            Module["setStatus"](message)
                        }
                    } else {
                        Module["setStatus"]("")
                    }
                }
            }),
            runIter: (function(func) {
                if (ABORT) return;
                if (Module["preMainLoop"]) {
                    var preRet = Module["preMainLoop"]();
                    if (preRet === false) {
                        return
                    }
                }
                try {
                    func()
                } catch (e) {
                    if (e instanceof ExitStatus) {
                        return
                    } else {
                        if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [e, e.stack]);
                        throw e
                    }
                }
                if (Module["postMainLoop"]) Module["postMainLoop"]()
            })
        },
        isFullScreen: false,
        pointerLock: false,
        moduleContextCreatedCallbacks: [],
        workers: [],
        init: (function() {
            if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
            if (Browser.initted) return;
            Browser.initted = true;
            try {
                new Blob;
                Browser.hasBlobConstructor = true
            } catch (e) {
                Browser.hasBlobConstructor = false;
                console.log("warning: no blob constructor, cannot create blobs with mimetypes")
            }
            Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
            Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
            if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
                console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
                Module.noImageDecoding = true
            }
            var imagePlugin = {};
            imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
                return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name)
            };
            imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
                var b = null;
                if (Browser.hasBlobConstructor) {
                    try {
                        b = new Blob([byteArray], {
                            type: Browser.getMimetype(name)
                        });
                        if (b.size !== byteArray.length) {
                            b = new Blob([(new Uint8Array(byteArray)).buffer], {
                                type: Browser.getMimetype(name)
                            })
                        }
                    } catch (e) {
                        Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder")
                    }
                }
                if (!b) {
                    var bb = new Browser.BlobBuilder;
                    bb.append((new Uint8Array(byteArray)).buffer);
                    b = bb.getBlob()
                }
                var url = Browser.URLObject.createObjectURL(b);
                var img = new Image;
                img.onload = function img_onload() {
                    assert(img.complete, "Image " + name + " could not be decoded");
                    var canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    Module["preloadedImages"][name] = canvas;
                    Browser.URLObject.revokeObjectURL(url);
                    if (onload) onload(byteArray)
                };
                img.onerror = function img_onerror(event) {
                    console.log("Image " + url + " could not be decoded");
                    if (onerror) onerror()
                };
                img.src = url
            };
            Module["preloadPlugins"].push(imagePlugin);
            var audioPlugin = {};
            audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
                return !Module.noAudioDecoding && name.substr(-4) in {
                    ".ogg": 1,
                    ".wav": 1,
                    ".mp3": 1
                }
            };
            audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
                var done = false;

                function finish(audio) {
                    if (done) return;
                    done = true;
                    Module["preloadedAudios"][name] = audio;
                    if (onload) onload(byteArray)
                }

                function fail() {
                    if (done) return;
                    done = true;
                    Module["preloadedAudios"][name] = new Audio;
                    if (onerror) onerror()
                }
                if (Browser.hasBlobConstructor) {
                    try {
                        var b = new Blob([byteArray], {
                            type: Browser.getMimetype(name)
                        })
                    } catch (e) {
                        return fail()
                    }
                    var url = Browser.URLObject.createObjectURL(b);
                    var audio = new Audio;
                    audio.addEventListener("canplaythrough", (function() {
                        finish(audio)
                    }), false);
                    audio.onerror = function audio_onerror(event) {
                        if (done) return;
                        console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");

                        function encode64(data) {
                            var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                            var PAD = "=";
                            var ret = "";
                            var leftchar = 0;
                            var leftbits = 0;
                            for (var i = 0; i < data.length; i++) {
                                leftchar = leftchar << 8 | data[i];
                                leftbits += 8;
                                while (leftbits >= 6) {
                                    var curr = leftchar >> leftbits - 6 & 63;
                                    leftbits -= 6;
                                    ret += BASE[curr]
                                }
                            }
                            if (leftbits == 2) {
                                ret += BASE[(leftchar & 3) << 4];
                                ret += PAD + PAD
                            } else if (leftbits == 4) {
                                ret += BASE[(leftchar & 15) << 2];
                                ret += PAD
                            }
                            return ret
                        }
                        audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
                        finish(audio)
                    };
                    audio.src = url;
                    Browser.safeSetTimeout((function() {
                        finish(audio)
                    }), 1e4)
                } else {
                    return fail()
                }
            };
            Module["preloadPlugins"].push(audioPlugin);
            var canvas = Module["canvas"];

            function pointerLockChange() {
                Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas || document["msPointerLockElement"] === canvas
            }
            if (canvas) {
                canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (function() {});
                canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (function() {});
                canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
                document.addEventListener("pointerlockchange", pointerLockChange, false);
                document.addEventListener("mozpointerlockchange", pointerLockChange, false);
                document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
                document.addEventListener("mspointerlockchange", pointerLockChange, false);
                if (Module["elementPointerLock"]) {
                    canvas.addEventListener("click", (function(ev) {
                        if (!Browser.pointerLock && canvas.requestPointerLock) {
                            canvas.requestPointerLock();
                            ev.preventDefault()
                        }
                    }), false)
                }
            }
        }),
        createContext: (function(canvas, useWebGL, setInModule, webGLContextAttributes) {
            if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
            var ctx;
            var contextHandle;
            if (useWebGL) {
                var contextAttributes = {
                    antialias: false,
                    alpha: false
                };
                if (webGLContextAttributes) {
                    for (var attribute in webGLContextAttributes) {
                        contextAttributes[attribute] = webGLContextAttributes[attribute]
                    }
                }
                contextHandle = GL.createContext(canvas, contextAttributes);
                if (contextHandle) {
                    ctx = GL.getContext(contextHandle).GLctx
                }
                canvas.style.backgroundColor = "black"
            } else {
                ctx = canvas.getContext("2d")
            }
            if (!ctx) return null;
            if (setInModule) {
                if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
                Module.ctx = ctx;
                if (useWebGL) GL.makeContextCurrent(contextHandle);
                Module.useWebGL = useWebGL;
                Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
                    callback()
                }));
                Browser.init()
            }
            return ctx
        }),
        destroyContext: (function(canvas, useWebGL, setInModule) {}),
        fullScreenHandlersInstalled: false,
        lockPointer: undefined,
        resizeCanvas: undefined,
        requestFullScreen: (function(lockPointer, resizeCanvas, vrDevice) {
            Browser.lockPointer = lockPointer;
            Browser.resizeCanvas = resizeCanvas;
            Browser.vrDevice = vrDevice;
            if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
            if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
            if (typeof Browser.vrDevice === "undefined") Browser.vrDevice = null;
            var canvas = Module["canvas"];

            function fullScreenChange() {
                Browser.isFullScreen = false;
                var canvasContainer = canvas.parentNode;
                if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
                    canvas.cancelFullScreen = document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["webkitCancelFullScreen"] || document["msExitFullscreen"] || document["exitFullscreen"] || (function() {});
                    canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
                    if (Browser.lockPointer) canvas.requestPointerLock();
                    Browser.isFullScreen = true;
                    if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize()
                } else {
                    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
                    canvasContainer.parentNode.removeChild(canvasContainer);
                    if (Browser.resizeCanvas) Browser.setWindowedCanvasSize()
                }
                if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullScreen);
                Browser.updateCanvasDimensions(canvas)
            }
            if (!Browser.fullScreenHandlersInstalled) {
                Browser.fullScreenHandlersInstalled = true;
                document.addEventListener("fullscreenchange", fullScreenChange, false);
                document.addEventListener("mozfullscreenchange", fullScreenChange, false);
                document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
                document.addEventListener("MSFullscreenChange", fullScreenChange, false)
            }
            var canvasContainer = document.createElement("div");
            canvas.parentNode.insertBefore(canvasContainer, canvas);
            canvasContainer.appendChild(canvas);
            canvasContainer.requestFullScreen = canvasContainer["requestFullScreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullScreen"] ? (function() {
                canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"])
            }) : null);
            if (vrDevice) {
                canvasContainer.requestFullScreen({
                    vrDisplay: vrDevice
                })
            } else {
                canvasContainer.requestFullScreen()
            }
        }),
        nextRAF: 0,
        fakeRequestAnimationFrame: (function(func) {
            var now = Date.now();
            if (Browser.nextRAF === 0) {
                Browser.nextRAF = now + 1e3 / 60
            } else {
                while (now + 2 >= Browser.nextRAF) {
                    Browser.nextRAF += 1e3 / 60
                }
            }
            var delay = Math.max(Browser.nextRAF - now, 0);
            setTimeout(func, delay)
        }),
        requestAnimationFrame: function requestAnimationFrame(func) {
            if (typeof window === "undefined") {
                Browser.fakeRequestAnimationFrame(func)
            } else {
                if (!window.requestAnimationFrame) {
                    window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || Browser.fakeRequestAnimationFrame
                }
                window.requestAnimationFrame(func)
            }
        },
        safeCallback: (function(func) {
            return (function() {
                if (!ABORT) return func.apply(null, arguments)
            })
        }),
        allowAsyncCallbacks: true,
        queuedAsyncCallbacks: [],
        pauseAsyncCallbacks: (function() {
            Browser.allowAsyncCallbacks = false
        }),
        resumeAsyncCallbacks: (function() {
            Browser.allowAsyncCallbacks = true;
            if (Browser.queuedAsyncCallbacks.length > 0) {
                var callbacks = Browser.queuedAsyncCallbacks;
                Browser.queuedAsyncCallbacks = [];
                callbacks.forEach((function(func) {
                    func()
                }))
            }
        }),
        safeRequestAnimationFrame: (function(func) {
            return Browser.requestAnimationFrame((function() {
                if (ABORT) return;
                if (Browser.allowAsyncCallbacks) {
                    func()
                } else {
                    Browser.queuedAsyncCallbacks.push(func)
                }
            }))
        }),
        safeSetTimeout: (function(func, timeout) {
            Module["noExitRuntime"] = true;
            return setTimeout((function() {
                if (ABORT) return;
                if (Browser.allowAsyncCallbacks) {
                    func()
                } else {
                    Browser.queuedAsyncCallbacks.push(func)
                }
            }), timeout)
        }),
        safeSetInterval: (function(func, timeout) {
            Module["noExitRuntime"] = true;
            return setInterval((function() {
                if (ABORT) return;
                if (Browser.allowAsyncCallbacks) {
                    func()
                }
            }), timeout)
        }),
        getMimetype: (function(name) {
            return {
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
                "bmp": "image/bmp",
                "ogg": "audio/ogg",
                "wav": "audio/wav",
                "mp3": "audio/mpeg"
            }[name.substr(name.lastIndexOf(".") + 1)]
        }),
        getUserMedia: (function(func) {
            if (!window.getUserMedia) {
                window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"]
            }
            window.getUserMedia(func)
        }),
        getMovementX: (function(event) {
            return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0
        }),
        getMovementY: (function(event) {
            return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0
        }),
        getMouseWheelDelta: (function(event) {
            var delta = 0;
            switch (event.type) {
                case "DOMMouseScroll":
                    delta = event.detail;
                    break;
                case "mousewheel":
                    delta = event.wheelDelta;
                    break;
                case "wheel":
                    delta = event["deltaY"];
                    break;
                default:
                    throw "unrecognized mouse wheel event: " + event.type
            }
            return delta
        }),
        mouseX: 0,
        mouseY: 0,
        mouseMovementX: 0,
        mouseMovementY: 0,
        touches: {},
        lastTouches: {},
        calculateMouseEvent: (function(event) {
            if (Browser.pointerLock) {
                if (event.type != "mousemove" && "mozMovementX" in event) {
                    Browser.mouseMovementX = Browser.mouseMovementY = 0
                } else {
                    Browser.mouseMovementX = Browser.getMovementX(event);
                    Browser.mouseMovementY = Browser.getMovementY(event)
                }
                if (typeof SDL != "undefined") {
                    Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
                    Browser.mouseY = SDL.mouseY + Browser.mouseMovementY
                } else {
                    Browser.mouseX += Browser.mouseMovementX;
                    Browser.mouseY += Browser.mouseMovementY
                }
            } else {
                var rect = Module["canvas"].getBoundingClientRect();
                var cw = Module["canvas"].width;
                var ch = Module["canvas"].height;
                var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
                var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
                if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
                    var touch = event.touch;
                    if (touch === undefined) {
                        return
                    }
                    var adjustedX = touch.pageX - (scrollX + rect.left);
                    var adjustedY = touch.pageY - (scrollY + rect.top);
                    adjustedX = adjustedX * (cw / rect.width);
                    adjustedY = adjustedY * (ch / rect.height);
                    var coords = {
                        x: adjustedX,
                        y: adjustedY
                    };
                    if (event.type === "touchstart") {
                        Browser.lastTouches[touch.identifier] = coords;
                        Browser.touches[touch.identifier] = coords
                    } else if (event.type === "touchend" || event.type === "touchmove") {
                        var last = Browser.touches[touch.identifier];
                        if (!last) last = coords;
                        Browser.lastTouches[touch.identifier] = last;
                        Browser.touches[touch.identifier] = coords
                    }
                    return
                }
                var x = event.pageX - (scrollX + rect.left);
                var y = event.pageY - (scrollY + rect.top);
                x = x * (cw / rect.width);
                y = y * (ch / rect.height);
                Browser.mouseMovementX = x - Browser.mouseX;
                Browser.mouseMovementY = y - Browser.mouseY;
                Browser.mouseX = x;
                Browser.mouseY = y
            }
        }),
        xhrLoad: (function(url, onload, onerror) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function xhr_onload() {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response)
                } else {
                    onerror()
                }
            };
            xhr.onerror = onerror;
            xhr.send(null)
        }),
        asyncLoad: (function(url, onload, onerror, noRunDep) {
            Browser.xhrLoad(url, (function(arrayBuffer) {
                assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
                onload(new Uint8Array(arrayBuffer));
                if (!noRunDep) removeRunDependency("al " + url)
            }), (function(event) {
                if (onerror) {
                    onerror()
                } else {
                    throw 'Loading data file "' + url + '" failed.'
                }
            }));
            if (!noRunDep) addRunDependency("al " + url)
        }),
        resizeListeners: [],
        updateResizeListeners: (function() {
            var canvas = Module["canvas"];
            Browser.resizeListeners.forEach((function(listener) {
                listener(canvas.width, canvas.height)
            }))
        }),
        setCanvasSize: (function(width, height, noUpdates) {
            var canvas = Module["canvas"];
            Browser.updateCanvasDimensions(canvas, width, height);
            if (!noUpdates) Browser.updateResizeListeners()
        }),
        windowedWidth: 0,
        windowedHeight: 0,
        setFullScreenCanvasSize: (function() {
            if (typeof SDL != "undefined") {
                var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
                flags = flags | 8388608;
                HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags
            }
            Browser.updateResizeListeners()
        }),
        setWindowedCanvasSize: (function() {
            if (typeof SDL != "undefined") {
                var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
                flags = flags & ~8388608;
                HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags
            }
            Browser.updateResizeListeners()
        }),
        updateCanvasDimensions: (function(canvas, wNative, hNative) {
            if (wNative && hNative) {
                canvas.widthNative = wNative;
                canvas.heightNative = hNative
            } else {
                wNative = canvas.widthNative;
                hNative = canvas.heightNative
            }
            var w = wNative;
            var h = hNative;
            if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
                if (w / h < Module["forcedAspectRatio"]) {
                    w = Math.round(h * Module["forcedAspectRatio"])
                } else {
                    h = Math.round(w / Module["forcedAspectRatio"])
                }
            }
            if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
                var factor = Math.min(screen.width / w, screen.height / h);
                w = Math.round(w * factor);
                h = Math.round(h * factor)
            }
            if (Browser.resizeCanvas) {
                if (canvas.width != w) canvas.width = w;
                if (canvas.height != h) canvas.height = h;
                if (typeof canvas.style != "undefined") {
                    canvas.style.removeProperty("width");
                    canvas.style.removeProperty("height")
                }
            } else {
                if (canvas.width != wNative) canvas.width = wNative;
                if (canvas.height != hNative) canvas.height = hNative;
                if (typeof canvas.style != "undefined") {
                    if (w != wNative || h != hNative) {
                        canvas.style.setProperty("width", w + "px", "important");
                        canvas.style.setProperty("height", h + "px", "important")
                    } else {
                        canvas.style.removeProperty("width");
                        canvas.style.removeProperty("height")
                    }
                }
            }
        }),
        wgetRequests: {},
        nextWgetRequestHandle: 0,
        getNextWgetRequestHandle: (function() {
            var handle = Browser.nextWgetRequestHandle;
            Browser.nextWgetRequestHandle++;
            return handle
        })
    };

    function _time(ptr) {
        var ret = Date.now() / 1e3 | 0;
        if (ptr) {
            HEAP32[ptr >> 2] = ret
        }
        return ret
    }

    function __exit(status) {
        Module["exit"](status)
    }

    function _exit(status) {
        __exit(status)
    }

    function ___syscall140(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD(),
                offset_high = SYSCALLS.get(),
                offset_low = SYSCALLS.get(),
                result = SYSCALLS.get(),
                whence = SYSCALLS.get();
            var offset = offset_low;
            assert(offset_high === 0);
            FS.llseek(stream, offset, whence);
            HEAP32[result >> 2] = stream.position;
            if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
            return 0
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno
        }
    }

    function ___syscall146(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.get(),
                iov = SYSCALLS.get(),
                iovcnt = SYSCALLS.get();
            var ret = 0;
            if (!___syscall146.buffer) ___syscall146.buffer = [];
            var buffer = ___syscall146.buffer;
            for (var i = 0; i < iovcnt; i++) {
                var ptr = HEAP32[iov + i * 8 >> 2];
                var len = HEAP32[iov + (i * 8 + 4) >> 2];
                for (var j = 0; j < len; j++) {
                    var curr = HEAPU8[ptr + j];
                    if (curr === 0 || curr === 10) {
                        Module["print"](UTF8ArrayToString(buffer, 0));
                        buffer.length = 0
                    } else {
                        buffer.push(curr)
                    }
                }
                ret += len
            }
            return ret
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno
        }
    }

    function ___syscall54(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            return 0
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno
        }
    }
    Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) {
        Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice)
    };
    Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
        Browser.requestAnimationFrame(func)
    };
    Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
        Browser.setCanvasSize(width, height, noUpdates)
    };
    Module["pauseMainLoop"] = function Module_pauseMainLoop() {
        Browser.mainLoop.pause()
    };
    Module["resumeMainLoop"] = function Module_resumeMainLoop() {
        Browser.mainLoop.resume()
    };
    Module["getUserMedia"] = function Module_getUserMedia() {
        Browser.getUserMedia()
    };
    Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
        return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes)
    };
    STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
    staticSealed = true;
    STACK_MAX = STACK_BASE + TOTAL_STACK;
    DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
    assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
    var cttz_i8 = allocate([8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0], "i8", ALLOC_DYNAMIC);

    function invoke_i(index) {
        try {
            return Module["dynCall_i"](index)
        } catch (e) {
            if (typeof e !== "number" && e !== "longjmp") throw e;
            asm["setThrew"](1, 0)
        }
    }

    function jsCall_i(index) {
        return Runtime.functionPointers[index]()
    }

    function invoke_ii(index, a1) {
        try {
            return Module["dynCall_ii"](index, a1)
        } catch (e) {
            if (typeof e !== "number" && e !== "longjmp") throw e;
            asm["setThrew"](1, 0)
        }
    }

    function jsCall_ii(index, a1) {
        return Runtime.functionPointers[index](a1)
    }

    function invoke_iiii(index, a1, a2, a3) {
        try {
            return Module["dynCall_iiii"](index, a1, a2, a3)
        } catch (e) {
            if (typeof e !== "number" && e !== "longjmp") throw e;
            asm["setThrew"](1, 0)
        }
    }

    function jsCall_iiii(index, a1, a2, a3) {
        return Runtime.functionPointers[index](a1, a2, a3)
    }

    function invoke_vi(index, a1) {
        try {
            Module["dynCall_vi"](index, a1)
        } catch (e) {
            if (typeof e !== "number" && e !== "longjmp") throw e;
            asm["setThrew"](1, 0)
        }
    }

    function jsCall_vi(index, a1) {
        Runtime.functionPointers[index](a1)
    }
    Module.asmGlobalArg = {
        "Math": Math,
        "Int8Array": Int8Array,
        "Int16Array": Int16Array,
        "Int32Array": Int32Array,
        "Uint8Array": Uint8Array,
        "Uint16Array": Uint16Array,
        "Uint32Array": Uint32Array,
        "Float32Array": Float32Array,
        "Float64Array": Float64Array,
        "NaN": NaN,
        "Infinity": Infinity
    };
    Module.asmLibraryArg = {
        "abort": abort,
        "assert": assert,
        "invoke_i": invoke_i,
        "jsCall_i": jsCall_i,
        "invoke_ii": invoke_ii,
        "jsCall_ii": jsCall_ii,
        "invoke_iiii": invoke_iiii,
        "jsCall_iiii": jsCall_iiii,
        "invoke_vi": invoke_vi,
        "jsCall_vi": jsCall_vi,
        "_pthread_cleanup_pop": _pthread_cleanup_pop,
        "_abort": _abort,
        "___setErrNo": ___setErrNo,
        "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing,
        "_sbrk": _sbrk,
        "_llvm_pow_f32": _llvm_pow_f32,
        "_emscripten_memcpy_big": _emscripten_memcpy_big,
        "__exit": __exit,
        "_pthread_self": _pthread_self,
        "___syscall140": ___syscall140,
        "___syscall54": ___syscall54,
        "___unlock": ___unlock,
        "_emscripten_set_main_loop": _emscripten_set_main_loop,
        "_sysconf": _sysconf,
        "___lock": ___lock,
        "___syscall6": ___syscall6,
        "_pthread_cleanup_push": _pthread_cleanup_push,
        "_time": _time,
        "_sqrt": _sqrt,
        "_exit": _exit,
        "___syscall146": ___syscall146,
        "_emscripten_asm_const_0": _emscripten_asm_const_0,
        "STACKTOP": STACKTOP,
        "STACK_MAX": STACK_MAX,
        "tempDoublePtr": tempDoublePtr,
        "ABORT": ABORT,
        "cttz_i8": cttz_i8
    }; // EMSCRIPTEN_START_ASM
    var asm = (function(global, env, buffer) {
        "use asm";
        var a = new global.Int8Array(buffer);
        var b = new global.Int16Array(buffer);
        var c = new global.Int32Array(buffer);
        var d = new global.Uint8Array(buffer);
        var e = new global.Uint16Array(buffer);
        var f = new global.Uint32Array(buffer);
        var g = new global.Float32Array(buffer);
        var h = new global.Float64Array(buffer);
        var i = env.STACKTOP | 0;
        var j = env.STACK_MAX | 0;
        var k = env.tempDoublePtr | 0;
        var l = env.ABORT | 0;
        var m = env.cttz_i8 | 0;
        var n = 0;
        var o = 0;
        var p = 0;
        var q = 0;
        var r = global.NaN,
            s = global.Infinity;
        var t = 0,
            u = 0,
            v = 0,
            w = 0,
            x = 0.0,
            y = 0,
            z = 0,
            A = 0,
            B = 0.0;
        var C = 0;
        var D = 0;
        var E = 0;
        var F = 0;
        var G = 0;
        var H = 0;
        var I = 0;
        var J = 0;
        var K = 0;
        var L = 0;
        var M = global.Math.floor;
        var N = global.Math.abs;
        var O = global.Math.sqrt;
        var P = global.Math.pow;
        var Q = global.Math.cos;
        var R = global.Math.sin;
        var S = global.Math.tan;
        var T = global.Math.acos;
        var U = global.Math.asin;
        var V = global.Math.atan;
        var W = global.Math.atan2;
        var X = global.Math.exp;
        var Y = global.Math.log;
        var Z = global.Math.ceil;
        var _ = global.Math.imul;
        var $ = global.Math.min;
        var aa = global.Math.clz32;
        var ba = env.abort;
        var ca = env.assert;
        var da = env.invoke_i;
        var ea = env.jsCall_i;
        var fa = env.invoke_ii;
        var ga = env.jsCall_ii;
        var ha = env.invoke_iiii;
        var ia = env.jsCall_iiii;
        var ja = env.invoke_vi;
        var ka = env.jsCall_vi;
        var la = env._pthread_cleanup_pop;
        var ma = env._abort;
        var na = env.___setErrNo;
        var oa = env._emscripten_set_main_loop_timing;
        var pa = env._sbrk;
        var qa = env._llvm_pow_f32;
        var ra = env._emscripten_memcpy_big;
        var sa = env.__exit;
        var ta = env._pthread_self;
        var ua = env.___syscall140;
        var va = env.___syscall54;
        var wa = env.___unlock;
        var xa = env._emscripten_set_main_loop;
        var ya = env._sysconf;
        var za = env.___lock;
        var Aa = env.___syscall6;
        var Ba = env._pthread_cleanup_push;
        var Ca = env._time;
        var Da = env._sqrt;
        var Ea = env._exit;
        var Fa = env.___syscall146;
        var Ga = env._emscripten_asm_const_0;
        var Ha = 0.0;
        // EMSCRIPTEN_START_FUNCS
        function Ma(a) {
            a = a | 0;
            var b = 0;
            b = i;
            i = i + a | 0;
            i = i + 15 & -16;
            return b | 0
        }

        function Na() {
            return i | 0
        }

        function Oa(a) {
            a = a | 0;
            i = a
        }

        function Pa(a, b) {
            a = a | 0;
            b = b | 0;
            i = a;
            j = b
        }

        function Qa(a, b) {
            a = a | 0;
            b = b | 0;
            if (!n) {
                n = a;
                o = b
            }
        }

        function Ra(b) {
            b = b | 0;
            a[k >> 0] = a[b >> 0];
            a[k + 1 >> 0] = a[b + 1 >> 0];
            a[k + 2 >> 0] = a[b + 2 >> 0];
            a[k + 3 >> 0] = a[b + 3 >> 0]
        }

        function Sa(b) {
            b = b | 0;
            a[k >> 0] = a[b >> 0];
            a[k + 1 >> 0] = a[b + 1 >> 0];
            a[k + 2 >> 0] = a[b + 2 >> 0];
            a[k + 3 >> 0] = a[b + 3 >> 0];
            a[k + 4 >> 0] = a[b + 4 >> 0];
            a[k + 5 >> 0] = a[b + 5 >> 0];
            a[k + 6 >> 0] = a[b + 6 >> 0];
            a[k + 7 >> 0] = a[b + 7 >> 0]
        }

        function Ta(a) {
            a = a | 0;
            C = a
        }

        function Ua() {
            return C | 0
        }

        function Va() {
            Ga(0);
            return
        }

        function Wa(b, c) {
            b = b | 0;
            c = c | 0;
            var d = 0;
            if (!c) return;
            else d = 0;
            do {
                a[b + d >> 0] = Ga(1) | 0;
                d = d + 1 | 0
            } while ((d | 0) != (c | 0));
            return
        }

        function Xa(a) {
            a = a | 0;
            var b = 0;
            b = Xc(16) | 0;
            c[b + 4 >> 2] = 0;
            c[b + 8 >> 2] = 2097152;
            c[b >> 2] = 0;
            c[b + 12 >> 2] = a;
            return b | 0
        }

        function Ya(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0;
            f = c[b + 8 >> 2] | 0;
            i = c[b + 4 >> 2] | 0;
            e = f + -1 ^ i;
            do
                if (!(e >>> 16))
                    if (!(e >>> 8)) {
                        e = a[9279 + e >> 0] | 0;
                        break
                    } else {
                        e = (a[9279 + (e >>> 8) >> 0] | 0) + 8 | 0;
                        break
                    } else
            if (!(e >>> 24)) {
                e = (a[9279 + (e >>> 16) >> 0] | 0) + 16 | 0;
                break
            } else {
                e = (a[9279 + (e >>> 24) >> 0] | 0) + 24 | 0;
                break
            }
            while (0);
            g = 21 - e | 0;
            e = f + -1 - i | 0;
            do
                if (!(e >>> 16))
                    if (!(e >>> 8)) {
                        e = a[9279 + e >> 0] | 0;
                        break
                    } else {
                        e = (a[9279 + (e >>> 8) >> 0] | 0) + 8 | 0;
                        break
                    } else
            if (!(e >>> 24)) {
                e = (a[9279 + (e >>> 16) >> 0] | 0) + 16 | 0;
                break
            } else {
                e = (a[9279 + (e >>> 24) >> 0] | 0) + 24 | 0;
                break
            }
            while (0);
            j = 21 - e + -1 | 0;
            h = (g | 0) > (j | 0) ? j : g;
            if ((h | 0) > 0) {
                if (!d) {
                    g = b;
                    e = i
                } else {
                    c[b + 4 >> 2] = i & -1048577;
                    ub(i >>> 20, c[b + 12 >> 2] | 0);
                    vb(1 - (i >>> 20) | 0, c[b >> 2] | 0, c[b + 12 >> 2] | 0);
                    tb((c[b + 4 >> 2] | 0) >>> (21 - h | 0), h + -1 | 0, c[b + 12 >> 2] | 0);
                    f = c[b + 8 >> 2] | 0;
                    g = b;
                    e = c[b + 4 >> 2] | 0
                }
                c[g >> 2] = 0
            } else e = i;
            f = f << j & 2097151;
            f = (f | 0) == 0 ? 2097152 : f;
            c[b + 8 >> 2] = f;
            e = e << j & 2097151;
            c[b + 4 >> 2] = e;
            if ((j - h | 0) <= 0) return j | 0;
            c[b + 8 >> 2] = f ^ 1048576;
            c[b + 4 >> 2] = e ^ 1048576;
            c[b >> 2] = (c[b >> 2] | 0) + (j - h);
            return j | 0
        }

        function Za(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0;
            g = (c[d + 8 >> 2] | 0) - (c[d + 4 >> 2] | 0) | 0;
            qb((c[d >> 2] | 0) + 21 | 0, c[d + 12 >> 2] | 0);
            if ((c[b + 4 >> 2] | 0) >>> 0 > a >>> 0) {
                f = c[b >> 2] | 0;
                b = c[b + 8 >> 2] | 0;
                h = (_(c[b + (a + 1 - f << 2) >> 2] | 0, g) | 0) >>> 11;
                e = c[d + 4 >> 2] | 0;
                c[d + 8 >> 2] = h + e
            } else {
                f = c[b >> 2] | 0;
                b = c[b + 8 >> 2] | 0;
                e = c[d + 4 >> 2] | 0
            }
            c[d + 4 >> 2] = ((_(c[b + (a - f << 2) >> 2] | 0, g) | 0) >>> 11) + e;
            return Ya(d, 1) | 0
        }

        function _a(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0;
            f = (c[d + 8 >> 2] | 0) - (c[d + 4 >> 2] | 0) | 0;
            qb((c[d >> 2] | 0) + 21 | 0, c[d + 12 >> 2] | 0);
            a = _(f, a) | 0;
            e = c[d + 4 >> 2] | 0;
            c[d + 8 >> 2] = (((a + f | 0) >>> 0) / (b >>> 0) | 0) + e;
            c[d + 4 >> 2] = e + ((a >>> 0) / (b >>> 0) | 0);
            return Ya(d, 1) | 0
        }

        function $a(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0;
            k = (c[d + 8 >> 2] | 0) - (c[d + 4 >> 2] | 0) | 0;
            h = (c[d >> 2] | 0) == 0;
            g = rb(21, c[d + 12 >> 2] | 0) | 0;
            g = h ? g : g ^ 1048576;
            pb(21, c[d + 12 >> 2] | 0);
            h = c[d + 4 >> 2] | 0;
            i = c[a >> 2] | 0;
            j = c[a + 8 >> 2] | 0;
            f = c[a + 4 >> 2] | 0;
            if ((f | 0) == (i | 0)) a = 0;
            else {
                a = 0;
                e = 1 - i + f | 0;
                do {
                    l = (a + e | 0) / 2 | 0;
                    m = (c[j + (l << 2) >> 2] | 0) >>> 0 > ((g - h << 11 >>> 0) / (k >>> 0) | 0) >>> 0;
                    a = m ? a : l;
                    e = m ? l : e
                } while ((e - a | 0) != 1)
            }
            a = a + i | 0;
            do
                if (a >>> 0 < f >>> 0) {
                    e = ((_(c[j + (a + 1 - i << 2) >> 2] | 0, k) | 0) >>> 11) + h | 0;
                    if (g >>> 0 < e >>> 0) {
                        c[d + 8 >> 2] = e;
                        break
                    }
                    if ((a + 1 | 0) >>> 0 < f >>> 0) {
                        c[d + 8 >> 2] = ((_(c[j + (a + 2 - i << 2) >> 2] | 0, k) | 0) >>> 11) + h;
                        a = a + 1 | 0
                    } else a = a + 1 | 0
                }
            while (0);
            c[d + 4 >> 2] = ((_(c[j + (a - i << 2) >> 2] | 0, k) | 0) >>> 11) + h;
            m = Ya(d, 0) | 0;
            sb(m, c[d + 12 >> 2] | 0);
            c[b >> 2] = a;
            return m | 0
        }

        function ab(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0;
            g = (c[d + 8 >> 2] | 0) - (c[d + 4 >> 2] | 0) | 0;
            i = (c[d >> 2] | 0) == 0;
            h = rb(21, c[d + 12 >> 2] | 0) | 0;
            h = i ? h : h ^ 1048576;
            pb(21, c[d + 12 >> 2] | 0);
            i = c[d + 4 >> 2] | 0;
            e = ((_(h - i | 0, a) | 0) >>> 0) / (g >>> 0) | 0;
            f = _(e, g) | 0;
            if (h >>> 0 < ((((f + g | 0) >>> 0) / (a >>> 0) | 0) + i | 0) >>> 0) h = (((f + g | 0) >>> 0) / (a >>> 0) | 0) + i | 0;
            else {
                e = e + 1 | 0;
                h = (((f + g + g | 0) >>> 0) / (a >>> 0) | 0) + i | 0;
                f = f + g | 0
            }
            c[d + 8 >> 2] = h;
            c[d + 4 >> 2] = i + ((f >>> 0) / (a >>> 0) | 0);
            a = Ya(d, 0) | 0;
            sb(a, c[d + 12 >> 2] | 0);
            c[b >> 2] = e;
            return a | 0
        }

        function bb(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0;
            e = Xc(32) | 0;
            c[e + 12 >> 2] = b;
            c[e + 16 >> 2] = d;
            c[e + 20 >> 2] = (d + -1 | 0) / 8 | 0;
            a[e + 8 >> 0] = -1 << (0 - d & 7);
            c[e + 24 >> 2] = -1;
            c[e + 4 >> 2] = 0;
            c[e >> 2] = 0;
            c[e + 28 >> 2] = 0;
            return e | 0
        }

        function cb(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0;
            e = Xc(32) | 0;
            c[e + 12 >> 2] = b;
            c[e + 16 >> 2] = d;
            c[e + 20 >> 2] = (d + -1 | 0) / 8 | 0;
            a[e + 8 >> 0] = -1 << (0 - d & 7);
            c[e + 24 >> 2] = -1;
            c[e + 4 >> 2] = 0;
            c[e >> 2] = 32;
            c[e + 28 >> 2] = 0;
            return e | 0
        }

        function db(b) {
            b = b | 0;
            var d = 0,
                e = 0,
                f = 0,
                g = 0;
            e = c[b + 4 >> 2] << 8;
            c[b + 4 >> 2] = e;
            f = c[b + 24 >> 2] | 0;
            c[b + 24 >> 2] = f + 1;
            g = c[b + 20 >> 2] | 0;
            if ((f + 1 | 0) >= (g | 0))
                if ((f + 1 | 0) == (g | 0)) d = a[b + 8 >> 0] & a[(c[b + 12 >> 2] | 0) + (f + 1) >> 0];
                else d = 0;
            else d = a[(c[b + 12 >> 2] | 0) + (f + 1) >> 0] | 0;
            e = (e | d & 255) << 8;
            c[b + 4 >> 2] = e;
            c[b + 24 >> 2] = f + 2;
            if ((f + 2 | 0) >= (g | 0))
                if ((f + 2 | 0) == (g | 0)) d = a[b + 8 >> 0] & a[(c[b + 12 >> 2] | 0) + g >> 0];
                else d = 0;
            else d = a[(c[b + 12 >> 2] | 0) + (f + 2) >> 0] | 0;
            e = (e | d & 255) << 8;
            c[b + 4 >> 2] = e;
            c[b + 24 >> 2] = f + 3;
            if ((f + 3 | 0) >= (g | 0))
                if ((f + 3 | 0) == (g | 0)) d = a[b + 8 >> 0] & a[(c[b + 12 >> 2] | 0) + g >> 0];
                else d = 0;
            else d = a[(c[b + 12 >> 2] | 0) + (f + 3) >> 0] | 0;
            d = (e | d & 255) << 8;
            c[b + 4 >> 2] = d;
            c[b + 24 >> 2] = f + 4;
            if ((f + 4 | 0) < (g | 0)) {
                g = a[(c[b + 12 >> 2] | 0) + (f + 4) >> 0] | 0;
                g = g & 255;
                g = d | g;
                c[b + 4 >> 2] = g;
                c[b >> 2] = 32;
                return
            }
            if ((f + 4 | 0) != (g | 0)) {
                g = 0;
                g = g & 255;
                g = d | g;
                c[b + 4 >> 2] = g;
                c[b >> 2] = 32;
                return
            }
            g = a[b + 8 >> 0] & a[(c[b + 12 >> 2] | 0) + g >> 0];
            g = g & 255;
            g = d | g;
            c[b + 4 >> 2] = g;
            c[b >> 2] = 32;
            return
        }

        function eb(b) {
            b = b | 0;
            var e = 0,
                f = 0,
                g = 0;
            g = (c[b + 4 >> 2] | 0) >>> 24 & 255;
            e = (c[b + 24 >> 2] | 0) + 1 | 0;
            c[b + 24 >> 2] = e;
            f = c[b + 20 >> 2] | 0;
            if ((e | 0) < (f | 0)) {
                a[(c[b + 12 >> 2] | 0) + e >> 0] = g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            if ((e | 0) == (f | 0)) {
                e = (c[b + 12 >> 2] | 0) + f | 0;
                a[e >> 0] = (d[e >> 0] | 0) & ((d[b + 8 >> 0] | 0) ^ 255);
                e = (c[b + 12 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
                a[e >> 0] = a[e >> 0] ^ a[b + 8 >> 0] & g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            g = (c[b + 4 >> 2] | 0) >>> 16 & 255;
            e = e + 1 | 0;
            c[b + 24 >> 2] = e;
            if ((e | 0) < (f | 0)) {
                a[(c[b + 12 >> 2] | 0) + e >> 0] = g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            if ((e | 0) == (f | 0)) {
                e = (c[b + 12 >> 2] | 0) + f | 0;
                a[e >> 0] = (d[e >> 0] | 0) & ((d[b + 8 >> 0] | 0) ^ 255);
                e = (c[b + 12 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
                a[e >> 0] = a[e >> 0] ^ a[b + 8 >> 0] & g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            g = (c[b + 4 >> 2] | 0) >>> 8 & 255;
            e = e + 1 | 0;
            c[b + 24 >> 2] = e;
            if ((e | 0) < (f | 0)) {
                a[(c[b + 12 >> 2] | 0) + e >> 0] = g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            if ((e | 0) == (f | 0)) {
                e = (c[b + 12 >> 2] | 0) + f | 0;
                a[e >> 0] = (d[e >> 0] | 0) & ((d[b + 8 >> 0] | 0) ^ 255);
                e = (c[b + 12 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
                a[e >> 0] = a[e >> 0] ^ a[b + 8 >> 0] & g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            g = c[b + 4 >> 2] & 255;
            e = e + 1 | 0;
            c[b + 24 >> 2] = e;
            if ((e | 0) < (f | 0)) {
                a[(c[b + 12 >> 2] | 0) + e >> 0] = g;
                e = c[b + 24 >> 2] | 0;
                f = c[b + 20 >> 2] | 0
            }
            if ((e | 0) != (f | 0)) {
                c[b + 4 >> 2] = 0;
                c[b >> 2] = 32;
                return
            }
            f = (c[b + 12 >> 2] | 0) + f | 0;
            a[f >> 0] = (d[f >> 0] | 0) & ((d[b + 8 >> 0] | 0) ^ 255);
            f = (c[b + 12 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
            a[f >> 0] = a[f >> 0] ^ a[b + 8 >> 0] & g;
            c[b + 4 >> 2] = 0;
            c[b >> 2] = 32;
            return
        }

        function fb(b) {
            b = b | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0;
            e = c[b >> 2] | 0;
            if ((e | 0) > 24) f = 24;
            else {
                f = 24;
                do {
                    h = (c[b + 4 >> 2] | 0) >>> f & 255;
                    e = (c[b + 24 >> 2] | 0) + 1 | 0;
                    c[b + 24 >> 2] = e;
                    g = c[b + 20 >> 2] | 0;
                    if ((e | 0) < (g | 0)) {
                        a[(c[b + 12 >> 2] | 0) + e >> 0] = h;
                        e = c[b + 24 >> 2] | 0;
                        g = c[b + 20 >> 2] | 0
                    }
                    if ((e | 0) == (g | 0)) {
                        k = (c[b + 12 >> 2] | 0) + g | 0;
                        a[k >> 0] = (d[k >> 0] | 0) & ((d[b + 8 >> 0] | 0) ^ 255);
                        k = (c[b + 12 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
                        a[k >> 0] = a[k >> 0] ^ a[b + 8 >> 0] & h
                    }
                    f = f + -8 | 0;
                    e = c[b >> 2] | 0
                } while ((e | 0) <= (f | 0))
            }
            h = e - f | 0;
            c[b >> 2] = h;
            if ((h | 0) >= 8) {
                c[b + 4 >> 2] = 0;
                c[b >> 2] = 32;
                return
            }
            i = -1 << h & (c[b + 4 >> 2] | 0) >>> f;
            c[b + 4 >> 2] = i;
            j = (c[b + 24 >> 2] | 0) + 1 | 0;
            c[b + 24 >> 2] = j;
            k = c[b + 20 >> 2] | 0;
            if ((j | 0) >= (k | 0))
                if ((j | 0) == (k | 0)) g = a[b + 8 >> 0] & a[(c[b + 12 >> 2] | 0) + j >> 0];
                else g = 0;
            else g = a[(c[b + 12 >> 2] | 0) + j >> 0] | 0;
            g = ((e | 0) == (f | 0) ? 0 : (1 << h) + 255 | 0) & (g & 255) ^ i;
            c[b + 4 >> 2] = g;
            c[b + 24 >> 2] = j;
            if ((j | 0) < (k | 0)) {
                a[(c[b + 12 >> 2] | 0) + j >> 0] = g;
                f = c[b + 24 >> 2] | 0;
                e = c[b + 20 >> 2] | 0
            } else {
                f = j;
                e = k
            }
            if ((f | 0) != (e | 0)) {
                c[b + 4 >> 2] = 0;
                c[b >> 2] = 32;
                return
            }
            k = (c[b + 12 >> 2] | 0) + e | 0;
            a[k >> 0] = (d[k >> 0] | 0) & ((d[b + 8 >> 0] | 0) ^ 255);
            k = (c[b + 12 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
            a[k >> 0] = a[k >> 0] ^ a[b + 8 >> 0] & (g & 255);
            c[b + 4 >> 2] = 0;
            c[b >> 2] = 32;
            return
        }

        function gb(a) {
            a = a | 0;
            Yc(a);
            return
        }

        function hb(a) {
            a = a | 0;
            fb(a);
            Yc(a);
            return
        }

        function ib(a) {
            a = a | 0;
            return (c[a + 16 >> 2] | 0) - (c[a + 28 >> 2] | 0) | 0
        }

        function jb(a) {
            a = a | 0;
            return (c[a + 16 >> 2] | 0) - (c[a + 28 >> 2] | 0) | 0
        }

        function kb(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0;
            c[b + 24 >> 2] = (d | 0) / 8 | 0;
            e = c[b + 20 >> 2] | 0;
            if (((d | 0) / 8 | 0 | 0) >= (e | 0))
                if (((d | 0) / 8 | 0 | 0) == (e | 0)) e = a[b + 8 >> 0] & a[(c[b + 12 >> 2] | 0) + ((d | 0) / 8 | 0) >> 0];
                else e = 0;
            else e = a[(c[b + 12 >> 2] | 0) + ((d | 0) / 8 | 0) >> 0] | 0;
            c[b + 4 >> 2] = e & 255;
            c[b >> 2] = 8 - ((d | 0) % 8 | 0);
            return
        }

        function lb(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0;
            d = (c[b + 16 >> 2] | 0) + d | 0;
            c[b + 16 >> 2] = d;
            c[b + 20 >> 2] = (d + -1 | 0) / 8 | 0;
            a[b + 8 >> 0] = -1 << (0 - d & 7);
            e = (c[b + 24 >> 2] << 3) + 8 - (c[b >> 2] | 0) | 0;
            c[b + 24 >> 2] = (e | 0) / 8 | 0;
            if (((e | 0) / 8 | 0 | 0) >= ((d + -1 | 0) / 8 | 0 | 0))
                if (((e | 0) / 8 | 0 | 0) == ((d + -1 | 0) / 8 | 0 | 0)) d = -1 << (0 - d & 7) & 255 & a[(c[b + 12 >> 2] | 0) + ((d + -1 | 0) / 8 | 0) >> 0];
                else d = 0;
            else d = a[(c[b + 12 >> 2] | 0) + ((e | 0) / 8 | 0) >> 0] | 0;
            c[b + 4 >> 2] = d & 255;
            c[b >> 2] = 8 - ((e | 0) % 8 | 0);
            return
        }

        function mb(a, b) {
            a = a | 0;
            b = b | 0;
            fb(a);
            c[a + 24 >> 2] = ((b | 0) / 8 | 0) + -1;
            c[a >> 2] = 32 - ((b | 0) % 8 | 0);
            if (!((b | 0) % 8 | 0)) {
                c[a + 4 >> 2] = 0;
                return
            } else {
                c[a + 4 >> 2] = -1 << 32 - ((b | 0) % 8 | 0) & (d[(c[a + 12 >> 2] | 0) + ((b | 0) / 8 | 0) >> 0] | 0) << 24;
                return
            }
        }

        function nb(b, d) {
            b = b | 0;
            d = d | 0;
            d = (c[b + 16 >> 2] | 0) + d | 0;
            c[b + 16 >> 2] = d;
            c[b + 20 >> 2] = (d + -1 | 0) / 8 | 0;
            a[b + 8 >> 0] = -1 << (0 - d & 7);
            return
        }

        function ob(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0,
                e = 0;
            d = c[b >> 2] | 0;
            if ((d | 0) < (a | 0)) {
                e = (c[b + 4 >> 2] & ((d | 0) == 0 ? 0 : (1 << d) + -1 | 0)) << a - d;
                db(b);
                a = a - d | 0;
                d = c[b >> 2] | 0
            } else e = 0;
            d = d - a | 0;
            c[b >> 2] = d;
            return (c[b + 4 >> 2] | 0) >>> d & ((a | 0) == 0 ? 0 : (1 << a) + -1 | 0) ^ e | 0
        }

        function pb(a, b) {
            a = a | 0;
            b = b | 0;
            c[b + 28 >> 2] = a + 8 + (c[b + 24 >> 2] << 3) - (c[b >> 2] | 0);
            return
        }

        function qb(a, b) {
            a = a | 0;
            b = b | 0;
            c[b + 28 >> 2] = a + 40 + (c[b + 24 >> 2] << 3) - (c[b >> 2] | 0);
            return
        }

        function rb(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0;
            f = c[d >> 2] | 0;
            e = c[d + 4 >> 2] | 0;
            if ((f | 0) >= (b | 0)) {
                d = f;
                i = e;
                d = d - b | 0;
                d = i >>> d;
                i = (b | 0) == 0;
                b = 1 << b;
                b = b + -1 | 0;
                b = i ? 0 : b;
                b = d & b;
                return b | 0
            }
            h = c[d + 20 >> 2] | 0;
            i = c[d + 24 >> 2] | 0;
            do {
                g = e << 8;
                c[d + 4 >> 2] = g;
                i = i + 1 | 0;
                c[d + 24 >> 2] = i;
                if ((i | 0) >= (h | 0))
                    if ((i | 0) == (h | 0)) e = a[d + 8 >> 0] & a[(c[d + 12 >> 2] | 0) + h >> 0];
                    else e = 0;
                else e = a[(c[d + 12 >> 2] | 0) + i >> 0] | 0;
                e = g | e & 255;
                c[d + 4 >> 2] = e;
                f = f + 8 | 0;
                c[d >> 2] = f
            } while ((f | 0) < (b | 0));
            d = f - b | 0;
            d = e >>> d;
            i = (b | 0) == 0;
            b = 1 << b;
            b = b + -1 | 0;
            b = i ? 0 : b;
            b = d & b;
            return b | 0
        }

        function sb(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0;
            d = c[b >> 2] | 0;
            if ((d | 0) < (a | 0)) {
                db(b);
                a = a - d | 0;
                d = c[b >> 2] | 0
            }
            c[b >> 2] = d - a;
            return
        }

        function tb(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0;
            e = c[d >> 2] | 0;
            if ((e | 0) < (b | 0)) {
                c[d + 4 >> 2] = c[d + 4 >> 2] ^ a >>> (b - e | 0);
                eb(d);
                a = ((e | 0) == (b | 0) ? 0 : (1 << b - e) + -1 | 0) & a;
                b = b - e | 0;
                f = d + 4 | 0;
                e = c[d >> 2] | 0
            } else f = d + 4 | 0;
            b = e - b | 0;
            c[d >> 2] = b;
            c[f >> 2] = a << b ^ c[f >> 2];
            return
        }

        function ub(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0;
            d = c[b >> 2] | 0;
            if ((d | 0) < 1) {
                eb(b);
                d = c[b >> 2] | 0
            }
            d = d + -1 | 0;
            c[b >> 2] = d;
            c[b + 4 >> 2] = a << d ^ c[b + 4 >> 2];
            return
        }

        function vb(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0;
            e = c[d >> 2] | 0;
            if ((e | 0) < 1) {
                eb(d);
                g = c[d >> 2] | 0
            } else g = e;
            if ((g | 0) < (b | 0)) {
                c[d + 4 >> 2] = c[d + 4 >> 2] ^ ((a | 0) != 0) << 31 >> 31 >>> (32 - g | 0);
                e = b - g | 0;
                eb(d);
                if (e >>> 0 > 32) {
                    f = b + -33 - g & -32;
                    do {
                        c[d + 4 >> 2] = ((a | 0) != 0) << 31 >> 31;
                        e = e + -32 | 0;
                        eb(d)
                    } while (e >>> 0 > 32);
                    e = b + -32 - g - f | 0
                }
            } else e = b;
            if ((e | 0) <= 0) return;
            b = (c[d >> 2] | 0) - e | 0;
            c[d >> 2] = b;
            c[d + 4 >> 2] = ((a | 0) != 0) << 31 >> 31 >>> (32 - e | 0) << b ^ c[d + 4 >> 2];
            return
        }

        function wb(a) {
            a = a | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0;
            k = i;
            i = i + 96 | 0;
            e = k;
            f = e + 92 | 0;
            do {
                c[e >> 2] = 0;
                e = e + 4 | 0
            } while ((e | 0) < (f | 0));
            j = Ub(59) | 0;
            e = c[1217] | 0;
            h = 0;
            do {
                if ((d[a + ((h | 0) / 8 | 0) >> 0] | 0) & 1 << (h & 7)) {
                    f = h * 23 | 0;
                    g = 0;
                    do {
                        l = k + (g << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[e + (g + f << 2) >> 2];
                        g = g + 1 | 0
                    } while ((g | 0) != 23)
                }
                h = h + 1 | 0
            } while ((h | 0) != 4096);
            g = c[j + 8 >> 2] | 0;
            h = 0;
            do {
                f = h * 12 | 0;
                e = (c[k + (f >>> 5 << 2) >> 2] | 0) >>> (f & 28);
                if (((f & 28) + 12 | 0) >>> 0 > 32) e = c[k + ((f >>> 5) + 1 << 2) >> 2] << 32 - (f & 28) ^ e & 65535;
                b[g + (h << 1) >> 1] = e & 4095;
                h = h + 1 | 0
            } while ((h | 0) != 60);
            Xb(j) | 0;
            i = k;
            return j | 0
        }

        function xb(a, d, f, g, h, i) {
            a = a | 0;
            d = d | 0;
            f = f | 0;
            g = g | 0;
            h = h | 0;
            i = i | 0;
            var j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0;
            switch (d | 0) {
                case 1:
                    {
                        j = c[a + 8 >> 2] | 0;
                        k = b[j >> 1] | 0;
                        if (!(k << 16 >> 16)) j = 0;
                        else {
                            f = c[1280] | 0;
                            j = (e[f + ((k & 65535) << 1) >> 1] | 0) - (e[f + ((e[j + 2 >> 1] | 0) << 1) >> 1] | 0) | 0;
                            j = b[(c[1283] | 0) + ((j & c[1281]) + (j >> c[1282]) << 1) >> 1] | 0
                        }
                        b[i >> 1] = j;
                        i = 1;
                        return i | 0
                    }
                case 0:
                    {
                        i = 0;
                        return i | 0
                    }
                default:
                    {
                        if ((h | 0) > 11) {
                            i = 0;
                            return i | 0
                        }
                        j = c[g + (h << 2) >> 2] | 0;
                        if (j) {
                            v = j;
                            v = ac(v, a) | 0;
                            a = bc(a, v) | 0;
                            t = c[v >> 2] | 0;
                            u = h + 1 | 0;
                            h = xb(v, t, f, g, u, i) | 0;
                            d = d - t | 0;
                            i = i + (h << 1) | 0;
                            i = xb(a, d, f, g, u, i) | 0;
                            i = i + h | 0;
                            Wb(v);
                            Wb(a);
                            return i | 0
                        }
                        p = Ub(59) | 0;
                        c[g + (h << 2) >> 2] = p;
                        q = c[1283] | 0;
                        r = c[p + 8 >> 2] | 0;
                        s = c[1280] | 0;
                        t = c[1281] | 0;
                        u = c[1282] | 0;
                        j = b[q + (h << 1) >> 1] | 0;
                        v = 0;
                        while (1) {
                            n = c[(c[f + (v << 2) >> 2] | 0) + 8 >> 2] | 0;
                            o = j << 16 >> 16 == 0;
                            k = s + ((j & 65535) << 1) | 0;
                            if (!o) {
                                m = 0;
                                do {
                                    l = r + (m << 1) | 0;
                                    j = b[n + (m << 1) >> 1] | 0;
                                    if (!(j << 16 >> 16)) j = 0;
                                    else {
                                        j = (e[k >> 1] | 0) + (e[s + ((j & 65535) << 1) >> 1] | 0) | 0;
                                        j = e[q + ((j & t) + (j >>> u) << 1) >> 1] | 0
                                    }
                                    b[l >> 1] = j ^ (e[l >> 1] | 0);
                                    m = m + 1 | 0
                                } while ((m | 0) != 60);
                                if (!o) {
                                    j = (e[k >> 1] | 0) << 1;
                                    j = e[q + ((j & t) + (j >>> u) << 1) >> 1] | 0
                                } else j = 0
                            } else j = 0;
                            v = v + 1 | 0;
                            if ((v | 0) == 12) break;
                            else j = j & 65535
                        }
                        Xb(p) | 0;
                        v = c[g + (h << 2) >> 2] | 0;
                        v = ac(v, a) | 0;
                        a = bc(a, v) | 0;
                        t = c[v >> 2] | 0;
                        u = h + 1 | 0;
                        h = xb(v, t, f, g, u, i) | 0;
                        d = d - t | 0;
                        i = i + (h << 1) | 0;
                        i = xb(a, d, f, g, u, i) | 0;
                        i = i + h | 0;
                        Wb(v);
                        Wb(a);
                        return i | 0
                    }
            }
            return 0
        }

        function yb(a, d) {
            a = a | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0;
            k = Xc(240) | 0;
            l = Xc(48) | 0;
            m = Xc(48) | 0;
            e = 0;
            do {
                c[k + (e << 2) >> 2] = Ub(61) | 0;
                e = e + 1 | 0
            } while ((e | 0) != 60);
            c[l >> 2] = Ub(59) | 0;
            g = Ub(59) | 0;
            c[l + 4 >> 2] = g;
            c[l + 8 >> 2] = Ub(59) | 0;
            c[l + 12 >> 2] = Ub(59) | 0;
            c[l + 16 >> 2] = Ub(59) | 0;
            c[l + 20 >> 2] = Ub(59) | 0;
            c[l + 24 >> 2] = Ub(59) | 0;
            c[l + 28 >> 2] = Ub(59) | 0;
            c[l + 32 >> 2] = Ub(59) | 0;
            c[l + 36 >> 2] = Ub(59) | 0;
            c[l + 40 >> 2] = Ub(59) | 0;
            c[l + 44 >> 2] = Ub(59) | 0;
            e = m;
            f = e + 48 | 0;
            do {
                c[e >> 2] = 0;
                e = e + 4 | 0
            } while ((e | 0) < (f | 0));
            _b(a, k);
            e = c[l >> 2] | 0;
            b[(c[e + 8 >> 2] | 0) + 2 >> 1] = 1;
            c[e >> 2] = 1;
            j = Ub(59) | 0;
            c[m >> 2] = j;
            b[(c[j + 8 >> 2] | 0) + 2 >> 1] = 1;
            f = 1;
            while (1) {
                $b(g, e, k, 60);
                g = c[j + 8 >> 2] | 0;
                e = c[l + (f << 2) >> 2] | 0;
                h = c[e + 8 >> 2] | 0;
                i = 0;
                do {
                    n = g + (i << 1) | 0;
                    b[n >> 1] = b[h + (i << 1) >> 1] ^ b[n >> 1];
                    i = i + 1 | 0
                } while ((i | 0) != 60);
                f = f + 1 | 0;
                if ((f | 0) == 12) break;
                g = c[l + (f << 2) >> 2] | 0
            }
            Xb(j) | 0;
            e = 0;
            do {
                Wb(c[k + (e << 2) >> 2] | 0);
                e = e + 1 | 0
            } while ((e | 0) != 60);
            Yc(k);
            f = xb(a, 60, l, m, 0, d) | 0;
            Wb(c[l >> 2] | 0);
            Wb(c[l + 4 >> 2] | 0);
            Wb(c[l + 8 >> 2] | 0);
            Wb(c[l + 12 >> 2] | 0);
            Wb(c[l + 16 >> 2] | 0);
            Wb(c[l + 20 >> 2] | 0);
            Wb(c[l + 24 >> 2] | 0);
            Wb(c[l + 28 >> 2] | 0);
            Wb(c[l + 32 >> 2] | 0);
            Wb(c[l + 36 >> 2] | 0);
            Wb(c[l + 40 >> 2] | 0);
            Wb(c[l + 44 >> 2] | 0);
            Yc(l);
            e = c[m >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 4 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 8 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 12 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 16 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 20 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 24 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 28 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 32 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 36 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 40 >> 2] | 0;
            if (e) Wb(e);
            e = c[m + 44 >> 2] | 0;
            if (!e) {
                Yc(m);
                return f | 0
            }
            Wb(e);
            Yc(m);
            return f | 0
        }

        function zb(a, b, d, e, f) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0;
            if ((d + -1 | 0) <= (b | 0)) return;
            while (1) {
                k = e;
                e = (e + f | 0) / 2 | 0;
                if ((b | 0) < (d | 0)) {
                    g = b;
                    j = b;
                    do {
                        h = a + (j << 2) | 0;
                        i = c[h >> 2] | 0;
                        if ((i | 0) <= (e | 0)) {
                            l = a + (g << 2) | 0;
                            c[h >> 2] = c[l >> 2];
                            c[l >> 2] = i;
                            g = g + 1 | 0
                        }
                        j = j + 1 | 0
                    } while ((j | 0) != (d | 0))
                } else g = b;
                zb(a, b, g, k, e);
                if ((d + -1 | 0) <= (g | 0)) break;
                else b = g
            }
            return
        }

        function Ab(a, d) {
            a = a | 0;
            d = d | 0;
            var f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0;
            s = i;
            i = i + 144 | 0;
            Mb(12) | 0;
            q = wb(a) | 0;
            dc(s + 4 | 0, s, q, c[1219] | 0, 1);
            f = c[s + 4 >> 2] | 0;
            m = c[f >> 2] | 0;
            if ((m | 0) < 0) a = c[s >> 2] | 0;
            else {
                n = c[1283] | 0;
                o = c[1281] | 0;
                p = c[1280] | 0;
                a = c[s >> 2] | 0;
                g = c[f + 8 >> 2] | 0;
                h = p + ((e[n + (o - (e[p + ((e[c[a + 8 >> 2] >> 1] | 0) << 1) >> 1] | 0) << 1) >> 1] | 0) << 1) | 0;
                j = c[1282] | 0;
                l = 0;
                while (1) {
                    k = g + (l << 1) | 0;
                    f = b[k >> 1] | 0;
                    if (!(f << 16 >> 16)) f = 0;
                    else {
                        f = (e[p + ((f & 65535) << 1) >> 1] | 0) + (e[h >> 1] | 0) | 0;
                        f = e[n + ((f & o) + (f >>> j) << 1) >> 1] | 0
                    }
                    b[k >> 1] = f;
                    if ((l | 0) < (m | 0)) l = l + 1 | 0;
                    else break
                }
            }
            Wb(a);
            Wb(q);
            k = (c[(c[s + 4 >> 2] | 0) + 8 >> 2] | 0) + 2 | 0;
            b[k >> 1] = (e[k >> 1] | 0) ^ 1;
            k = Ub(59) | 0;
            l = c[(c[s + 4 >> 2] | 0) + 8 >> 2] | 0;
            m = c[1280] | 0;
            n = c[1282] | 0;
            o = c[1281] | 0;
            p = c[1283] | 0;
            q = 0;
            do {
                a = b[l + (q << 1) >> 1] | 0;
                do
                    if (a << 16 >> 16 != 0 ? (r = (e[m + ((a & 65535) << 1) >> 1] | 0) << n + -1, r = b[p + ((r & o) + (r >> n) << 1) >> 1] | 0, r << 16 >> 16 != 0) : 0) {
                        if (!(q & 1)) {
                            j = (c[k + 8 >> 2] | 0) + (((q | 0) / 2 | 0) << 1) | 0;
                            b[j >> 1] = b[j >> 1] ^ r;
                            break
                        }
                        f = c[k + 8 >> 2] | 0;
                        g = c[(c[4880 + (q << 2) >> 2] | 0) + 8 >> 2] | 0;
                        j = 0;
                        do {
                            h = f + (j << 1) | 0;
                            a = b[g + (j << 1) >> 1] | 0;
                            if (!(a << 16 >> 16)) a = 0;
                            else {
                                a = (e[m + ((a & 65535) << 1) >> 1] | 0) + (e[m + ((r & 65535) << 1) >> 1] | 0) | 0;
                                a = e[p + ((a & o) + (a >>> n) << 1) >> 1] | 0
                            }
                            b[h >> 1] = a ^ (e[h >> 1] | 0);
                            j = j + 1 | 0
                        } while ((j | 0) != 60)
                    }
                while (0);
                q = q + 1 | 0
            } while ((q | 0) != 60);
            Xb(k) | 0;
            Wb(c[s + 4 >> 2] | 0);
            dc(s + 8 | 0, s + 12 | 0, k, c[1219] | 0, 31);
            Wb(k);
            p = Ub(60) | 0;
            o = c[s + 12 >> 2] | 0;
            g = c[o >> 2] | 0;
            if ((g | 0) >= 0) {
                h = c[p + 8 >> 2] | 0;
                j = c[1280] | 0;
                k = c[1281] | 0;
                l = c[1282] | 0;
                m = c[1283] | 0;
                f = c[o + 8 >> 2] | 0;
                n = 0;
                while (1) {
                    a = b[f + (n << 1) >> 1] | 0;
                    if (!(a << 16 >> 16)) a = 0;
                    else {
                        a = (e[j + ((a & 65535) << 1) >> 1] | 0) << 1;
                        a = e[m + ((a & k) + (a >>> l) << 1) >> 1] | 0
                    }
                    b[h + (n << 1 << 1) >> 1] = a;
                    if ((n | 0) < (g | 0)) n = n + 1 | 0;
                    else break
                }
            }
            a = c[s + 8 >> 2] | 0;
            h = c[a >> 2] | 0;
            if ((h | 0) >= 0) {
                j = c[p + 8 >> 2] | 0;
                k = c[1280] | 0;
                l = c[1281] | 0;
                m = c[1282] | 0;
                n = c[1283] | 0;
                f = c[a + 8 >> 2] | 0;
                g = 0;
                while (1) {
                    a = b[f + (g << 1) >> 1] | 0;
                    if (!(a << 16 >> 16)) a = 0;
                    else {
                        a = (e[k + ((a & 65535) << 1) >> 1] | 0) << 1;
                        a = e[n + ((a & l) + (a >>> m) << 1) >> 1] | 0
                    }
                    b[j + ((g << 1 | 1) << 1) >> 1] = a;
                    if ((g | 0) < (h | 0)) g = g + 1 | 0;
                    else break
                }
            }
            Wb(o);
            Wb(c[s + 8 >> 2] | 0);
            Xb(p) | 0;
            if ((c[p >> 2] | 0) != 60) {
                Wb(p);
                d = -1;
                i = s;
                return d | 0
            }
            if ((yb(p, s + 16 | 0) | 0) != 60) {
                Wb(p);
                d = -1;
                i = s;
                return d | 0
            }
            a = c[1218] | 0;
            f = 0;
            do {
                c[d + (f << 2) >> 2] = e[a + ((e[s + 16 + (f << 1) >> 1] | 0) << 1) >> 1];
                f = f + 1 | 0
            } while ((f | 0) != 60);
            zb(d, 0, 60, 0, 4096);
            Wb(p);
            d = 60;
            i = s;
            return d | 0
        }

        function Bb(b, e, f) {
            b = b | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                j = 0;
            h = i;
            i = i + 272 | 0;
            c[1217] = f;
            c[1218] = f + 376832;
            g = Vb(60, f + 385024 | 0) | 0;
            c[1219] = g;
            c[g >> 2] = 60;
            f = f + 385146 | 0;
            g = 0;
            while (1) {
                j = Vb(59, f) | 0;
                c[4880 + (g << 2) >> 2] = j;
                c[j >> 2] = 59;
                g = g + 1 | 0;
                if ((g | 0) == 60) break;
                else f = f + 120 | 0
            }
            f = Ab(e, h) | 0;
            Yc(c[1219] | 0);
            g = 0;
            do {
                Yc(c[4880 + (g << 2) >> 2] | 0);
                g = g + 1 | 0
            } while ((g | 0) != 60);
            if ((f | 0) < 0) {
                j = -1;
                i = h;
                return j | 0
            } else f = 0;
            do {
                j = c[h + (f << 2) >> 2] | 0;
                a[e + ((j | 0) / 8 | 0) >> 0] = (d[e + ((j | 0) / 8 | 0) >> 0] | 0) ^ 1 << (j & 7);
                f = f + 1 | 0
            } while ((f | 0) != 60);
            ed(b | 0, e | 0, 422) | 0;
            c[h + 240 >> 2] = c[334];
            c[h + 240 + 4 >> 2] = c[335];
            c[h + 240 + 8 >> 2] = c[336];
            c[h + 240 + 12 >> 2] = c[337];
            c[h + 240 + 16 >> 2] = c[338];
            c[h + 240 + 20 >> 2] = c[339];
            c[h + 240 + 24 >> 2] = c[340];
            j = (Kb(h, b, 3376, 446, 12, 60, h + 240 | 0) | 0) >> 31 | 1;
            i = h;
            return j | 0
        }

        function Cb(a) {
            a = a | 0;
            if (!a) {
                Yc(a);
                return
            }
            Cb(c[a + 24 >> 2] | 0);
            Yc(a);
            return
        }

        function Db(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0,
                e = 0;
            a: do switch (b | 0) {
                    case 4:
                        {
                            b = c[a + 12 >> 2] | 0;
                            d = (_(_(b + -1 | 0, b) | 0, b + -2 | 0) | 0) / 6 | 0;
                            switch (d & 3 | 0) {
                                case 0:
                                    {
                                        d = _(d >>> 2, b + -3 | 0) | 0;
                                        e = 6;
                                        break a
                                    }
                                case 3:
                                case 1:
                                    {
                                        d = _(b + -3 >> 2, d) | 0;
                                        e = 6;
                                        break a
                                    }
                                case 2:
                                    {
                                        d = _(d >>> 1, b + -3 >> 1) | 0;
                                        e = 6;
                                        break a
                                    }
                                default:
                                    {
                                        e = 6;
                                        break a
                                    }
                            }
                        }
                    case 3:
                        {
                            d = 0;
                            e = 6;
                            break
                        }
                    case 2:
                        {
                            b = 0;
                            break
                        }
                    case 1:
                        {
                            e = 0;
                            a = c[a >> 2] | 0;
                            a = a + e | 0;
                            return a | 0
                        }
                    default:
                        return (c[(c[5208 + (b << 2) >> 2] | 0) + (c[a + (b + -1 << 2) >> 2] << 2) >> 2] | 0) + (Db(a, b + -1 | 0) | 0) | 0
                }
                while (0);
                if ((e | 0) == 6) {
                    b = c[a + 8 >> 2] | 0;
                    b = (((_((_(b + -1 | 0, b) | 0) / 2 | 0, b + -2 | 0) | 0) >>> 0) / 3 | 0) + d | 0
                }
            e = c[a + 4 >> 2] | 0;
            e = ((_(e + -1 | 0, e) | 0) >>> 1) + b | 0;
            a = c[a >> 2] | 0;
            a = a + e | 0;
            return a | 0
        }

        function Eb(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0;
            a: do
                if (a) {
                    f = b;
                    b: while (1) {
                        switch (f | 0) {
                            case 1:
                                {
                                    b = a;
                                    e = 5;
                                    break b
                                }
                            case 2:
                                {
                                    b = a;
                                    e = 6;
                                    break b
                                }
                            case 3:
                                {
                                    e = 7;
                                    break b
                                }
                            case 4:
                                {
                                    b = a;
                                    e = 12;
                                    break b
                                }
                            default:
                                {}
                        }
                        b = f + -1 | 0;
                        g = c[5140 + (f << 2) >> 2] | 0;
                        i = c[5208 + (f << 2) >> 2] | 0;
                        if (((g + b | 0) / 2 | 0 | 0) > (b | 0)) {
                            e = b;
                            h = g;
                            f = (g + b | 0) / 2 | 0;
                            do {
                                g = (c[i + (f << 2) >> 2] | 0) >>> 0 > a >>> 0;
                                e = g ? e : f;
                                h = g ? f : h;
                                f = (h + e | 0) / 2 | 0
                            } while ((f | 0) > (e | 0))
                        } else e = b;
                        c[d + (b << 2) >> 2] = e;
                        e = c[i + (e << 2) >> 2] | 0;
                        if ((a | 0) == (e | 0)) break a;
                        else {
                            f = b;
                            a = a - e | 0
                        }
                    }
                    if ((e | 0) == 5) {
                        c[d >> 2] = b;
                        return
                    } else if ((e | 0) == 6) {
                        i = ~~+wc(+O(+(+(b << 1 >>> 0) + .25)));
                        c[d + 4 >> 2] = i;
                        c[d >> 2] = b - ((_(i + -1 | 0, i) | 0) / 2 | 0);
                        return
                    } else if ((e | 0) == 7) {
                        e = ~~(+tc(+(a >>> 0) * 6.0) + 1.0);
                        c[d + 8 >> 2] = e;
                        f = (_(e + -1 | 0, e) | 0) / 2 | 0;
                        b = a - (((_(e + -2 | 0, f) | 0) >>> 0) / 3 | 0) | 0;
                        if (b >>> 0 >= f >>> 0) {
                            c[d + 8 >> 2] = e + 1;
                            b = b - f | 0
                        }
                        if (!b) {
                            c[d + 4 >> 2] = 1;
                            c[d >> 2] = 0;
                            return
                        } else {
                            i = ~~+wc(+O(+(+(b << 1 >>> 0) + .25)));
                            c[d + 4 >> 2] = i;
                            c[d >> 2] = b - ((_(i + -1 | 0, i) | 0) / 2 | 0);
                            return
                        }
                    } else if ((e | 0) == 12) {
                        a = ~~(+P(+(+(b >>> 0) * 24.0), .25) + 1.0);
                        c[d + 12 >> 2] = a;
                        e = (_(_(a + -1 | 0, a) | 0, a + -2 | 0) | 0) / 6 | 0;
                        switch (e & 3 | 0) {
                            case 0:
                                {
                                    b = b - (_(a + -3 | 0, e >>> 2) | 0) | 0;
                                    break
                                }
                            case 3:
                            case 1:
                                {
                                    b = b - (_(a + -3 >> 2, e) | 0) | 0;
                                    break
                                }
                            case 2:
                                {
                                    b = b - (_(a + -3 >> 1, e >>> 1) | 0) | 0;
                                    break
                                }
                            default:
                                {}
                        }
                        if (b >>> 0 >= e >>> 0) {
                            c[d + 12 >> 2] = a + 1;
                            b = b - e | 0
                        }
                        if (!b) {
                            c[d + 8 >> 2] = 2;
                            c[d + 4 >> 2] = 1;
                            c[d >> 2] = 0;
                            return
                        }
                        a = ~~(+tc(+(b >>> 0) * 6.0) + 1.0);
                        c[d + 8 >> 2] = a;
                        e = (_(a + -1 | 0, a) | 0) / 2 | 0;
                        b = b - (((_(a + -2 | 0, e) | 0) >>> 0) / 3 | 0) | 0;
                        if (b >>> 0 >= e >>> 0) {
                            c[d + 8 >> 2] = a + 1;
                            b = b - e | 0
                        }
                        if (!b) {
                            c[d + 4 >> 2] = 1;
                            c[d >> 2] = 0;
                            return
                        } else {
                            i = ~~+wc(+O(+(+(b << 1 >>> 0) + .25)));
                            c[d + 4 >> 2] = i;
                            c[d >> 2] = b - ((_(i + -1 | 0, i) | 0) / 2 | 0);
                            return
                        }
                    }
                }
            while (0);
            if ((b | 0) <= 0) return;
            do {
                i = b;
                b = b + -1 | 0;
                c[d + (b << 2) >> 2] = b
            } while ((i | 0) > 1);
            return
        }

        function Fb(a, b, d, e, f) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0;
            m = i;
            i = i + 32 | 0;
            if (!b) {
                d = 0;
                i = m;
                return d | 0
            }
            if (((1 << d) - b | 0) < (b | 0)) {
                l = Xc((1 << d) - b << 2) | 0;
                h = c[a >> 2] | 0;
                a: do
                    if ((b | 0) > 0 & ((1 << d) - b | 0) > 0) {
                        k = h;
                        j = 0;
                        g = 0;
                        h = h & -1 << d;
                        while (1) {
                            if ((k | 0) == (h | 0)) j = j + 1 | 0;
                            else {
                                c[l + (g << 2) >> 2] = h;
                                g = g + 1 | 0
                            }
                            h = h + 1 | 0;
                            if (!((j | 0) < (b | 0) & (g | 0) < ((1 << d) - b | 0))) break a;
                            k = c[a + (j << 2) >> 2] | 0
                        }
                    } else {
                        g = 0;
                        h = h & -1 << d
                    }
                while (0);
                if ((g | 0) < ((1 << d) - b | 0))
                    while (1) {
                        c[l + (g << 2) >> 2] = h;
                        g = g + 1 | 0;
                        if ((g | 0) == ((1 << d) - b | 0)) {
                            g = (1 << d) - b | 0;
                            break
                        } else h = h + 1 | 0
                    };
                c[m >> 2] = c[f >> 2];
                c[m + 4 >> 2] = c[f + 4 >> 2];
                c[m + 8 >> 2] = c[f + 8 >> 2];
                c[m + 12 >> 2] = c[f + 12 >> 2];
                c[m + 16 >> 2] = c[f + 16 >> 2];
                c[m + 20 >> 2] = c[f + 20 >> 2];
                c[m + 24 >> 2] = c[f + 24 >> 2];
                d = Fb(l, g, d, e, m) | 0;
                Yc(l);
                i = m;
                return d | 0
            }
            if ((b | 0) == 1) {
                b = c[1319] | 0;
                f = Xc(28) | 0;
                c[f + 24 >> 2] = b;
                c[1319] = f;
                c[f + 4 >> 2] = d;
                c[f + 8 >> 2] = 1;
                c[f + 16 >> 2] = c[a >> 2] & (1 << d) + -1;
                c[f + 20 >> 2] = 1 << d;
                d = 0;
                i = m;
                return d | 0
            }
            do
                if ((d | 0) >= 6) {
                    if ((d | 0) > 16) {
                        g = (b | 0) < 2 & 1;
                        break
                    }
                    if ((d | 0) > 11) {
                        g = (b | 0) < 3 & 1;
                        break
                    } else {
                        g = (c[5288 + (d + -6 << 2) >> 2] | 0) >= (b | 0) & 1;
                        break
                    }
                } else g = (b | 0) < 33 & 1;
            while (0);
            if (g) {
                g = c[1320] | 0;
                if ((b | 0) > 0) {
                    h = 0;
                    do {
                        c[g + (h << 2) >> 2] = c[a + (h << 2) >> 2] & ~(-1 << d);
                        h = h + 1 | 0
                    } while ((h | 0) != (b | 0))
                }
                a = c[1319] | 0;
                e = Xc(28) | 0;
                c[e + 24 >> 2] = a;
                c[1319] = e;
                c[e + 8 >> 2] = b;
                c[e + 16 >> 2] = Db(g, b) | 0;
                d = c[(c[f + 24 >> 2] | 0) + (d << 2) >> 2] | 0;
                c[e + 20 >> 2] = c[d + (b << 3) >> 2];
                c[e + 4 >> 2] = c[d + (b << 3) + 4 >> 2];
                d = 0;
                i = m;
                return d | 0
            }
            b: do
                if ((b | 0) > 0) {
                    g = 0;
                    do {
                        if (c[a + (g << 2) >> 2] & 1 << d + -1) break b;
                        g = g + 1 | 0
                    } while ((g | 0) < (b | 0))
                } else g = 0;
            while (0);
            l = (c[(c[f + 20 >> 2] | 0) + (d << 2) >> 2] | 0) + ((b - (c[(c[f + 16 >> 2] | 0) + (d << 2) >> 2] | 0) | 0) * 12 | 0) | 0;
            c[m >> 2] = c[l >> 2];
            c[m + 4 >> 2] = c[l + 4 >> 2];
            c[m + 8 >> 2] = c[l + 8 >> 2];
            l = Za(g, m, e) | 0;
            c[m >> 2] = c[f >> 2];
            c[m + 4 >> 2] = c[f + 4 >> 2];
            c[m + 8 >> 2] = c[f + 8 >> 2];
            c[m + 12 >> 2] = c[f + 12 >> 2];
            c[m + 16 >> 2] = c[f + 16 >> 2];
            c[m + 20 >> 2] = c[f + 20 >> 2];
            c[m + 24 >> 2] = c[f + 24 >> 2];
            l = (Fb(a, g, d + -1 | 0, e, m) | 0) + l | 0;
            c[m >> 2] = c[f >> 2];
            c[m + 4 >> 2] = c[f + 4 >> 2];
            c[m + 8 >> 2] = c[f + 8 >> 2];
            c[m + 12 >> 2] = c[f + 12 >> 2];
            c[m + 16 >> 2] = c[f + 16 >> 2];
            c[m + 20 >> 2] = c[f + 20 >> 2];
            c[m + 24 >> 2] = c[f + 24 >> 2];
            d = l + (Fb(a + (g << 2) | 0, b - g | 0, d + -1 | 0, e, m) | 0) | 0;
            i = m;
            return d | 0
        }

        function Gb(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0;
            l = i;
            i = i + 32 | 0;
            e = c[d >> 2] | 0;
            k = c[d + 4 >> 2] | 0;
            c[1320] = Xc((k << 2) + 4 | 0) | 0;
            c[1319] = 0;
            c[l >> 2] = c[d >> 2];
            c[l + 4 >> 2] = c[d + 4 >> 2];
            c[l + 8 >> 2] = c[d + 8 >> 2];
            c[l + 12 >> 2] = c[d + 12 >> 2];
            c[l + 16 >> 2] = c[d + 16 >> 2];
            c[l + 20 >> 2] = c[d + 20 >> 2];
            c[l + 24 >> 2] = c[d + 24 >> 2];
            e = Fb(a, k, e, b, l) | 0;
            d = c[1319] | 0;
            if (!d) k = 0;
            else {
                a = 0;
                do {
                    a = (c[d + 4 >> 2] | 0) + a | 0;
                    d = c[d + 24 >> 2] | 0
                } while ((d | 0) != 0);
                k = a
            }
            j = (jb(c[b + 12 >> 2] | 0) | 0) >= (k | 0);
            if (j) nb(c[b + 12 >> 2] | 0, 0 - k | 0);
            a = c[1319] | 0;
            if (!a) a = e;
            else {
                d = a;
                a = e;
                do {
                    if ((c[d + 8 >> 2] | 0) > 1) {
                        h = d + 16 | 0;
                        g = d + 4 | 0;
                        a = (_a((c[h >> 2] | 0) >>> (c[g >> 2] | 0), c[d + 20 >> 2] | 0, b) | 0) + a | 0;
                        c[h >> 2] = (1 << c[g >> 2]) + -1 & c[h >> 2]
                    }
                    d = c[d + 24 >> 2] | 0
                } while ((d | 0) != 0)
            }
            if (!j ? (f = c[1319] | 0, (f | 0) != 0) : 0) {
                h = f;
                do {
                    f = h + 4 | 0;
                    d = c[f >> 2] | 0;
                    g = h + 16 | 0;
                    e = c[g >> 2] | 0;
                    if ((d | 0) > 11)
                        do {
                            d = d + -11 | 0;
                            c[f >> 2] = d;
                            a = (_a(e >>> d, 2048, b) | 0) + a | 0;
                            d = c[f >> 2] | 0;
                            e = (1 << d) + -1 & c[g >> 2];
                            c[g >> 2] = e
                        } while ((d | 0) > 11);
                    a = (_a(e, 1 << d, b) | 0) + a | 0;
                    h = c[h + 24 >> 2] | 0
                } while ((h | 0) != 0)
            }
            d = c[b + 12 >> 2] | 0;
            if (!(c[b + 4 >> 2] | 0)) ub(0, d);
            else {
                ub(1, d);
                vb(0, c[b >> 2] | 0, c[b + 12 >> 2] | 0)
            }
            d = a + 1 | 0;
            if (!j) {
                b = d;
                k = c[1320] | 0;
                Yc(k);
                k = c[1319] | 0;
                Cb(k);
                i = l;
                return b | 0
            }
            nb(c[b + 12 >> 2] | 0, k);
            a = c[b + 12 >> 2] | 0;
            mb(a, (c[a + 16 >> 2] | 0) - k | 0);
            a = c[1319] | 0;
            if (a)
                do {
                    tb(c[a + 16 >> 2] | 0, c[a + 4 >> 2] | 0, c[b + 12 >> 2] | 0);
                    a = c[a + 24 >> 2] | 0
                } while ((a | 0) != 0);
            b = d + k | 0;
            k = c[1320] | 0;
            Yc(k);
            k = c[1319] | 0;
            Cb(k);
            i = l;
            return b | 0
        }

        function Hb(a, b, d, e, f, g) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            var h = 0,
                j = 0,
                k = 0;
            j = i;
            i = i + 32 | 0;
            if (!b) {
                e = 0;
                i = j;
                return e | 0
            }
            if (((1 << d) - b | 0) < (b | 0)) {
                k = c[1321] | 0;
                h = Xc(28) | 0;
                c[h + 24 >> 2] = k;
                c[1321] = h;
                c[h + 8 >> 2] = b;
                c[h >> 2] = a;
                c[h + 4 >> 2] = d;
                c[h + 12 >> 2] = e;
                c[j + 4 >> 2] = c[g >> 2];
                c[j + 4 + 4 >> 2] = c[g + 4 >> 2];
                c[j + 4 + 8 >> 2] = c[g + 8 >> 2];
                c[j + 4 + 12 >> 2] = c[g + 12 >> 2];
                c[j + 4 + 16 >> 2] = c[g + 16 >> 2];
                c[j + 4 + 20 >> 2] = c[g + 20 >> 2];
                c[j + 4 + 24 >> 2] = c[g + 24 >> 2];
                e = Hb(a, (1 << d) - b | 0, d, e, f, j + 4 | 0) | 0;
                i = j;
                return e | 0
            }
            if ((b | 0) == 1) {
                f = c[1319] | 0;
                k = Xc(28) | 0;
                c[k + 24 >> 2] = f;
                c[1319] = k;
                c[k >> 2] = a;
                c[k + 8 >> 2] = 1;
                c[k + 4 >> 2] = d;
                c[k + 16 >> 2] = 0;
                c[k + 12 >> 2] = e;
                c[k + 20 >> 2] = 1 << d;
                k = 0;
                i = j;
                return k | 0
            }
            do
                if ((d | 0) >= 6) {
                    if ((d | 0) > 16) {
                        h = (b | 0) < 2 & 1;
                        break
                    }
                    if ((d | 0) > 11) {
                        h = (b | 0) < 3 & 1;
                        break
                    } else {
                        h = (c[5288 + (d + -6 << 2) >> 2] | 0) >= (b | 0) & 1;
                        break
                    }
                } else h = (b | 0) < 33 & 1;
            while (0);
            if (!h) {
                h = (c[(c[g + 20 >> 2] | 0) + (d << 2) >> 2] | 0) + ((b - (c[(c[g + 16 >> 2] | 0) + (d << 2) >> 2] | 0) | 0) * 12 | 0) | 0;
                c[j + 4 >> 2] = c[h >> 2];
                c[j + 4 + 4 >> 2] = c[h + 4 >> 2];
                c[j + 4 + 8 >> 2] = c[h + 8 >> 2];
                h = $a(j + 4 | 0, j, f) | 0;
                k = c[j >> 2] | 0;
                c[j + 4 >> 2] = c[g >> 2];
                c[j + 4 + 4 >> 2] = c[g + 4 >> 2];
                c[j + 4 + 8 >> 2] = c[g + 8 >> 2];
                c[j + 4 + 12 >> 2] = c[g + 12 >> 2];
                c[j + 4 + 16 >> 2] = c[g + 16 >> 2];
                c[j + 4 + 20 >> 2] = c[g + 20 >> 2];
                c[j + 4 + 24 >> 2] = c[g + 24 >> 2];
                h = (Hb(a, k, d + -1 | 0, e, f, j + 4 | 0) | 0) + h | 0;
                k = c[j >> 2] | 0;
                c[j + 4 >> 2] = c[g >> 2];
                c[j + 4 + 4 >> 2] = c[g + 4 >> 2];
                c[j + 4 + 8 >> 2] = c[g + 8 >> 2];
                c[j + 4 + 12 >> 2] = c[g + 12 >> 2];
                c[j + 4 + 16 >> 2] = c[g + 16 >> 2];
                c[j + 4 + 20 >> 2] = c[g + 20 >> 2];
                c[j + 4 + 24 >> 2] = c[g + 24 >> 2];
                k = h + (Hb(a + (k << 2) | 0, b - k | 0, d + -1 | 0, 1 << d + -1 ^ e, f, j + 4 | 0) | 0) | 0;
                i = j;
                return k | 0
            } else {
                f = c[1319] | 0;
                k = Xc(28) | 0;
                c[k + 24 >> 2] = f;
                c[1319] = k;
                c[k >> 2] = a;
                c[k + 8 >> 2] = b;
                c[k + 12 >> 2] = e;
                e = c[(c[g + 24 >> 2] | 0) + (d << 2) >> 2] | 0;
                c[k + 20 >> 2] = c[e + (b << 3) >> 2];
                c[k + 4 >> 2] = c[e + (b << 3) + 4 >> 2];
                k = 0;
                i = j;
                return k | 0
            }
            return 0
        }

        function Ib(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0;
            n = i;
            i = i + 32 | 0;
            e = c[d >> 2] | 0;
            m = c[d + 4 >> 2] | 0;
            c[1319] = 0;
            c[1321] = 0;
            c[n + 4 >> 2] = c[d >> 2];
            c[n + 4 + 4 >> 2] = c[d + 4 >> 2];
            c[n + 4 + 8 >> 2] = c[d + 8 >> 2];
            c[n + 4 + 12 >> 2] = c[d + 12 >> 2];
            c[n + 4 + 16 >> 2] = c[d + 16 >> 2];
            c[n + 4 + 20 >> 2] = c[d + 20 >> 2];
            c[n + 4 + 24 >> 2] = c[d + 24 >> 2];
            d = Hb(a, m, e, 0, b, n + 4 | 0) | 0;
            e = c[1319] | 0;
            if (!e) f = 0;
            else {
                a = 0;
                do {
                    a = (c[e + 4 >> 2] | 0) + a | 0;
                    e = c[e + 24 >> 2] | 0
                } while ((e | 0) != 0);
                f = a
            }
            e = (ib(c[b + 12 >> 2] | 0) | 0) >= (f | 0);
            if (e) lb(c[b + 12 >> 2] | 0, 0 - f | 0);
            a = c[1319] | 0;
            if (a)
                do {
                    if ((c[a + 8 >> 2] | 0) > 1) {
                        d = (ab(c[a + 20 >> 2] | 0, n, b) | 0) + d | 0;
                        c[a + 16 >> 2] = c[n >> 2] << c[a + 4 >> 2]
                    }
                    a = c[a + 24 >> 2] | 0
                } while ((a | 0) != 0);
            do
                if (e) {
                    lb(c[b + 12 >> 2] | 0, f);
                    a = c[b + 12 >> 2] | 0;
                    kb(a, (c[a + 16 >> 2] | 0) - f | 0);
                    a = c[1319] | 0;
                    if (a)
                        do {
                            l = ob(c[a + 4 >> 2] | 0, c[b + 12 >> 2] | 0) | 0;
                            m = a + 16 | 0;
                            c[m >> 2] = c[m >> 2] ^ l;
                            a = c[a + 24 >> 2] | 0
                        } while ((a | 0) != 0);
                    d = d + f | 0;
                    g = 18
                } else {
                    a = c[1319] | 0;
                    if (!a) {
                        b = d + 1 | 0;
                        break
                    }
                    do {
                        f = a + 4 | 0;
                        e = c[f >> 2] | 0;
                        g = a + 16 | 0;
                        if ((e | 0) > 11)
                            do {
                                d = (ab(2048, n, b) | 0) + d | 0;
                                e = (c[f >> 2] | 0) + -11 | 0;
                                c[f >> 2] = e;
                                c[g >> 2] = c[g >> 2] ^ c[n >> 2] << e
                            } while ((e | 0) > 11);
                        d = (ab(1 << e, n, b) | 0) + d | 0;
                        c[g >> 2] = c[g >> 2] ^ c[n >> 2];
                        a = c[a + 24 >> 2] | 0
                    } while ((a | 0) != 0);
                    g = 18
                }
            while (0);
            if ((g | 0) == 18) {
                a = c[1319] | 0;
                b = d + 1 | 0;
                if (a)
                    do {
                        d = a + 8 | 0;
                        Eb(c[a + 16 >> 2] | 0, c[d >> 2] | 0, c[a >> 2] | 0);
                        if ((c[d >> 2] | 0) > 0) {
                            e = a + 12 | 0;
                            f = c[a >> 2] | 0;
                            g = 0;
                            do {
                                m = f + (g << 2) | 0;
                                c[m >> 2] = c[m >> 2] ^ c[e >> 2];
                                g = g + 1 | 0
                            } while ((g | 0) < (c[d >> 2] | 0))
                        }
                        a = c[a + 24 >> 2] | 0
                    } while ((a | 0) != 0)
            }
            a = c[1321] | 0;
            if (!a) {
                m = c[1319] | 0;
                Cb(m);
                m = c[1321] | 0;
                Cb(m);
                i = n;
                return b | 0
            }
            do {
                j = a + 4 | 0;
                f = c[j >> 2] | 0;
                k = a + 8 | 0;
                d = c[k >> 2] | 0;
                l = Xc((1 << f) - d << 2) | 0;
                m = c[a >> 2] | 0;
                ed(l | 0, m | 0, (1 << f) - d << 2 | 0) | 0;
                e = c[a + 12 >> 2] | 0;
                if ((d | 0) > 0 & (1 << f | 0) > (d | 0)) {
                    g = d;
                    d = 0;
                    h = 0;
                    do {
                        if ((c[l + (h << 2) >> 2] | 0) == (e | 0)) h = h + 1 | 0;
                        else {
                            c[m + (d << 2) >> 2] = e;
                            f = c[j >> 2] | 0;
                            g = c[k >> 2] | 0;
                            d = d + 1 | 0
                        }
                        e = e + 1 | 0
                    } while ((d | 0) < (g | 0) & (h | 0) < ((1 << f) - g | 0));
                    f = g
                } else {
                    f = d;
                    d = 0
                }
                if ((d | 0) < (f | 0))
                    while (1) {
                        c[m + (d << 2) >> 2] = e;
                        d = d + 1 | 0;
                        if ((d | 0) >= (c[k >> 2] | 0)) break;
                        else e = e + 1 | 0
                    }
                Yc(l);
                a = c[a + 24 >> 2] | 0
            } while ((a | 0) != 0);
            m = c[1319] | 0;
            Cb(m);
            m = c[1321] | 0;
            Cb(m);
            i = n;
            return b | 0
        }

        function Jb(b, d, e, f, g, h, j) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            h = h | 0;
            j = j | 0;
            var k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0,
                w = 0,
                x = 0,
                y = 0;
            y = i;
            i = i + 32 | 0;
            if ((c[j + 12 >> 2] | 0) != (h | 0)) {
                Nc(9535) | 0;
                Ea(0)
            }
            if ((c[j + 8 >> 2] | 0) != (g | 0)) {
                Nc(9535) | 0;
                Ea(0)
            }
            if ((e | 0) % 8 | 0) {
                w = a[b + ((e | 0) / 8 | 0) >> 0] | 0;
                a[b + ((e | 0) / 8 | 0) >> 0] = (w & 255) >>> ((e | 0) % 8 | 0)
            } else w = 0;
            if ((f + e | 0) % 8 | 0) {
                x = a[b + ((f + e | 0) / 8 | 0) >> 0] | 0;
                a[b + ((f + e | 0) / 8 | 0) >> 0] = (x & 255) << 8 - ((f + e | 0) % 8 | 0)
            } else x = 0;
            v = Xa(bb(b, f + e | 0) | 0) | 0;
            t = g - (c[j >> 2] | 0) | 0;
            u = _(t, h) | 0;
            kb(c[v + 12 >> 2] | 0, u + e | 0);
            s = Xc(c[j + 4 >> 2] << 2) | 0;
            c[y >> 2] = c[j >> 2];
            c[y + 4 >> 2] = c[j + 4 >> 2];
            c[y + 8 >> 2] = c[j + 8 >> 2];
            c[y + 12 >> 2] = c[j + 12 >> 2];
            c[y + 16 >> 2] = c[j + 16 >> 2];
            c[y + 20 >> 2] = c[j + 20 >> 2];
            c[y + 24 >> 2] = c[j + 24 >> 2];
            k = Ib(s, v, y) | 0;
            l = c[j + 4 >> 2] | 0;
            if ((l | 0) != (h | 0)) {
                n = c[s >> 2] | 0;
                if ((n | 0) > 0) {
                    l = 0;
                    do {
                        c[d + (l << 2) >> 2] = l;
                        l = l + 1 | 0
                    } while ((l | 0) < (n | 0));
                    l = c[j + 4 >> 2] | 0;
                    m = (n | 0) > 1 ? n : 1
                } else m = 0;
                if ((l | 0) > 1) {
                    r = 1;
                    do {
                        o = n + 1 | 0;
                        q = n;
                        n = c[s + (r << 2) >> 2] | 0;
                        if ((o | 0) < (n | 0)) {
                            p = m + -1 + ((n | 0) > (q + 2 | 0) ? n : q + 2 | 0) | 0;
                            l = o;
                            while (1) {
                                c[d + (m << 2) >> 2] = l;
                                l = l + 1 | 0;
                                if ((l | 0) >= (n | 0)) break;
                                else m = m + 1 | 0
                            }
                            l = c[j + 4 >> 2] | 0;
                            m = p - q | 0
                        }
                        r = r + 1 | 0
                    } while ((r | 0) < (l | 0))
                }
                l = (c[s + (l + -1 << 2) >> 2] | 0) + 1 | 0;
                if ((l | 0) < (1 << g | 0))
                    while (1) {
                        c[d + (m << 2) >> 2] = l;
                        l = l + 1 | 0;
                        if ((l | 0) == (1 << g | 0)) break;
                        else m = m + 1 | 0
                    }
            } else ed(d | 0, s | 0, h << 2 | 0) | 0;
            Yc(s);
            if ((t | 0) > 0) {
                kb(c[v + 12 >> 2] | 0, e);
                if ((h | 0) > 0) {
                    l = 0;
                    do {
                        g = d + (l << 2) | 0;
                        s = c[g >> 2] << t;
                        c[g >> 2] = (ob(t, c[v + 12 >> 2] | 0) | 0) ^ s;
                        l = l + 1 | 0
                    } while ((l | 0) != (h | 0))
                }
                k = k + u | 0
            }
            gb(c[v + 12 >> 2] | 0);
            Yc(v);
            if ((e | 0) % 8 | 0) a[b + ((e | 0) / 8 | 0) >> 0] = w;
            if (!((f + e | 0) % 8 | 0)) {
                e = (k | 0) < (f | 0);
                e = e ? -1 : k;
                i = y;
                return e | 0
            }
            a[b + ((f + e | 0) / 8 | 0) >> 0] = x;
            e = (k | 0) < (f | 0);
            e = e ? -1 : k;
            i = y;
            return e | 0
        }

        function Kb(b, e, f, g, h, j, k) {
            b = b | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            h = h | 0;
            j = j | 0;
            k = k | 0;
            var l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0,
                w = 0;
            w = i;
            i = i + 32 | 0;
            if ((c[k + 12 >> 2] | 0) != (j | 0)) {
                Nc(9535) | 0;
                Ea(0)
            }
            if ((c[k + 8 >> 2] | 0) != (h | 0)) {
                Nc(9535) | 0;
                Ea(0)
            }
            if ((f | 0) % 8 | 0) {
                v = (d[e + ((f | 0) / 8 | 0) >> 0] | 0) & (1 << ((f | 0) % 8 | 0)) + -1;
                a[e + ((f | 0) / 8 | 0) >> 0] = 0
            } else v = 0;
            u = Xa(cb(e, g + f | 0) | 0) | 0;
            mb(c[u + 12 >> 2] | 0, f);
            s = h - (c[k >> 2] | 0) | 0;
            if ((s | 0) > 0 ? (j | 0) > 0 : 0) {
                l = 0;
                do {
                    tb(c[b + (l << 2) >> 2] & (1 << s) + -1, s, c[u + 12 >> 2] | 0);
                    l = l + 1 | 0
                } while ((l | 0) != (j | 0))
            }
            r = c[k + 4 >> 2] | 0;
            t = Xc(r << 2) | 0;
            if ((r | 0) == (j | 0)) {
                if ((j | 0) > 0) {
                    l = 0;
                    do {
                        c[t + (l << 2) >> 2] = c[b + (l << 2) >> 2] >> s;
                        l = l + 1 | 0
                    } while ((l | 0) != (j | 0))
                }
            } else {
                n = c[b >> 2] | 0;
                if ((n >> s | 0) > 0) {
                    l = 0;
                    do {
                        c[t + (l << 2) >> 2] = l;
                        l = l + 1 | 0
                    } while ((l | 0) < (n >> s | 0));
                    m = (n >> s | 0) > 1 ? n >> s : 1
                } else m = 0;
                if ((j | 0) > 1) {
                    r = 1;
                    do {
                        l = n >> s;
                        n = c[b + (r << 2) >> 2] | 0;
                        o = n >> s;
                        if ((l + 1 | 0) < (o | 0)) {
                            p = m + -1 + ((o | 0) > (l + 2 | 0) ? o : l + 2 | 0) | 0;
                            q = l + 1 | 0;
                            while (1) {
                                c[t + (m << 2) >> 2] = q;
                                q = q + 1 | 0;
                                if ((q | 0) >= (o | 0)) break;
                                else m = m + 1 | 0
                            }
                            m = p - l | 0
                        }
                        r = r + 1 | 0
                    } while ((r | 0) != (j | 0))
                }
                l = (c[b + (j + -1 << 2) >> 2] >> s) + 1 | 0;
                if ((l | 0) < (1 << h | 0))
                    while (1) {
                        c[t + (m << 2) >> 2] = l;
                        l = l + 1 | 0;
                        if ((l | 0) == (1 << h | 0)) break;
                        else m = m + 1 | 0
                    }
            }
            l = _(s, j) | 0;
            c[w >> 2] = c[k >> 2];
            c[w + 4 >> 2] = c[k + 4 >> 2];
            c[w + 8 >> 2] = c[k + 8 >> 2];
            c[w + 12 >> 2] = c[k + 12 >> 2];
            c[w + 16 >> 2] = c[k + 16 >> 2];
            c[w + 20 >> 2] = c[k + 20 >> 2];
            c[w + 24 >> 2] = c[k + 24 >> 2];
            l = (Gb(t, u, w) | 0) + l | 0;
            Yc(t);
            hb(c[u + 12 >> 2] | 0);
            Yc(u);
            if ((f | 0) % 8 | 0) a[e + ((f | 0) / 8 | 0) >> 0] = (d[e + ((f | 0) / 8 | 0) >> 0] | 0) << ((f | 0) % 8 | 0) ^ v;
            if (!((g + f | 0) % 8 | 0)) {
                f = (l | 0) < (g | 0);
                f = f ? -1 : l;
                i = w;
                return f | 0
            }
            a[e + ((g + f | 0) / 8 | 0) >> 0] = (d[e + ((g + f | 0) / 8 | 0) >> 0] | 0) >>> (8 - ((g + f | 0) % 8 | 0) | 0);
            f = (l | 0) < (g | 0);
            f = f ? -1 : l;
            i = w;
            return f | 0
        }

        function Lb(b, e, f) {
            b = b | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0;
            k = i;
            i = i + 368 | 0;
            g = k + 240 | 0;
            h = g + 92 | 0;
            do {
                c[g >> 2] = 0;
                g = g + 4 | 0
            } while ((g | 0) < (h | 0));
            j = 0;
            h = f;
            while (1) {
                g = d[e + j >> 0] | 0;
                if (g & 1) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 2) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 23 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 4) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 46 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 8) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 69 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 16) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 92 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 32) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 115 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 64) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 138 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                if (g & 128) {
                    f = 0;
                    do {
                        l = k + 240 + (f << 2) | 0;
                        c[l >> 2] = c[l >> 2] ^ c[h + (f + 161 << 2) >> 2];
                        f = f + 1 | 0
                    } while ((f | 0) != 23)
                }
                j = j + 1 | 0;
                if ((j | 0) == 422) break;
                else h = h + 736 | 0
            }
            c[k + 332 >> 2] = c[334];
            c[k + 332 + 4 >> 2] = c[335];
            c[k + 332 + 8 >> 2] = c[336];
            c[k + 332 + 12 >> 2] = c[337];
            c[k + 332 + 16 >> 2] = c[338];
            c[k + 332 + 20 >> 2] = c[339];
            c[k + 332 + 24 >> 2] = c[340];
            if ((Jb(e, k, 3376, 446, 12, 60, k + 332 | 0) | 0) < 0) {
                l = -1;
                i = k;
                return l | 0
            }
            ed(b | 0, e | 0, 422) | 0;
            g = b + 422 | 0;
            f = k + 240 | 0;
            h = g + 90 | 0;
            do {
                a[g >> 0] = a[f >> 0] | 0;
                g = g + 1 | 0;
                f = f + 1 | 0
            } while ((g | 0) < (h | 0));
            f = 0;
            do {
                l = c[k + (f << 2) >> 2] | 0;
                a[b + ((l | 0) / 8 | 0) >> 0] = (d[b + ((l | 0) / 8 | 0) >> 0] | 0) ^ 1 << (l & 7);
                f = f + 1 | 0
            } while ((f | 0) != 60);
            f = 1;
            i = k;
            return f | 0
        }

        function Mb(a) {
            a = a | 0;
            var d = 0,
                f = 0,
                g = 0,
                h = 0,
                j = 0;
            j = i;
            i = i + 16 | 0;
            if ((a | 0) > 16) {
                h = c[1913] | 0;
                c[j >> 2] = a;
                Jc(h, 9577, j) | 0;
                Ea(0)
            }
            d = c[1884] | 0;
            if ((d | 0) == (a | 0)) {
                i = j;
                return 1
            }
            if (d) {
                Yc(c[1283] | 0);
                Yc(c[1280] | 0)
            }
            c[1282] = a;
            c[1884] = a;
            c[1284] = 1 << a;
            c[1281] = (1 << a) + -1;
            h = Xc(2 << a) | 0;
            c[1283] = h;
            b[h >> 1] = 1;
            if (((1 << a) + -1 | 0) > 1) {
                d = 1;
                g = 1;
                do {
                    d = d & 65535;
                    f = h + (g << 1) | 0;
                    b[f >> 1] = d << 1;
                    if (!(d & 1 << a + -1)) d = d << 1;
                    else {
                        d = c[7540 + (a << 2) >> 2] ^ d << 1;
                        b[f >> 1] = d
                    }
                    g = g + 1 | 0
                } while ((g | 0) != ((1 << a) + -1 | 0))
            }
            b[h + ((1 << a) + -1 << 1) >> 1] = 1;
            d = Xc(2 << a) | 0;
            c[1280] = d;
            b[d >> 1] = (1 << a) + -1;
            if ((1 << a | 0) > 1) f = 0;
            else {
                i = j;
                return 1
            }
            do {
                b[d + ((e[h + (f << 1) >> 1] | 0) << 1) >> 1] = f;
                f = f + 1 | 0
            } while ((f | 0) != ((1 << a) + -1 | 0));
            i = j;
            return 1
        }

        function Nb(a) {
            a = a | 0;
            var b = 0;
            b = Ia[a & 31]() | 0;
            a = (Ia[a & 31]() | 0) << 8 ^ b;
            return a & c[1281] & 65535 | 0
        }

        function Ob() {
            return (Ac() | 0) & 255 | 0
        }

        function Pb(a, d) {
            a = a | 0;
            d = d | 0;
            var f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0,
                w = 0,
                x = 0;
            w = i;
            i = i + 16384 | 0;
            v = Rb(720, 4096) | 0;
            ad(c[v + 16 >> 2] | 0, 0, c[v + 12 >> 2] | 0) | 0;
            s = 0;
            do {
                q = a + (s << 1) | 0;
                j = Yb(d, b[q >> 1] | 0) | 0;
                r = c[1281] | 0;
                k = c[1280] | 0;
                l = c[1283] | 0;
                m = 1 << (s & 31);
                n = s >>> 5;
                o = c[1282] | 0;
                t = 0;
                j = b[l + (r - (e[k + ((j & 65535) << 1) >> 1] | 0) << 1) >> 1] | 0;
                while (1) {
                    f = j & 65535;
                    g = t * 12 | 0;
                    h = 0;
                    do {
                        if (1 << h & f) {
                            x = (_(c[v + 8 >> 2] | 0, h + g | 0) | 0) + n | 0;
                            x = (c[v + 16 >> 2] | 0) + (x << 2) | 0;
                            c[x >> 2] = c[x >> 2] | m
                        }
                        h = h + 1 | 0
                    } while ((h | 0) != 12);
                    if (j << 16 >> 16 != 0 ? (p = b[q >> 1] | 0, p << 16 >> 16 != 0) : 0) {
                        f = (e[k + ((p & 65535) << 1) >> 1] | 0) + (e[k + (f << 1) >> 1] | 0) | 0;
                        f = e[l + ((f & r) + (f >>> o) << 1) >> 1] | 0
                    } else f = 0;
                    t = t + 1 | 0;
                    if ((t | 0) == 60) break;
                    else j = f & 65535
                }
                s = s + 1 | 0
            } while ((s | 0) != 4096);
            m = Tb(v) | 0;
            if (!m) {
                Sb(v);
                x = 0;
                i = w;
                return x | 0
            }
            n = Rb(3376, 720) | 0;
            ad(c[n + 16 >> 2] | 0, 0, c[n + 12 >> 2] | 0) | 0;
            f = c[n >> 2] | 0;
            if ((f | 0) > 0 ? (u = c[n + 4 >> 2] | 0, (u | 0) > 0) : 0) {
                g = c[v + 8 >> 2] | 0;
                h = c[v + 16 >> 2] | 0;
                k = 0;
                do {
                    j = c[m + (k << 2) >> 2] | 0;
                    l = 0;
                    do {
                        if (c[h + ((j >>> 5) + (_(g, l) | 0) << 2) >> 2] & 1 << (j & 31)) {
                            x = (_(c[n + 8 >> 2] | 0, k) | 0) + (l >>> 5) | 0;
                            x = (c[n + 16 >> 2] | 0) + (x << 2) | 0;
                            c[x >> 2] = c[x >> 2] ^ 1 << (l & 31)
                        }
                        l = l + 1 | 0
                    } while ((l | 0) < (u | 0));
                    k = k + 1 | 0
                } while ((k | 0) < (f | 0));
                f = 0
            } else f = 0;
            do {
                c[w + (f << 2) >> 2] = e[a + (c[m + (f << 2) >> 2] << 1) >> 1];
                f = f + 1 | 0
            } while ((f | 0) != 4096);
            f = 0;
            do {
                b[a + (f << 1) >> 1] = c[w + (f << 2) >> 2];
                f = f + 1 | 0
            } while ((f | 0) != 4096);
            Sb(v);
            Yc(m);
            x = n;
            i = w;
            return x | 0
        }

        function Qb(d, f) {
            d = d | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0;
            Mb(12) | 0;
            r = Xc(8192) | 0;
            g = 0;
            do {
                b[r + (g << 1) >> 1] = g;
                g = g + 1 | 0
            } while ((g | 0) != 4096);
            g = 0;
            do {
                o = (Ac() | 0) & 255;
                o = (Ac() | 0) << 8 & 65280 | o;
                o = o | (Ac() | 0) << 16 & 16711680;
                o = r + ((((o | (Ac() | 0) << 24) >>> 0) % ((4096 - g | 0) >>> 0) | 0) + g << 1) | 0;
                p = b[o >> 1] | 0;
                q = r + (g << 1) | 0;
                b[o >> 1] = b[q >> 1] | 0;
                b[q >> 1] = p;
                g = g + 1 | 0
            } while ((g | 0) != 4096);
            g = ec(60, 18) | 0;
            h = Pb(r, g) | 0;
            if (!h)
                do {
                    Wb(g);
                    g = ec(60, 18) | 0;
                    h = Pb(r, g) | 0
                } while ((h | 0) == 0);
            q = gc(g) | 0;
            o = hc(g, r, 4096) | 0;
            n = d;
            p = 0;
            while (1) {
                l = n;
                m = l + 92 | 0;
                do {
                    a[l >> 0] = 0;
                    l = l + 1 | 0
                } while ((l | 0) < (m | 0));
                i = c[o + (p << 2) >> 2] | 0;
                j = c[i + 8 >> 2] | 0;
                m = 0;
                do {
                    k = m * 12 | 0;
                    l = e[j + (m << 1) >> 1] | 0;
                    s = n + (k >>> 5 << 2) | 0;
                    c[s >> 2] = l << (k & 28) ^ c[s >> 2];
                    if (((k & 28) + 12 | 0) >>> 0 > 32) {
                        s = n + ((k >>> 5) + 1 << 2) | 0;
                        c[s >> 2] = l >>> (32 - (k & 28) | 0) ^ c[s >> 2]
                    }
                    m = m + 1 | 0
                } while ((m | 0) != 60);
                Wb(i);
                p = p + 1 | 0;
                if ((p | 0) == 4096) break;
                else n = n + 92 | 0
            }
            Yc(o);
            i = Xc(8192) | 0;
            j = 0;
            do {
                b[i + ((e[r + (j << 1) >> 1] | 0) << 1) >> 1] = j;
                j = j + 1 | 0
            } while ((j | 0) != 4096);
            ed(d + 376832 | 0, i | 0, 8192) | 0;
            Yc(r);
            Yc(i);
            l = d + 385024 | 0;
            k = c[g + 8 >> 2] | 0;
            m = l + 122 | 0;
            do {
                a[l >> 0] = a[k >> 0] | 0;
                l = l + 1 | 0;
                k = k + 1 | 0
            } while ((l | 0) < (m | 0));
            Wb(g);
            g = d + 385146 | 0;
            j = 0;
            while (1) {
                i = q + (j << 2) | 0;
                l = g;
                k = c[(c[i >> 2] | 0) + 8 >> 2] | 0;
                m = l + 120 | 0;
                do {
                    a[l >> 0] = a[k >> 0] | 0;
                    l = l + 1 | 0;
                    k = k + 1 | 0
                } while ((l | 0) < (m | 0));
                Wb(c[i >> 2] | 0);
                j = j + 1 | 0;
                if ((j | 0) == 60) break;
                else g = g + 120 | 0
            }
            Yc(q);
            ed(f | 0, c[h + 16 >> 2] | 0, c[h + 12 >> 2] | 0) | 0;
            Sb(h);
            return 1
        }

        function Rb(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0;
            d = Xc(20) | 0;
            c[d + 4 >> 2] = b;
            c[d >> 2] = a;
            c[d + 8 >> 2] = ((b + -1 | 0) >>> 5) + 1;
            a = _(a << 2, ((b + -1 | 0) >>> 5) + 1 | 0) | 0;
            c[d + 12 >> 2] = a;
            c[d + 16 >> 2] = Xc(a) | 0;
            return d | 0
        }

        function Sb(a) {
            a = a | 0;
            Yc(c[a + 16 >> 2] | 0);
            Yc(a);
            return
        }

        function Tb(a) {
            a = a | 0;
            var b = 0,
                d = 0,
                e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0;
            p = c[a + 4 >> 2] | 0;
            b = Xc(p << 2) | 0;
            if ((p | 0) > 0) {
                d = 0;
                do {
                    c[b + (d << 2) >> 2] = d;
                    d = d + 1 | 0
                } while ((d | 0) < (p | 0))
            }
            n = c[a >> 2] | 0;
            if ((n | 0) <= 0) {
                s = b;
                return s | 0
            }
            e = 0;
            d = 0;
            o = p;
            while (1) {
                o = o + -1 | 0;
                a: do
                    if ((d | 0) < (n | 0)) {
                        j = c[a + 8 >> 2] | 0;
                        k = o >>> 5;
                        l = c[a + 16 >> 2] | 0;
                        m = 1 << (o & 31);
                        f = d;
                        while (1) {
                            h = _(j, f) | 0;
                            if (c[l + (h + k << 2) >> 2] & m) break;
                            f = f + 1 | 0;
                            if ((f | 0) >= (n | 0)) {
                                s = 12;
                                break a
                            }
                        }
                        if ((d | 0) != (f | 0) & (j | 0) > 0) {
                            f = _(j, d) | 0;
                            g = 0;
                            do {
                                i = l + (g + f << 2) | 0;
                                c[i >> 2] = c[i >> 2] ^ c[l + (g + h << 2) >> 2];
                                g = g + 1 | 0
                            } while ((g | 0) != (j | 0))
                        }
                        c[b + (p + d - n << 2) >> 2] = o;
                        f = d + 1 | 0;
                        if ((f | 0) < (n | 0) ? (q = _(j, d) | 0, (j | 0) > 0) : 0)
                            do {
                                g = _(j, f) | 0;
                                if (c[l + (g + k << 2) >> 2] & m) {
                                    h = 0;
                                    do {
                                        i = l + (h + g << 2) | 0;
                                        c[i >> 2] = c[i >> 2] ^ c[l + (h + q << 2) >> 2];
                                        h = h + 1 | 0
                                    } while ((h | 0) != (j | 0))
                                }
                                f = f + 1 | 0
                            } while ((f | 0) < (n | 0));
                        if ((d | 0) > 0 ? (r = _(j, d) | 0, (j | 0) > 0) : 0) {
                            h = d;
                            do {
                                i = h;
                                h = h + -1 | 0;
                                f = _(j, h) | 0;
                                if (c[l + (f + k << 2) >> 2] & m) {
                                    g = 0;
                                    do {
                                        t = l + (g + f << 2) | 0;
                                        c[t >> 2] = c[t >> 2] ^ c[l + (g + r << 2) >> 2];
                                        g = g + 1 | 0
                                    } while ((g | 0) != (j | 0))
                                }
                            } while ((i | 0) > 1)
                        }
                    } else s = 12;
                while (0);
                if ((s | 0) == 12) {
                    s = 0;
                    c[b + (p + ~e - n << 2) >> 2] = o;
                    if (!o) {
                        b = 0;
                        s = 25;
                        break
                    }
                    e = e + 1 | 0;
                    d = d + -1 | 0
                }
                d = d + 1 | 0;
                if ((d | 0) >= (n | 0)) {
                    s = 25;
                    break
                }
            }
            if ((s | 0) == 25) return b | 0;
            return 0
        }

        function Ub(a) {
            a = a | 0;
            var b = 0;
            b = Xc(12) | 0;
            c[b >> 2] = -1;
            c[b + 4 >> 2] = a + 1;
            c[b + 8 >> 2] = Zc(a + 1 | 0, 2) | 0;
            return b | 0
        }

        function Vb(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0;
            d = Xc(12) | 0;
            c[d >> 2] = -1;
            c[d + 4 >> 2] = a + 1;
            c[d + 8 >> 2] = b;
            return d | 0
        }

        function Wb(a) {
            a = a | 0;
            Yc(c[a + 8 >> 2] | 0);
            Yc(a);
            return
        }

        function Xb(a) {
            a = a | 0;
            var d = 0,
                e = 0;
            e = c[a + 4 >> 2] | 0;
            while (1) {
                d = e + -1 | 0;
                if ((e | 0) <= 0) {
                    e = 4;
                    break
                }
                if (!(b[(c[a + 8 >> 2] | 0) + (d << 1) >> 1] | 0)) e = d;
                else {
                    e = 4;
                    break
                }
            }
            if ((e | 0) == 4) {
                c[a >> 2] = d;
                return d | 0
            }
            return 0
        }

        function Yb(a, d) {
            a = a | 0;
            d = d | 0;
            var f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0;
            m = c[a + 8 >> 2] | 0;
            a = c[a >> 2] | 0;
            f = b[m + (a << 1) >> 1] | 0;
            if ((a | 0) <= 0) {
                d = f;
                return d | 0
            }
            l = c[1280] | 0;
            i = c[1281] | 0;
            j = c[1282] | 0;
            k = c[1283] | 0;
            if (!(d << 16 >> 16)) {
                d = b[m >> 1] | 0;
                return d | 0
            } else h = a;
            while (1) {
                g = h;
                h = h + -1 | 0;
                a = b[m + (h << 1) >> 1] | 0;
                if (f << 16 >> 16) {
                    f = (e[l + ((d & 65535) << 1) >> 1] | 0) + (e[l + ((f & 65535) << 1) >> 1] | 0) | 0;
                    a = a ^ b[k + ((f & i) + (f >>> j) << 1) >> 1]
                }
                if ((g | 0) <= 1) break;
                else f = a
            }
            return a | 0
        }

        function Zb(a, d) {
            a = a | 0;
            d = d | 0;
            var f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0;
            g = c[a >> 2] | 0;
            f = c[d >> 2] | 0;
            if ((g - f | 0) <= -1) return;
            q = c[1283] | 0;
            r = c[1281] | 0;
            s = c[1280] | 0;
            o = c[d + 8 >> 2] | 0;
            l = c[a + 8 >> 2] | 0;
            m = s + (e[q + (r - (e[s + (e[o + (f << 1) >> 1] << 1) >> 1] | 0) << 1) >> 1] << 1) | 0;
            n = c[1282] | 0;
            p = g - f | 0;
            while (1) {
                k = l + (g << 1) | 0;
                d = b[k >> 1] | 0;
                if (d << 16 >> 16) {
                    d = (e[s + ((d & 65535) << 1) >> 1] | 0) + (e[m >> 1] | 0) | 0;
                    if ((f | 0) > 0) {
                        h = s + (e[q + ((d & r) + (d >>> n) << 1) >> 1] << 1) | 0;
                        j = 0;
                        do {
                            i = l + (j + p << 1) | 0;
                            d = b[o + (j << 1) >> 1] | 0;
                            if (!(d << 16 >> 16)) d = 0;
                            else {
                                d = (e[s + ((d & 65535) << 1) >> 1] | 0) + (e[h >> 1] | 0) | 0;
                                d = e[q + ((d & r) + (d >>> n) << 1) >> 1] | 0
                            }
                            b[i >> 1] = d ^ e[i >> 1];
                            j = j + 1 | 0
                        } while ((j | 0) < (f | 0))
                    }
                    b[k >> 1] = 0
                }
                if ((p | 0) > 0) {
                    p = p + -1 | 0;
                    g = g + -1 | 0
                } else break
            }
            while (1) {
                d = f + -1 | 0;
                if ((f | 0) <= 0) break;
                if (!(b[(c[a + 8 >> 2] | 0) + (d << 1) >> 1] | 0)) f = d;
                else break
            }
            c[a >> 2] = d;
            return
        }

        function _b(a, d) {
            a = a | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0;
            f = c[a >> 2] | 0;
            if ((f | 0) > 1) {
                e = 0;
                do {
                    h = d + (e << 2) | 0;
                    g = c[h >> 2] | 0;
                    ad(c[g + 8 >> 2] | 0, 0, c[g + 4 >> 2] << 1 | 0) | 0;
                    c[g >> 2] = -1;
                    g = e << 1;
                    h = c[h >> 2] | 0;
                    c[h >> 2] = g;
                    b[(c[h + 8 >> 2] | 0) + (g << 1) >> 1] = 1;
                    e = e + 1 | 0
                } while ((e | 0) < ((f | 0) / 2 | 0 | 0));
                e = ((f | 0) / 2 | 0 | 0) > 1 ? (f | 0) / 2 | 0 : 1
            } else e = 0;
            if ((e | 0) >= (f | 0)) return;
            do {
                h = d + (e << 2) | 0;
                g = c[(c[h >> 2] | 0) + 8 >> 2] | 0;
                b[g >> 1] = 0;
                b[g + 2 >> 1] = 0 >>> 16;
                g = d + (e + -1 << 2) | 0;
                ed((c[(c[h >> 2] | 0) + 8 >> 2] | 0) + 4 | 0, c[(c[g >> 2] | 0) + 8 >> 2] | 0, f << 1 | 0) | 0;
                h = c[h >> 2] | 0;
                c[h >> 2] = (c[c[g >> 2] >> 2] | 0) + 2;
                Zb(h, a);
                e = e + 1 | 0
            } while ((e | 0) != (f | 0));
            return
        }

        function $b(a, d, f, g) {
            a = a | 0;
            d = d | 0;
            f = f | 0;
            g = g | 0;
            var h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0;
            ad(c[a + 8 >> 2] | 0, 0, c[a + 4 >> 2] << 1 | 0) | 0;
            c[a >> 2] = -1;
            if ((g | 0) > 1) {
                m = c[d + 8 >> 2] | 0;
                n = c[a + 8 >> 2] | 0;
                i = c[1280] | 0;
                j = c[1281] | 0;
                k = c[1282] | 0;
                l = c[1283] | 0;
                o = 0;
                do {
                    h = b[m + (o << 1) >> 1] | 0;
                    if (!(h << 16 >> 16)) h = 0;
                    else {
                        h = e[i + ((h & 65535) << 1) >> 1] << 1;
                        h = e[l + ((h & j) + (h >>> k) << 1) >> 1] | 0
                    }
                    b[n + (o << 1 << 1) >> 1] = h;
                    o = o + 1 | 0
                } while ((o | 0) < ((g | 0) / 2 | 0 | 0));
                h = ((g | 0) / 2 | 0 | 0) > 1 ? (g | 0) / 2 | 0 : 1
            } else h = 0;
            if ((h | 0) < (g | 0)) {
                o = c[d + 8 >> 2] | 0;
                d = c[1280] | 0;
                p = c[1281] | 0;
                q = c[1282] | 0;
                r = c[1283] | 0;
                n = h;
                do {
                    h = b[o + (n << 1) >> 1] | 0;
                    if (h << 16 >> 16 != 0 ? (s = e[d + ((h & 65535) << 1) >> 1] << 1, (g | 0) > 0) : 0) {
                        i = c[a + 8 >> 2] | 0;
                        j = c[(c[f + (n << 2) >> 2] | 0) + 8 >> 2] | 0;
                        k = d + (e[r + ((s & p) + (s >>> q) << 1) >> 1] << 1) | 0;
                        m = 0;
                        do {
                            l = i + (m << 1) | 0;
                            h = b[j + (m << 1) >> 1] | 0;
                            if (!(h << 16 >> 16)) h = 0;
                            else {
                                h = (e[d + ((h & 65535) << 1) >> 1] | 0) + (e[k >> 1] | 0) | 0;
                                h = e[r + ((h & p) + (h >>> q) << 1) >> 1] | 0
                            }
                            b[l >> 1] = h ^ e[l >> 1];
                            m = m + 1 | 0
                        } while ((m | 0) != (g | 0))
                    }
                    n = n + 1 | 0
                } while ((n | 0) != (g | 0))
            }
            while (1) {
                h = g + -1 | 0;
                if ((g | 0) <= 0) {
                    g = 18;
                    break
                }
                if (!(b[(c[a + 8 >> 2] | 0) + (h << 1) >> 1] | 0)) g = h;
                else {
                    g = 18;
                    break
                }
            }
            if ((g | 0) == 18) {
                c[a >> 2] = h;
                return
            }
        }

        function ac(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0,
                e = 0,
                f = 0,
                g = 0,
                h = 0;
            f = Xc(12) | 0;
            d = c[a >> 2] | 0;
            c[f >> 2] = d;
            e = c[a + 4 >> 2] | 0;
            c[f + 4 >> 2] = e;
            g = Zc(e, 2) | 0;
            c[f + 8 >> 2] = g;
            ed(g | 0, c[a + 8 >> 2] | 0, e << 1 | 0) | 0;
            e = Xc(12) | 0;
            a = c[b >> 2] | 0;
            c[e >> 2] = a;
            g = c[b + 4 >> 2] | 0;
            c[e + 4 >> 2] = g;
            h = Zc(g, 2) | 0;
            c[e + 8 >> 2] = h;
            ed(h | 0, c[b + 8 >> 2] | 0, g << 1 | 0) | 0;
            if ((d | 0) < (a | 0)) {
                if ((d | 0) == -1) a = e;
                else {
                    d = e;
                    a = f;
                    while (1) {
                        Zb(d, a);
                        if ((c[d >> 2] | 0) == -1) break;
                        else {
                            h = a;
                            a = d;
                            d = h
                        }
                    }
                }
                h = Xc(12) | 0;
                c[h >> 2] = c[a >> 2];
                g = c[a + 4 >> 2] | 0;
                c[h + 4 >> 2] = g;
                b = Zc(g, 2) | 0;
                c[h + 8 >> 2] = b;
                ed(b | 0, c[a + 8 >> 2] | 0, g << 1 | 0) | 0;
                g = c[f + 8 >> 2] | 0;
                Yc(g);
                Yc(f);
                g = c[e + 8 >> 2] | 0;
                Yc(g);
                Yc(e);
                return h | 0
            } else {
                if ((a | 0) == -1) a = f;
                else {
                    d = f;
                    a = e;
                    while (1) {
                        Zb(d, a);
                        if ((c[d >> 2] | 0) == -1) break;
                        else {
                            h = a;
                            a = d;
                            d = h
                        }
                    }
                }
                h = Xc(12) | 0;
                c[h >> 2] = c[a >> 2];
                g = c[a + 4 >> 2] | 0;
                c[h + 4 >> 2] = g;
                b = Zc(g, 2) | 0;
                c[h + 8 >> 2] = b;
                ed(b | 0, c[a + 8 >> 2] | 0, g << 1 | 0) | 0;
                g = c[f + 8 >> 2] | 0;
                Yc(g);
                Yc(f);
                g = c[e + 8 >> 2] | 0;
                Yc(g);
                Yc(e);
                return h | 0
            }
            return 0
        }

        function bc(a, d) {
            a = a | 0;
            d = d | 0;
            var f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0;
            g = c[d + 4 >> 2] | 0;
            while (1) {
                f = g + -1 | 0;
                if ((g | 0) <= 0) break;
                if (!(b[(c[d + 8 >> 2] | 0) + (f << 1) >> 1] | 0)) g = f;
                else break
            }
            c[d >> 2] = f;
            j = c[a + 4 >> 2] | 0;
            i = j;
            while (1) {
                h = i + -1 | 0;
                if ((i | 0) <= 0) break;
                if (!(b[(c[a + 8 >> 2] | 0) + (h << 1) >> 1] | 0)) i = h;
                else break
            }
            c[a >> 2] = h;
            u = Zc(j, 2) | 0;
            ed(u | 0, c[a + 8 >> 2] | 0, j << 1 | 0) | 0;
            r = h - f | 0;
            s = Xc(12) | 0;
            c[s + 4 >> 2] = r + 1;
            t = Zc(r + 1 | 0, 2) | 0;
            c[s + 8 >> 2] = t;
            c[s >> 2] = r;
            if ((i | 0) <= (f | 0)) {
                Yc(u);
                return s | 0
            }
            p = c[1283] | 0;
            q = c[1281] | 0;
            r = c[1280] | 0;
            m = c[d + 8 >> 2] | 0;
            n = c[1282] | 0;
            o = r + (e[p + (q - (e[r + (e[m + (f << 1) >> 1] << 1) >> 1] | 0) << 1) >> 1] << 1) | 0;
            l = (g | 0) > 1;
            while (1) {
                g = b[u + (h << 1) >> 1] | 0;
                if (g << 16 >> 16) {
                    i = (e[r + ((g & 65535) << 1) >> 1] | 0) + (e[o >> 1] | 0) | 0;
                    i = b[p + ((i & q) + (i >>> n) << 1) >> 1] | 0;
                    j = h - f | 0;
                    b[t + (j << 1) >> 1] = i;
                    if (i << 16 >> 16 != 0 ? (b[u + (h << 1) >> 1] = 0, l) : 0) {
                        a = f - h | 0;
                        k = h;
                        do {
                            k = k + -1 | 0;
                            d = u + (k << 1) | 0;
                            g = b[m + (a + k << 1) >> 1] | 0;
                            if (!(g << 16 >> 16)) g = 0;
                            else {
                                g = (e[r + ((g & 65535) << 1) >> 1] | 0) + (e[r + ((i & 65535) << 1) >> 1] | 0) | 0;
                                g = e[p + ((g & q) + (g >>> n) << 1) >> 1] | 0
                            }
                            b[d >> 1] = g ^ e[d >> 1]
                        } while ((k | 0) > (j | 0))
                    }
                } else b[t + (h - f << 1) >> 1] = 0;
                if ((h | 0) > (f | 0)) h = h + -1 | 0;
                else break
            }
            Yc(u);
            return s | 0
        }

        function cc(a) {
            a = a | 0;
            var d = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0;
            n = c[a >> 2] | 0;
            o = Xc(n << 2) | 0;
            if ((n | 0) > 0) {
                d = 0;
                do {
                    m = Xc(12) | 0;
                    c[m >> 2] = -1;
                    c[m + 4 >> 2] = n + 2;
                    c[m + 8 >> 2] = Zc(n + 2 | 0, 2) | 0;
                    c[o + (d << 2) >> 2] = m;
                    d = d + 1 | 0
                } while ((d | 0) != (n | 0));
                if ((n | 0) > 1) {
                    d = 0;
                    do {
                        l = c[o + (d << 2) >> 2] | 0;
                        ad(c[l + 8 >> 2] | 0, 0, c[l + 4 >> 2] << 1 | 0) | 0;
                        m = d << 1;
                        c[l >> 2] = m;
                        b[(c[l + 8 >> 2] | 0) + (m << 1) >> 1] = 1;
                        d = d + 1 | 0
                    } while ((d | 0) < ((n | 0) / 2 | 0 | 0));
                    m = (n | 0) / 2 | 0;
                    d = ((n | 0) / 2 | 0 | 0) > 1 ? (n | 0) / 2 | 0 : 1
                } else {
                    m = (n | 0) / 2 | 0;
                    d = 0
                }
            } else {
                m = (n | 0) / 2 | 0;
                d = 0
            }
            if ((d | 0) < (n | 0))
                do {
                    l = c[o + (d << 2) >> 2] | 0;
                    k = c[l + 8 >> 2] | 0;
                    b[k >> 1] = 0;
                    b[k + 2 >> 1] = 0 >>> 16;
                    k = c[o + (d + -1 << 2) >> 2] | 0;
                    ed((c[l + 8 >> 2] | 0) + 4 | 0, c[k + 8 >> 2] | 0, n << 1 | 0) | 0;
                    c[l >> 2] = (c[k >> 2] | 0) + 2;
                    Zb(l, a);
                    d = d + 1 | 0
                } while ((d | 0) != (n | 0));
            d = Xc(12) | 0;
            c[d + 4 >> 2] = n;
            f = Zc(n, 2) | 0;
            c[d + 8 >> 2] = f;
            c[d >> 2] = 1;
            b[f + 2 >> 1] = 1;
            f = Xc(12) | 0;
            c[f >> 2] = -1;
            c[f + 4 >> 2] = n;
            c[f + 8 >> 2] = Zc(n, 2) | 0;
            a: do
                if ((_(c[1282] | 0, m) | 0) < 1) {
                    h = d;
                    d = f;
                    f = n
                } else {
                    l = 1;
                    while (1) {
                        $b(f, d, o, n);
                        g = c[1282] | 0;
                        if (!((l | 0) % (g | 0) | 0)) {
                            j = f + 8 | 0;
                            h = c[j >> 2] | 0;
                            b[h + 2 >> 1] = e[h + 2 >> 1] ^ 1;
                            k = f + 4 | 0;
                            i = c[k >> 2] | 0;
                            while (1) {
                                g = i + -1 | 0;
                                if ((i | 0) <= 0) break;
                                if (!(b[h + (g << 1) >> 1] | 0)) i = g;
                                else break
                            }
                            c[f >> 2] = g;
                            h = ac(a, f) | 0;
                            i = (c[h >> 2] | 0) > 0;
                            Yc(c[h + 8 >> 2] | 0);
                            Yc(h);
                            if (i) {
                                g = l;
                                break
                            }
                            i = c[j >> 2] | 0;
                            b[i + 2 >> 1] = e[i + 2 >> 1] ^ 1;
                            h = c[k >> 2] | 0;
                            while (1) {
                                g = h + -1 | 0;
                                if ((h | 0) <= 0) break;
                                if (!(b[i + (g << 1) >> 1] | 0)) h = g;
                                else break
                            }
                            c[f >> 2] = g;
                            g = c[1282] | 0
                        }
                        if ((l | 0) < (_(g, m) | 0)) {
                            k = f;
                            l = l + 1 | 0;
                            f = d;
                            d = k
                        } else {
                            h = f;
                            f = n;
                            break a
                        }
                    }
                    h = d;
                    d = f;
                    f = (g | 0) / (c[1282] | 0) | 0
                }
            while (0);
            Yc(c[h + 8 >> 2] | 0);
            Yc(h);
            Yc(c[d + 8 >> 2] | 0);
            Yc(d);
            if ((n | 0) > 0) d = 0;
            else {
                Yc(o);
                return f | 0
            }
            do {
                a = c[o + (d << 2) >> 2] | 0;
                Yc(c[a + 8 >> 2] | 0);
                Yc(a);
                d = d + 1 | 0
            } while ((d | 0) != (n | 0));
            Yc(o);
            return f | 0
        }

        function dc(a, d, f, g, h) {
            a = a | 0;
            d = d | 0;
            f = f | 0;
            g = g | 0;
            h = h | 0;
            var i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0,
                w = 0,
                x = 0,
                y = 0,
                z = 0,
                A = 0,
                B = 0,
                C = 0,
                D = 0,
                E = 0;
            o = c[g >> 2] | 0;
            k = Xc(12) | 0;
            c[k >> 2] = -1;
            c[k + 4 >> 2] = o + 1;
            p = Zc(o + 1 | 0, 2) | 0;
            c[k + 8 >> 2] = p;
            q = Xc(12) | 0;
            c[q >> 2] = -1;
            c[q + 4 >> 2] = o;
            n = Zc(o, 2) | 0;
            c[q + 8 >> 2] = n;
            i = Xc(12) | 0;
            c[i >> 2] = -1;
            c[i + 4 >> 2] = o;
            c[i + 8 >> 2] = Zc(o, 2) | 0;
            j = Xc(12) | 0;
            c[j >> 2] = -1;
            c[j + 4 >> 2] = o;
            c[j + 8 >> 2] = Zc(o, 2) | 0;
            l = c[g + 4 >> 2] | 0;
            m = c[g + 8 >> 2] | 0;
            if ((o + 1 - l | 0) < 0) {
                ed(p | 0, m | 0, o + 1 << 1 | 0) | 0;
                m = o + 1 | 0;
                while (1) {
                    l = m + -1 | 0;
                    if ((m | 0) <= 0) break;
                    if (!(b[p + (l << 1) >> 1] | 0)) m = l;
                    else break
                }
                c[k >> 2] = l
            } else {
                ed(p | 0, m | 0, l << 1 | 0) | 0;
                ad(p + (l << 1) | 0, 0, o + 1 - l << 1 | 0) | 0;
                c[k >> 2] = c[g >> 2];
                o = c[q + 4 >> 2] | 0;
                n = c[q + 8 >> 2] | 0
            }
            l = c[f + 4 >> 2] | 0;
            m = o - l | 0;
            g = c[f + 8 >> 2] | 0;
            a: do
                if ((m | 0) < 0) {
                    ed(n | 0, g | 0, o << 1 | 0) | 0;
                    m = c[q + 4 >> 2] | 0;
                    while (1) {
                        l = m + -1 | 0;
                        if ((m | 0) <= 0) break a;
                        if (!(b[(c[q + 8 >> 2] | 0) + (l << 1) >> 1] | 0)) m = l;
                        else break
                    }
                } else {
                    ed(n | 0, g | 0, l << 1 | 0) | 0;
                    ad((c[q + 8 >> 2] | 0) + (c[f + 4 >> 2] << 1) | 0, 0, m << 1 | 0) | 0;
                    l = c[f >> 2] | 0
                }
            while (0);
            c[q >> 2] = l;
            ad(c[i + 8 >> 2] | 0, 0, c[i + 4 >> 2] << 1 | 0) | 0;
            c[i >> 2] = -1;
            ad(c[j + 8 >> 2] | 0, 0, c[j + 4 >> 2] << 1 | 0) | 0;
            b[c[j + 8 >> 2] >> 1] = 1;
            c[j >> 2] = 0;
            l = c[q >> 2] | 0;
            if ((l | 0) < (h | 0)) {
                B = l;
                A = 0;
                E = k;
                D = q;
                h = i;
                C = j;
                c[C >> 2] = A;
                c[D >> 2] = B;
                c[a >> 2] = C;
                c[d >> 2] = D;
                d = E + 8 | 0;
                d = c[d >> 2] | 0;
                Yc(d);
                Yc(E);
                d = h + 8 | 0;
                d = c[d >> 2] | 0;
                Yc(d);
                Yc(h);
                return
            }
            y = c[1280] | 0;
            z = c[1281] | 0;
            A = c[1282] | 0;
            B = c[1283] | 0;
            C = (c[k >> 2] | 0) - l | 0;
            x = l;
            m = 0;
            l = q;
            while (1) {
                w = c[k + 8 >> 2] | 0;
                if ((C | 0) > -1) {
                    q = l + 8 | 0;
                    r = (m | 0) < 0;
                    s = (x | 0) < 0;
                    t = i + 8 | 0;
                    u = j + 8 | 0;
                    v = C;
                    while (1) {
                        g = b[w + (v + x << 1) >> 1] | 0;
                        if (g << 16 >> 16 != 0 ? (D = c[q >> 2] | 0, E = (e[y + ((g & 65535) << 1) >> 1] | 0) - (e[y + (e[D + (x << 1) >> 1] << 1) >> 1] | 0) | 0, E = b[B + ((E & z) + (E >> A) << 1) >> 1] | 0, E << 16 >> 16 != 0) : 0) {
                            if (!r) {
                                n = c[t >> 2] | 0;
                                o = c[u >> 2] | 0;
                                f = 0;
                                while (1) {
                                    p = n + (f + v << 1) | 0;
                                    g = b[o + (f << 1) >> 1] | 0;
                                    if (!(g << 16 >> 16)) g = 0;
                                    else {
                                        g = (e[y + ((g & 65535) << 1) >> 1] | 0) + (e[y + ((E & 65535) << 1) >> 1] | 0) | 0;
                                        g = e[B + ((g & z) + (g >>> A) << 1) >> 1] | 0
                                    }
                                    b[p >> 1] = g ^ e[p >> 1];
                                    if ((f | 0) == (m | 0)) break;
                                    else f = f + 1 | 0
                                }
                            }
                            if (!s) {
                                o = 0;
                                while (1) {
                                    n = w + (o + v << 1) | 0;
                                    g = b[D + (o << 1) >> 1] | 0;
                                    if (!(g << 16 >> 16)) g = 0;
                                    else {
                                        g = (e[y + ((g & 65535) << 1) >> 1] | 0) + (e[y + ((E & 65535) << 1) >> 1] | 0) | 0;
                                        g = e[B + ((g & z) + (g >>> A) << 1) >> 1] | 0
                                    }
                                    b[n >> 1] = g ^ e[n >> 1];
                                    if ((o | 0) == (x | 0)) break;
                                    else o = o + 1 | 0
                                }
                            }
                        }
                        if ((v | 0) > 0) v = v + -1 | 0;
                        else {
                            n = 1;
                            break
                        }
                    }
                } else n = 1;
                while (1) {
                    g = x - n | 0;
                    if (!(b[w + (g << 1) >> 1] | 0)) n = n + 1 | 0;
                    else break
                }
                m = C + m | 0;
                if ((g | 0) < (h | 0)) break;
                else {
                    v = j;
                    w = l;
                    C = n;
                    x = g;
                    j = i;
                    i = v;
                    l = k;
                    k = w
                }
            }
            c[i >> 2] = m;
            c[k >> 2] = g;
            c[a >> 2] = i;
            c[d >> 2] = k;
            d = l + 8 | 0;
            d = c[d >> 2] | 0;
            Yc(d);
            Yc(l);
            d = j + 8 | 0;
            d = c[d >> 2] | 0;
            Yc(d);
            Yc(j);
            return
        }

        function ec(a, d) {
            a = a | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0;
            e = Xc(12) | 0;
            c[e + 4 >> 2] = a + 1;
            f = Zc(a + 1 | 0, 2) | 0;
            c[e + 8 >> 2] = f;
            c[e >> 2] = a;
            b[f + (a << 1) >> 1] = 1;
            g = 0;
            while (1)
                if ((g | 0) >= (a | 0))
                    if ((cc(e) | 0) < (a | 0)) {
                        g = 0;
                        continue
                    } else break;
            else {
                b[f + (g << 1) >> 1] = Nb(d) | 0;
                g = g + 1 | 0;
                continue
            }
            return e | 0
        }

        function fc(a, d) {
            a = a | 0;
            d = d | 0;
            var f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0;
            f = c[d >> 2] | 0;
            o = c[a + 8 >> 2] | 0;
            a = b[o + (f + -1 << 1) >> 1] | 0;
            if (!(a << 16 >> 16)) m = 0;
            else {
                m = c[1280] | 0;
                m = (e[m + ((a & 65535) << 1) >> 1] | 0) - (e[m + ((e[(c[d + 8 >> 2] | 0) + (f << 1) >> 1] | 0) << 1) >> 1] | 0) | 0;
                m = b[(c[1283] | 0) + ((m & c[1281]) + (m >> c[1282]) << 1) >> 1] | 0
            }
            n = m & 65535;
            a: do
                if ((f | 0) > 1) {
                    h = c[1280] | 0;
                    i = c[1281] | 0;
                    j = c[1282] | 0;
                    k = c[1283] | 0;
                    if (!(m << 16 >> 16)) {
                        a = f + -1 | 0;
                        while (1) {
                            l = a;
                            a = a + -1 | 0;
                            b[o + (l << 1) >> 1] = b[o + (a << 1) >> 1] | 0;
                            if ((l | 0) <= 1) break a
                        }
                    }
                    l = c[d + 8 >> 2] | 0;
                    f = f + -1 | 0;
                    do {
                        g = f;
                        f = f + -1 | 0;
                        a = b[l + (g << 1) >> 1] | 0;
                        if (!(a << 16 >> 16)) a = 0;
                        else {
                            a = (e[h + ((a & 65535) << 1) >> 1] | 0) + (e[h + (n << 1) >> 1] | 0) | 0;
                            a = e[k + ((a & i) + (a >>> j) << 1) >> 1] | 0
                        }
                        b[o + (g << 1) >> 1] = a ^ (e[o + (f << 1) >> 1] | 0)
                    } while ((g | 0) > 1)
                }
            while (0);
            if (!(m << 16 >> 16)) {
                d = 0;
                b[o >> 1] = d;
                return
            }
            a = b[c[d + 8 >> 2] >> 1] | 0;
            if (!(a << 16 >> 16)) {
                d = 0;
                b[o >> 1] = d;
                return
            }
            d = c[1280] | 0;
            d = (e[d + ((a & 65535) << 1) >> 1] | 0) + (e[d + (n << 1) >> 1] | 0) | 0;
            d = b[(c[1283] | 0) + ((d & c[1281]) + (d >>> (c[1282] | 0)) << 1) >> 1] | 0;
            b[o >> 1] = d;
            return
        }

        function gc(a) {
            a = a | 0;
            var d = 0,
                e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0;
            r = c[a >> 2] | 0;
            s = Xc(r << 2) | 0;
            if ((r | 0) > 0) {
                d = 0;
                do {
                    q = Xc(12) | 0;
                    c[q >> 2] = -1;
                    c[q + 4 >> 2] = r + 2;
                    c[q + 8 >> 2] = Zc(r + 2 | 0, 2) | 0;
                    c[s + (d << 2) >> 2] = q;
                    d = d + 1 | 0
                } while ((d | 0) != (r | 0));
                if ((r | 0) > 1) {
                    d = 0;
                    do {
                        p = c[s + (d << 2) >> 2] | 0;
                        ad(c[p + 8 >> 2] | 0, 0, c[p + 4 >> 2] << 1 | 0) | 0;
                        q = d << 1;
                        c[p >> 2] = q;
                        b[(c[p + 8 >> 2] | 0) + (q << 1) >> 1] = 1;
                        d = d + 1 | 0
                    } while ((d | 0) < ((r | 0) / 2 | 0 | 0));
                    d = ((r | 0) / 2 | 0 | 0) > 1 ? (r | 0) / 2 | 0 : 1
                } else d = 0
            } else d = 0;
            if ((d | 0) < (r | 0))
                do {
                    q = c[s + (d << 2) >> 2] | 0;
                    p = c[q + 8 >> 2] | 0;
                    b[p >> 1] = 0;
                    b[p + 2 >> 1] = 0 >>> 16;
                    p = c[s + (d + -1 << 2) >> 2] | 0;
                    ed((c[q + 8 >> 2] | 0) + 4 | 0, c[p + 8 >> 2] | 0, r << 1 | 0) | 0;
                    c[q >> 2] = (c[p >> 2] | 0) + 2;
                    Zb(q, a);
                    d = d + 1 | 0
                } while ((d | 0) != (r | 0));
            e = Xc(12) | 0;
            c[e >> 2] = -1;
            c[e + 4 >> 2] = r;
            c[e + 8 >> 2] = Zc(r, 2) | 0;
            d = Xc(12) | 0;
            c[d + 4 >> 2] = r;
            q = Zc(r, 2) | 0;
            c[d + 8 >> 2] = q;
            c[d >> 2] = 1;
            b[q + 2 >> 1] = 1;
            if ((_(c[1282] | 0, r) | 0) > 1) {
                f = 0;
                g = d;
                d = e;
                while (1) {
                    $b(d, g, s, r);
                    f = f + 1 | 0;
                    if ((f | 0) >= ((_(c[1282] | 0, r) | 0) + -1 | 0)) break;
                    else {
                        q = d;
                        d = g;
                        g = q
                    }
                }
            } else g = e;
            q = Xc(r << 2) | 0;
            if ((r | 0) > 0) {
                e = 0;
                do {
                    p = Xc(12) | 0;
                    c[p >> 2] = -1;
                    c[p + 4 >> 2] = r;
                    c[p + 8 >> 2] = Zc(r, 2) | 0;
                    c[q + (e << 2) >> 2] = p;
                    e = e + 1 | 0
                } while ((e | 0) != (r | 0));
                m = q + 4 | 0;
                n = c[q + 4 >> 2] | 0
            } else {
                m = q + 4 | 0;
                n = 0
            }
            e = n + 4 | 0;
            f = c[e >> 2] | 0;
            h = d + 4 | 0;
            i = c[h >> 2] | 0;
            l = n + 8 | 0;
            j = c[l >> 2] | 0;
            p = d + 8 | 0;
            k = c[p >> 2] | 0;
            if ((f - i | 0) < 0) {
                ed(j | 0, k | 0, f << 1 | 0) | 0;
                f = c[e >> 2] | 0;
                while (1) {
                    e = f + -1 | 0;
                    if ((f | 0) <= 0) break;
                    if (!(b[(c[l >> 2] | 0) + (e << 1) >> 1] | 0)) f = e;
                    else break
                }
                c[n >> 2] = e
            } else {
                ed(j | 0, k | 0, i << 1 | 0) | 0;
                ad((c[l >> 2] | 0) + (c[h >> 2] << 1) | 0, 0, f - i << 1 | 0) | 0;
                c[n >> 2] = c[d >> 2]
            }
            i = c[m >> 2] | 0;
            h = c[i + 4 >> 2] | 0;
            f = h;
            while (1) {
                e = f + -1 | 0;
                if ((f | 0) <= 0) break;
                if (!(b[(c[i + 8 >> 2] | 0) + (e << 1) >> 1] | 0)) f = e;
                else break
            }
            c[i >> 2] = e;
            if ((r | 0) > 3) {
                o = 3;
                do {
                    k = i;
                    i = c[q + (o << 2) >> 2] | 0;
                    m = i + 4 | 0;
                    e = c[m >> 2] | 0;
                    f = e - h | 0;
                    n = i + 8 | 0;
                    j = c[n >> 2] | 0;
                    l = c[k + 8 >> 2] | 0;
                    if ((f | 0) < 0) {
                        ed(j | 0, l | 0, e << 1 | 0) | 0;
                        f = c[m >> 2] | 0;
                        while (1) {
                            e = f + -1 | 0;
                            if ((f | 0) <= 0) break;
                            if (!(b[(c[n >> 2] | 0) + (e << 1) >> 1] | 0)) f = e;
                            else break
                        }
                        c[i >> 2] = e
                    } else {
                        ed(j | 0, l | 0, h << 1 | 0) | 0;
                        ad((c[n >> 2] | 0) + (c[k + 4 >> 2] << 1) | 0, 0, f << 1 | 0) | 0;
                        c[i >> 2] = c[k >> 2]
                    }
                    fc(i, a);
                    h = c[m >> 2] | 0;
                    f = h;
                    while (1) {
                        e = f + -1 | 0;
                        if ((f | 0) <= 0) break;
                        if (!(b[(c[n >> 2] | 0) + (e << 1) >> 1] | 0)) f = e;
                        else break
                    }
                    c[i >> 2] = e;
                    o = o + 2 | 0
                } while ((o | 0) < (r | 0))
            }
            if ((r | 0) > 0) e = 0;
            else {
                Yc(s);
                s = c[p >> 2] | 0;
                Yc(s);
                Yc(d);
                s = g + 8 | 0;
                s = c[s >> 2] | 0;
                Yc(s);
                Yc(g);
                return q | 0
            }
            do {
                a = c[q + (e << 2) >> 2] | 0;
                ad(c[a + 8 >> 2] | 0, 0, c[a + 4 >> 2] << 1 | 0) | 0;
                o = (e | 0) / 2 | 0;
                b[(c[a + 8 >> 2] | 0) + (o << 1) >> 1] = 1;
                c[a >> 2] = o;
                e = e + 2 | 0
            } while ((e | 0) < (r | 0));
            if ((r | 0) > 0) e = 0;
            else {
                Yc(s);
                s = c[p >> 2] | 0;
                Yc(s);
                Yc(d);
                s = g + 8 | 0;
                s = c[s >> 2] | 0;
                Yc(s);
                Yc(g);
                return q | 0
            }
            do {
                a = c[s + (e << 2) >> 2] | 0;
                Yc(c[a + 8 >> 2] | 0);
                Yc(a);
                e = e + 1 | 0
            } while ((e | 0) != (r | 0));
            Yc(s);
            s = c[p >> 2] | 0;
            Yc(s);
            Yc(d);
            s = g + 8 | 0;
            s = c[s >> 2] | 0;
            Yc(s);
            Yc(g);
            return q | 0
        }

        function hc(a, d, f) {
            a = a | 0;
            d = d | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0,
                w = 0;
            s = Xc(f << 2) | 0;
            t = c[a >> 2] | 0;
            if ((f | 0) <= 0) return s | 0;
            w = 0;
            do {
                r = Xc(12) | 0;
                c[r >> 2] = -1;
                c[r + 4 >> 2] = t;
                i = Zc(t, 2) | 0;
                c[r + 8 >> 2] = i;
                c[s + (w << 2) >> 2] = r;
                b[i + (t + -1 << 1) >> 1] = 1;
                i = c[a + 8 >> 2] | 0;
                q = d + (w << 1) | 0;
                if ((t + -2 | 0) > -1) {
                    j = c[r + 8 >> 2] | 0;
                    k = c[1280] | 0;
                    l = c[1281] | 0;
                    m = c[1282] | 0;
                    n = c[1283] | 0;
                    p = t + -2 | 0;
                    while (1) {
                        g = p + 1 | 0;
                        o = e[i + (g << 1) >> 1] | 0;
                        h = b[q >> 1] | 0;
                        if (h << 16 >> 16 != 0 ? (u = b[j + (g << 1) >> 1] | 0, u << 16 >> 16 != 0) : 0) {
                            g = (e[k + ((u & 65535) << 1) >> 1] | 0) + (e[k + ((h & 65535) << 1) >> 1] | 0) | 0;
                            g = e[n + ((g & l) + (g >>> m) << 1) >> 1] | 0
                        } else g = 0;
                        b[j + (p << 1) >> 1] = g ^ o;
                        if ((p | 0) > 0) p = p + -1 | 0;
                        else break
                    }
                }
                h = e[i >> 1] | 0;
                g = b[q >> 1] | 0;
                if (g << 16 >> 16 != 0 ? (v = b[c[r + 8 >> 2] >> 1] | 0, v << 16 >> 16 != 0) : 0) {
                    q = c[1280] | 0;
                    g = (e[q + ((v & 65535) << 1) >> 1] | 0) + (e[q + ((g & 65535) << 1) >> 1] | 0) | 0;
                    g = e[(c[1283] | 0) + ((g & c[1281]) + (g >>> (c[1282] | 0)) << 1) >> 1] | 0
                } else g = 0;
                if ((t | 0) > 0) {
                    n = c[r + 8 >> 2] | 0;
                    o = c[1280] | 0;
                    h = o + ((g ^ h) << 1) | 0;
                    i = c[1281] | 0;
                    j = c[1282] | 0;
                    k = c[1283] | 0;
                    m = 0;
                    do {
                        l = n + (m << 1) | 0;
                        g = b[l >> 1] | 0;
                        if (!(g << 16 >> 16)) g = 0;
                        else {
                            g = (e[o + ((g & 65535) << 1) >> 1] | 0) - (e[h >> 1] | 0) | 0;
                            g = e[k + ((g & i) + (g >> j) << 1) >> 1] | 0
                        }
                        b[l >> 1] = g;
                        m = m + 1 | 0
                    } while ((m | 0) != (t | 0))
                }
                w = w + 1 | 0
            } while ((w | 0) != (f | 0));
            return s | 0
        }

        function ic() {
            var a = 0;
            a = Xc(256) | 0;
            Va();
            Wa(a, 256);
            zc(Ca(0) | 0, a, 256) | 0;
            return
        }

        function jc() {
            return 310592
        }

        function kc() {
            return 392346
        }

        function lc() {
            return 512
        }

        function mc() {
            return 478
        }

        function nc(a, b) {
            a = a | 0;
            b = b | 0;
            Qb(b, a) | 0;
            return
        }

        function oc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            Lb(c, a, b) | 0;
            return
        }

        function pc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            Bb(c, a, b) | 0;
            return
        }

        function qc() {
            var a = 0;
            if (!(c[1902] | 0)) a = 7660;
            else a = c[(ta() | 0) + 60 >> 2] | 0;
            return a | 0
        }

        function rc(b) {
            b = b | 0;
            var c = 0,
                e = 0;
            c = 0;
            while (1) {
                if ((d[9616 + c >> 0] | 0) == (b | 0)) {
                    e = 2;
                    break
                }
                c = c + 1 | 0;
                if ((c | 0) == 87) {
                    c = 87;
                    b = 9704;
                    e = 5;
                    break
                }
            }
            if ((e | 0) == 2)
                if (!c) b = 9704;
                else {
                    b = 9704;
                    e = 5
                }
            if ((e | 0) == 5)
                while (1) {
                    e = b;
                    while (1) {
                        b = e + 1 | 0;
                        if (!(a[e >> 0] | 0)) break;
                        else e = b
                    }
                    c = c + -1 | 0;
                    if (!c) break;
                    else e = 5
                }
            return b | 0
        }

        function sc(a) {
            a = a | 0;
            if (a >>> 0 > 4294963200) {
                c[(qc() | 0) >> 2] = 0 - a;
                a = -1
            }
            return a | 0
        }

        function tc(a) {
            a = +a;
            var b = 0,
                d = 0,
                e = 0.0;
            b = (g[k >> 2] = a, c[k >> 2] | 0);
            do
                if ((b & 2147483647) >>> 0 > 2139095039) a = a + a;
                else {
                    if ((b & 2147483647) >>> 0 < 8388608) {
                        if (!(b & 2147483647)) break;
                        b = (g[k >> 2] = a * 16777216.0, c[k >> 2] | 0);
                        d = (((b & 2147483647) >>> 0) / 3 | 0) + 642849266 | 0
                    } else d = (((b & 2147483647) >>> 0) / 3 | 0) + 709958130 | 0;
                    e = (c[k >> 2] = b & -2147483648 | d, +g[k >> 2]);
                    e = e * (a + a + e * (e * e)) / (e * (e * e) + (a + e * (e * e)));
                    a = e * (a + a + e * (e * e)) / (e * (e * e) + (a + e * (e * e)))
                }
            while (0);
            return +a
        }

        function uc(a, b) {
            a = +a;
            b = b | 0;
            var d = 0,
                e = 0,
                f = 0;
            h[k >> 3] = a;
            d = c[k >> 2] | 0;
            e = c[k + 4 >> 2] | 0;
            f = bd(d | 0, e | 0, 52) | 0;
            switch (f & 2047 | 0) {
                case 0:
                    {
                        if (a != 0.0) {
                            a = +uc(a * 18446744073709551616.0, b);
                            d = (c[b >> 2] | 0) + -64 | 0
                        } else d = 0;
                        c[b >> 2] = d;
                        break
                    }
                case 2047:
                    break;
                default:
                    {
                        c[b >> 2] = (f & 2047) + -1022;
                        c[k >> 2] = d;
                        c[k + 4 >> 2] = e & -2146435073 | 1071644672;
                        a = +h[k >> 3]
                    }
            }
            return +a
        }

        function vc(a, b) {
            a = +a;
            b = b | 0;
            return +(+uc(a, b))
        }

        function wc(a) {
            a = +a;
            var b = 0.0,
                d = 0,
                e = 0;
            h[k >> 3] = a;
            e = c[k + 4 >> 2] | 0;
            d = bd(c[k >> 2] | 0, e | 0, 52) | 0;
            do
                if ((d & 2047) >>> 0 <= 1074) {
                    b = (e | 0) < 0 ? -a : a;
                    if ((d & 2047) >>> 0 < 1022) {
                        a = a * 0.0;
                        break
                    }
                    if (!(b + 4503599627370496.0 + -4503599627370496.0 - b > .5))
                        if (!(b + 4503599627370496.0 + -4503599627370496.0 - b <= -.5)) a = b + (b + 4503599627370496.0 + -4503599627370496.0 - b);
                        else a = b + (b + 4503599627370496.0 + -4503599627370496.0 - b) + 1.0;
                    else a = b + (b + 4503599627370496.0 + -4503599627370496.0 - b) + -1.0;
                    a = (e | 0) < 0 ? -a : a
                }
            while (0);
            return +a
        }

        function xc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            do
                if (b) {
                    if (d >>> 0 < 128) {
                        a[b >> 0] = d;
                        b = 1;
                        break
                    }
                    if (d >>> 0 < 2048) {
                        a[b >> 0] = d >>> 6 | 192;
                        a[b + 1 >> 0] = d & 63 | 128;
                        b = 2;
                        break
                    }
                    if (d >>> 0 < 55296 | (d & -8192 | 0) == 57344) {
                        a[b >> 0] = d >>> 12 | 224;
                        a[b + 1 >> 0] = d >>> 6 & 63 | 128;
                        a[b + 2 >> 0] = d & 63 | 128;
                        b = 3;
                        break
                    }
                    if ((d + -65536 | 0) >>> 0 < 1048576) {
                        a[b >> 0] = d >>> 18 | 240;
                        a[b + 1 >> 0] = d >>> 12 & 63 | 128;
                        a[b + 2 >> 0] = d >>> 6 & 63 | 128;
                        a[b + 3 >> 0] = d & 63 | 128;
                        b = 4;
                        break
                    } else {
                        c[(qc() | 0) >> 2] = 84;
                        b = -1;
                        break
                    }
                } else b = 1;
            while (0);
            return b | 0
        }

        function yc(a, b) {
            a = a | 0;
            b = b | 0;
            if (!a) a = 0;
            else a = xc(a, b, 0) | 0;
            return a | 0
        }

        function zc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0;
            if (d >>> 0 < 8) e = 0;
            else {
                za(7664);
                e = (c[1921] | 0) + -4 | 0;
                c[e >> 2] = c[1919] << 8 | c[1918] << 16 | c[1920];
                do
                    if (d >>> 0 >= 32) {
                        if (d >>> 0 < 64) {
                            c[1918] = 7;
                            break
                        }
                        if (d >>> 0 < 128) {
                            c[1918] = 15;
                            break
                        }
                        if (d >>> 0 < 256) {
                            c[1918] = 31;
                            break
                        } else {
                            c[1918] = 63;
                            break
                        }
                    } else c[1918] = 0;
                while (0);
                c[1921] = b + 4;
                Rc(a);
                c[(c[1921] | 0) + -4 >> 2] = c[1919] << 8 | c[1918] << 16 | c[1920];
                wa(7664)
            }
            return e | 0
        }

        function Ac() {
            var a = 0,
                b = 0,
                d = 0;
            za(7664);
            if (!(c[1918] | 0)) {
                b = c[1921] | 0;
                a = (_(c[b >> 2] | 0, 1103515245) | 0) + 12345 & 2147483647;
                c[b >> 2] = a
            } else {
                a = c[1921] | 0;
                b = a + (c[1919] << 2) | 0;
                c[b >> 2] = (c[b >> 2] | 0) + (c[a + (c[1920] << 2) >> 2] | 0);
                b = c[1919] | 0;
                a = (c[a + (b << 2) >> 2] | 0) >>> 1;
                d = c[1918] | 0;
                c[1919] = (b + 1 | 0) == (d | 0) ? 0 : b + 1 | 0;
                b = (c[1920] | 0) + 1 | 0;
                c[1920] = (b | 0) == (d | 0) ? 0 : b
            }
            wa(7664);
            return a | 0
        }

        function Bc(a) {
            a = a | 0;
            return 0
        }

        function Cc(a) {
            a = a | 0;
            return
        }

        function Dc(b, e) {
            b = b | 0;
            e = e | 0;
            var f = 0,
                g = 0,
                h = 0;
            h = i;
            i = i + 16 | 0;
            a[h >> 0] = e;
            f = c[b + 16 >> 2] | 0;
            if (!f)
                if (!(Ic(b) | 0)) {
                    f = c[b + 16 >> 2] | 0;
                    g = 4
                } else f = -1;
            else g = 4;
            do
                if ((g | 0) == 4) {
                    g = c[b + 20 >> 2] | 0;
                    if (g >>> 0 < f >>> 0 ? (e & 255 | 0) != (a[b + 75 >> 0] | 0) : 0) {
                        c[b + 20 >> 2] = g + 1;
                        a[g >> 0] = e;
                        f = e & 255;
                        break
                    }
                    if ((Ka[c[b + 36 >> 2] & 31](b, h, 1) | 0) == 1) f = d[h >> 0] | 0;
                    else f = -1
                }
            while (0);
            i = h;
            return f | 0
        }

        function Ec(a) {
            a = a | 0;
            var b = 0;
            b = i;
            i = i + 16 | 0;
            c[b >> 2] = c[a + 60 >> 2];
            a = sc(Aa(6, b | 0) | 0) | 0;
            i = b;
            return a | 0
        }

        function Fc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0;
            e = i;
            i = i + 32 | 0;
            c[e >> 2] = c[a + 60 >> 2];
            c[e + 4 >> 2] = 0;
            c[e + 8 >> 2] = b;
            c[e + 12 >> 2] = e + 20;
            c[e + 16 >> 2] = d;
            if ((sc(ua(140, e | 0) | 0) | 0) < 0) {
                c[e + 20 >> 2] = -1;
                a = -1
            } else a = c[e + 20 >> 2] | 0;
            i = e;
            return a | 0
        }

        function Gc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0;
            k = i;
            i = i + 48 | 0;
            f = c[a + 28 >> 2] | 0;
            c[k + 32 >> 2] = f;
            f = (c[a + 20 >> 2] | 0) - f | 0;
            c[k + 32 + 4 >> 2] = f;
            c[k + 32 + 8 >> 2] = b;
            c[k + 32 + 12 >> 2] = d;
            e = k + 32 | 0;
            b = 2;
            f = f + d | 0;
            while (1) {
                if (!(c[1902] | 0)) {
                    c[k + 16 >> 2] = c[a + 60 >> 2];
                    c[k + 16 + 4 >> 2] = e;
                    c[k + 16 + 8 >> 2] = b;
                    h = sc(Fa(146, k + 16 | 0) | 0) | 0
                } else {
                    Ba(18, a | 0);
                    c[k >> 2] = c[a + 60 >> 2];
                    c[k + 4 >> 2] = e;
                    c[k + 8 >> 2] = b;
                    h = sc(Fa(146, k | 0) | 0) | 0;
                    la(0)
                }
                if ((f | 0) == (h | 0)) {
                    f = 6;
                    break
                }
                if ((h | 0) < 0) {
                    f = 8;
                    break
                }
                f = f - h | 0;
                g = c[e + 4 >> 2] | 0;
                if (h >>> 0 <= g >>> 0)
                    if ((b | 0) == 2) {
                        c[a + 28 >> 2] = (c[a + 28 >> 2] | 0) + h;
                        j = g;
                        b = 2
                    } else j = g;
                else {
                    j = c[a + 44 >> 2] | 0;
                    c[a + 28 >> 2] = j;
                    c[a + 20 >> 2] = j;
                    j = c[e + 12 >> 2] | 0;
                    h = h - g | 0;
                    e = e + 8 | 0;
                    b = b + -1 | 0
                }
                c[e >> 2] = (c[e >> 2] | 0) + h;
                c[e + 4 >> 2] = j - h
            }
            if ((f | 0) == 6) {
                j = c[a + 44 >> 2] | 0;
                c[a + 16 >> 2] = j + (c[a + 48 >> 2] | 0);
                c[a + 28 >> 2] = j;
                c[a + 20 >> 2] = j
            } else if ((f | 0) == 8) {
                c[a + 16 >> 2] = 0;
                c[a + 28 >> 2] = 0;
                c[a + 20 >> 2] = 0;
                c[a >> 2] = c[a >> 2] | 32;
                if ((b | 0) == 2) d = 0;
                else d = d - (c[e + 4 >> 2] | 0) | 0
            }
            i = k;
            return d | 0
        }

        function Hc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0;
            f = i;
            i = i + 80 | 0;
            c[b + 36 >> 2] = 18;
            if ((c[b >> 2] & 64 | 0) == 0 ? (c[f >> 2] = c[b + 60 >> 2], c[f + 4 >> 2] = 21505, c[f + 8 >> 2] = f + 12, (va(54, f | 0) | 0) != 0) : 0) a[b + 75 >> 0] = -1;
            e = Gc(b, d, e) | 0;
            i = f;
            return e | 0
        }

        function Ic(b) {
            b = b | 0;
            var d = 0;
            d = a[b + 74 >> 0] | 0;
            a[b + 74 >> 0] = d + 255 | d;
            d = c[b >> 2] | 0;
            if (!(d & 8)) {
                c[b + 8 >> 2] = 0;
                c[b + 4 >> 2] = 0;
                d = c[b + 44 >> 2] | 0;
                c[b + 28 >> 2] = d;
                c[b + 20 >> 2] = d;
                c[b + 16 >> 2] = d + (c[b + 48 >> 2] | 0);
                d = 0
            } else {
                c[b >> 2] = d | 32;
                d = -1
            }
            return d | 0
        }

        function Jc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0;
            e = i;
            i = i + 16 | 0;
            c[e >> 2] = d;
            d = Oc(a, b, e) | 0;
            i = e;
            return d | 0
        }

        function Kc(a, b) {
            a = a | 0;
            b = b | 0;
            return (Mc(a, Qc(a) | 0, 1, b) | 0) + -1 | 0
        }

        function Lc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
                g = 0,
                h = 0;
            f = c[e + 16 >> 2] | 0;
            if (!f)
                if (!(Ic(e) | 0)) {
                    f = c[e + 16 >> 2] | 0;
                    g = 4
                } else f = 0;
            else g = 4;
            a: do
                if ((g | 0) == 4) {
                    h = c[e + 20 >> 2] | 0;
                    if ((f - h | 0) >>> 0 < d >>> 0) {
                        f = Ka[c[e + 36 >> 2] & 31](e, b, d) | 0;
                        break
                    }
                    b: do
                        if ((a[e + 75 >> 0] | 0) > -1) {
                            f = d;
                            while (1) {
                                if (!f) {
                                    g = h;
                                    f = 0;
                                    break b
                                }
                                g = f + -1 | 0;
                                if ((a[b + g >> 0] | 0) == 10) break;
                                else f = g
                            }
                            if ((Ka[c[e + 36 >> 2] & 31](e, b, f) | 0) >>> 0 < f >>> 0) break a;
                            d = d - f | 0;
                            b = b + f | 0;
                            g = c[e + 20 >> 2] | 0
                        } else {
                            g = h;
                            f = 0
                        }
                    while (0);
                    ed(g | 0, b | 0, d | 0) | 0;
                    c[e + 20 >> 2] = (c[e + 20 >> 2] | 0) + d;
                    f = f + d | 0
                }
            while (0);
            return f | 0
        }

        function Mc(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
                g = 0;
            f = _(d, b) | 0;
            if ((c[e + 76 >> 2] | 0) > -1) {
                g = (Bc(e) | 0) == 0;
                a = Lc(a, f, e) | 0;
                if (!g) Cc(e)
            } else a = Lc(a, f, e) | 0;
            if ((a | 0) != (f | 0)) d = (a >>> 0) / (b >>> 0) | 0;
            return d | 0
        }

        function Nc(b) {
            b = b | 0;
            var d = 0,
                e = 0,
                f = 0;
            e = c[1914] | 0;
            if ((c[e + 76 >> 2] | 0) > -1) f = Bc(e) | 0;
            else f = 0;
            do
                if ((Kc(b, e) | 0) < 0) d = 1;
                else {
                    if ((a[e + 75 >> 0] | 0) != 10 ? (d = c[e + 20 >> 2] | 0, d >>> 0 < (c[e + 16 >> 2] | 0) >>> 0) : 0) {
                        c[e + 20 >> 2] = d + 1;
                        a[d >> 0] = 10;
                        d = 0;
                        break
                    }
                    d = (Dc(e, 10) | 0) < 0
                }
            while (0);
            if (f) Cc(e);
            return d << 31 >> 31 | 0
        }

        function Oc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
                g = 0,
                h = 0,
                j = 0;
            j = i;
            i = i + 224 | 0;
            f = j + 96 | 0;
            g = f + 40 | 0;
            do {
                c[f >> 2] = 0;
                f = f + 4 | 0
            } while ((f | 0) < (g | 0));
            c[j + 80 >> 2] = c[e >> 2];
            if ((Tc(0, d, j + 80 | 0, j, j + 96 | 0) | 0) < 0) e = -1;
            else {
                if ((c[b + 76 >> 2] | 0) > -1) g = Bc(b) | 0;
                else g = 0;
                h = c[b >> 2] | 0;
                if ((a[b + 74 >> 0] | 0) < 1) c[b >> 2] = h & -33;
                if (!(c[b + 48 >> 2] | 0)) {
                    f = c[b + 44 >> 2] | 0;
                    c[b + 44 >> 2] = j + 136;
                    c[b + 28 >> 2] = j + 136;
                    c[b + 20 >> 2] = j + 136;
                    c[b + 48 >> 2] = 80;
                    c[b + 16 >> 2] = j + 136 + 80;
                    e = Tc(b, d, j + 80 | 0, j, j + 96 | 0) | 0;
                    if (f) {
                        Ka[c[b + 36 >> 2] & 31](b, 0, 0) | 0;
                        e = (c[b + 20 >> 2] | 0) == 0 ? -1 : e;
                        c[b + 44 >> 2] = f;
                        c[b + 48 >> 2] = 0;
                        c[b + 16 >> 2] = 0;
                        c[b + 28 >> 2] = 0;
                        c[b + 20 >> 2] = 0
                    }
                } else e = Tc(b, d, j + 80 | 0, j, j + 96 | 0) | 0;
                f = c[b >> 2] | 0;
                c[b >> 2] = f | h & 32;
                if (g) Cc(b);
                e = (f & 32 | 0) == 0 ? e : -1
            }
            i = j;
            return e | 0
        }

        function Pc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
                g = 0,
                h = 0;
            a: do
                if ((e | 0) != 0 & (b & 3 | 0) != 0)
                    while (1) {
                        if ((a[b >> 0] | 0) == (d & 255) << 24 >> 24) {
                            g = 6;
                            break a
                        }
                        b = b + 1 | 0;
                        e = e + -1 | 0;
                        if (!((e | 0) != 0 & (b & 3 | 0) != 0)) {
                            f = e;
                            e = (e | 0) != 0;
                            g = 5;
                            break
                        }
                    } else {
                        f = e;
                        e = (e | 0) != 0;
                        g = 5
                    }
                while (0);
            if ((g | 0) == 5)
                if (e) {
                    e = f;
                    g = 6
                } else e = 0;
            b: do
                if ((g | 0) == 6)
                    if ((a[b >> 0] | 0) != (d & 255) << 24 >> 24) {
                        f = _(d & 255, 16843009) | 0;
                        c: do
                            if (e >>> 0 > 3)
                                while (1) {
                                    h = c[b >> 2] ^ f;
                                    if ((h & -2139062144 ^ -2139062144) & h + -16843009) break;
                                    b = b + 4 | 0;
                                    e = e + -4 | 0;
                                    if (e >>> 0 <= 3) {
                                        g = 11;
                                        break c
                                    }
                                } else g = 11;
                        while (0);
                        if ((g | 0) == 11)
                            if (!e) {
                                e = 0;
                                break
                            }
                        while (1) {
                            if ((a[b >> 0] | 0) == (d & 255) << 24 >> 24) break b;
                            b = b + 1 | 0;
                            e = e + -1 | 0;
                            if (!e) {
                                e = 0;
                                break
                            }
                        }
                    }
            while (0);
            return ((e | 0) != 0 ? b : 0) | 0
        }

        function Qc(b) {
            b = b | 0;
            var d = 0,
                e = 0,
                f = 0;
            a: do
                if (!(b & 3)) {
                    d = b;
                    f = 4
                } else {
                    e = b;
                    d = b;
                    while (1) {
                        if (!(a[e >> 0] | 0)) break a;
                        e = e + 1 | 0;
                        d = e;
                        if (!(d & 3)) {
                            d = e;
                            f = 4;
                            break
                        }
                    }
                }
            while (0);
            if ((f | 0) == 4) {
                while (1) {
                    e = c[d >> 2] | 0;
                    if (!((e & -2139062144 ^ -2139062144) & e + -16843009)) d = d + 4 | 0;
                    else break
                }
                if ((e & 255) << 24 >> 24)
                    do d = d + 1 | 0; while ((a[d >> 0] | 0) != 0)
            }
            return d - b | 0
        }

        function Rc(a) {
            a = a | 0;
            var b = 0,
                d = 0,
                e = 0,
                f = 0;
            b = c[1918] | 0;
            if (!b) c[c[1921] >> 2] = a;
            else {
                c[1919] = (b | 0) == 31 | (b | 0) == 7 ? 3 : 1;
                c[1920] = 0;
                if ((b | 0) > 0) {
                    b = c[1921] | 0;
                    e = 0;
                    d = 0;
                    do {
                        f = kd(a | 0, e | 0, 1284865837, 1481765933) | 0;
                        a = dd(f | 0, C | 0, 1, 0) | 0;
                        e = C;
                        c[b + (d << 2) >> 2] = e;
                        d = d + 1 | 0
                    } while ((d | 0) < (c[1918] | 0))
                } else b = c[1921] | 0;
                c[b >> 2] = c[b >> 2] | 1
            }
            return
        }

        function Sc(a) {
            a = a | 0;
            if (!(c[a + 68 >> 2] | 0)) Cc(a);
            return
        }

        function Tc(e, f, g, j, l) {
            e = e | 0;
            f = f | 0;
            g = g | 0;
            j = j | 0;
            l = l | 0;
            var m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0.0,
                r = 0,
                s = 0.0,
                t = 0,
                u = 0,
                v = 0,
                w = 0,
                x = 0,
                y = 0,
                z = 0,
                A = 0,
                B = 0,
                D = 0,
                E = 0,
                F = 0,
                G = 0,
                H = 0,
                I = 0,
                J = 0,
                K = 0,
                L = 0,
                M = 0;
            M = i;
            i = i + 624 | 0;
            J = M + 536 + 40 | 0;
            L = M + 576 + 12 | 0;
            K = M + 588 + 9 | 0;
            m = 0;
            w = f;
            n = 0;
            f = 0;
            a: while (1) {
                do
                    if ((m | 0) > -1)
                        if ((n | 0) > (2147483647 - m | 0)) {
                            c[(qc() | 0) >> 2] = 75;
                            m = -1;
                            break
                        } else {
                            m = n + m | 0;
                            break
                        }
                while (0);
                n = a[w >> 0] | 0;
                if (!(n << 24 >> 24)) {
                    I = 245;
                    break
                } else o = w;
                b: while (1) {
                    switch (n << 24 >> 24) {
                        case 37:
                            {
                                n = o;
                                I = 9;
                                break b
                            }
                        case 0:
                            {
                                n = o;
                                break b
                            }
                        default:
                            {}
                    }
                    H = o + 1 | 0;
                    n = a[H >> 0] | 0;
                    o = H
                }
                c: do
                    if ((I | 0) == 9)
                        while (1) {
                            I = 0;
                            if ((a[n + 1 >> 0] | 0) != 37) break c;
                            o = o + 1 | 0;
                            n = n + 2 | 0;
                            if ((a[n >> 0] | 0) == 37) I = 9;
                            else break
                        }
                    while (0);
                y = o - w | 0;
                if ((e | 0) != 0 ? (c[e >> 2] & 32 | 0) == 0 : 0) Lc(w, y, e) | 0;
                if ((o | 0) != (w | 0)) {
                    w = n;
                    n = y;
                    continue
                }
                p = n + 1 | 0;
                o = a[p >> 0] | 0;
                if (((o << 24 >> 24) + -48 | 0) >>> 0 < 10) {
                    H = (a[n + 2 >> 0] | 0) == 36;
                    p = H ? n + 3 | 0 : p;
                    r = a[p >> 0] | 0;
                    v = H ? (o << 24 >> 24) + -48 | 0 : -1;
                    f = H ? 1 : f
                } else {
                    r = o;
                    v = -1
                }
                n = r << 24 >> 24;
                d: do
                    if ((n & -32 | 0) == 32) {
                        o = r;
                        r = 0;
                        do {
                            if (!(1 << n + -32 & 75913)) break d;
                            r = 1 << (o << 24 >> 24) + -32 | r;
                            p = p + 1 | 0;
                            o = a[p >> 0] | 0;
                            n = o << 24 >> 24
                        } while ((n & -32 | 0) == 32)
                    } else {
                        o = r;
                        r = 0
                    }
                while (0);
                do
                    if (o << 24 >> 24 == 42) {
                        o = p + 1 | 0;
                        n = (a[o >> 0] | 0) + -48 | 0;
                        if (n >>> 0 < 10 ? (a[p + 2 >> 0] | 0) == 36 : 0) {
                            c[l + (n << 2) >> 2] = 10;
                            f = 1;
                            p = p + 3 | 0;
                            n = c[j + ((a[o >> 0] | 0) + -48 << 3) >> 2] | 0
                        } else {
                            if (f) {
                                m = -1;
                                break a
                            }
                            if (!e) {
                                x = r;
                                p = o;
                                f = 0;
                                H = 0;
                                break
                            }
                            f = (c[g >> 2] | 0) + (4 - 1) & ~(4 - 1);
                            n = c[f >> 2] | 0;
                            c[g >> 2] = f + 4;
                            f = 0;
                            p = o
                        }
                        if ((n | 0) < 0) {
                            x = r | 8192;
                            H = 0 - n | 0
                        } else {
                            x = r;
                            H = n
                        }
                    } else {
                        o = (o << 24 >> 24) + -48 | 0;
                        if (o >>> 0 < 10) {
                            n = 0;
                            do {
                                n = (n * 10 | 0) + o | 0;
                                p = p + 1 | 0;
                                o = (a[p >> 0] | 0) + -48 | 0
                            } while (o >>> 0 < 10);
                            if ((n | 0) < 0) {
                                m = -1;
                                break a
                            } else {
                                x = r;
                                H = n
                            }
                        } else {
                            x = r;
                            H = 0
                        }
                    }
                while (0);
                e: do
                    if ((a[p >> 0] | 0) == 46) {
                        n = p + 1 | 0;
                        r = a[n >> 0] | 0;
                        if (r << 24 >> 24 != 42) {
                            if (((r << 24 >> 24) + -48 | 0) >>> 0 < 10) {
                                o = 0;
                                p = (r << 24 >> 24) + -48 | 0
                            } else {
                                r = 0;
                                break
                            }
                            while (1) {
                                o = (o * 10 | 0) + p | 0;
                                n = n + 1 | 0;
                                p = (a[n >> 0] | 0) + -48 | 0;
                                if (p >>> 0 >= 10) {
                                    r = o;
                                    break e
                                }
                            }
                        }
                        o = p + 2 | 0;
                        n = (a[o >> 0] | 0) + -48 | 0;
                        if (n >>> 0 < 10 ? (a[p + 3 >> 0] | 0) == 36 : 0) {
                            c[l + (n << 2) >> 2] = 10;
                            n = p + 4 | 0;
                            r = c[j + ((a[o >> 0] | 0) + -48 << 3) >> 2] | 0;
                            break
                        }
                        if (f) {
                            m = -1;
                            break a
                        }
                        if (e) {
                            n = (c[g >> 2] | 0) + (4 - 1) & ~(4 - 1);
                            r = c[n >> 2] | 0;
                            c[g >> 2] = n + 4;
                            n = o
                        } else {
                            n = o;
                            r = 0
                        }
                    } else {
                        n = p;
                        r = -1
                    }
                while (0);
                p = 0;
                while (1) {
                    o = (a[n >> 0] | 0) + -65 | 0;
                    if (o >>> 0 > 57) {
                        m = -1;
                        break a
                    }
                    G = n + 1 | 0;
                    t = a[12548 + (p * 58 | 0) + o >> 0] | 0;
                    if (((t & 255) + -1 | 0) >>> 0 < 8) {
                        n = G;
                        p = t & 255
                    } else {
                        u = p;
                        break
                    }
                }
                if (!(t << 24 >> 24)) {
                    m = -1;
                    break
                }
                o = (v | 0) > -1;
                do
                    if (t << 24 >> 24 == 19)
                        if (o) {
                            m = -1;
                            break a
                        } else I = 52;
                else {
                    if (o) {
                        c[l + (v << 2) >> 2] = t & 255;
                        F = j + (v << 3) | 0;
                        I = c[F + 4 >> 2] | 0;
                        c[M >> 2] = c[F >> 2];
                        c[M + 4 >> 2] = I;
                        I = 52;
                        break
                    }
                    if (!e) {
                        m = 0;
                        break a
                    }
                    Uc(M, t & 255, g)
                } while (0);
                if ((I | 0) == 52 ? (I = 0, (e | 0) == 0) : 0) {
                    w = G;
                    n = y;
                    continue
                }
                v = a[n >> 0] | 0;
                v = (u | 0) != 0 & (v & 15 | 0) == 3 ? v & -33 : v;
                p = x & -65537;
                F = (x & 8192 | 0) == 0 ? x : p;
                f: do switch (v | 0) {
                        case 110:
                            switch (u | 0) {
                                case 0:
                                    {
                                        c[c[M >> 2] >> 2] = m;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                case 1:
                                    {
                                        c[c[M >> 2] >> 2] = m;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                case 2:
                                    {
                                        w = c[M >> 2] | 0;
                                        c[w >> 2] = m;
                                        c[w + 4 >> 2] = ((m | 0) < 0) << 31 >> 31;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                case 3:
                                    {
                                        b[c[M >> 2] >> 1] = m;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                case 4:
                                    {
                                        a[c[M >> 2] >> 0] = m;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                case 6:
                                    {
                                        c[c[M >> 2] >> 2] = m;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                case 7:
                                    {
                                        w = c[M >> 2] | 0;
                                        c[w >> 2] = m;
                                        c[w + 4 >> 2] = ((m | 0) < 0) << 31 >> 31;
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                                default:
                                    {
                                        w = G;
                                        n = y;
                                        continue a
                                    }
                            }
                        case 112:
                            {
                                u = F | 8;
                                r = r >>> 0 > 8 ? r : 8;
                                v = 120;
                                I = 64;
                                break
                            }
                        case 88:
                        case 120:
                            {
                                u = F;
                                I = 64;
                                break
                            }
                        case 111:
                            {
                                o = c[M >> 2] | 0;
                                p = c[M + 4 >> 2] | 0;
                                if ((o | 0) == 0 & (p | 0) == 0) n = J;
                                else {
                                    n = J;
                                    do {
                                        n = n + -1 | 0;
                                        a[n >> 0] = o & 7 | 48;
                                        o = bd(o | 0, p | 0, 3) | 0;
                                        p = C
                                    } while (!((o | 0) == 0 & (p | 0) == 0))
                                }
                                if (!(F & 8)) {
                                    o = F;
                                    u = 0;
                                    t = 13028;
                                    I = 77
                                } else {
                                    u = J - n + 1 | 0;
                                    o = F;
                                    r = (r | 0) < (u | 0) ? u : r;
                                    u = 0;
                                    t = 13028;
                                    I = 77
                                }
                                break
                            }
                        case 105:
                        case 100:
                            {
                                n = c[M >> 2] | 0;
                                o = c[M + 4 >> 2] | 0;
                                if ((o | 0) < 0) {
                                    n = $c(0, 0, n | 0, o | 0) | 0;
                                    o = C;
                                    c[M >> 2] = n;
                                    c[M + 4 >> 2] = o;
                                    p = 1;
                                    t = 13028;
                                    I = 76;
                                    break f
                                }
                                if (!(F & 2048)) {
                                    p = F & 1;
                                    t = (F & 1 | 0) == 0 ? 13028 : 13030;
                                    I = 76
                                } else {
                                    p = 1;
                                    t = 13029;
                                    I = 76
                                }
                                break
                            }
                        case 117:
                            {
                                n = c[M >> 2] | 0;
                                o = c[M + 4 >> 2] | 0;
                                p = 0;
                                t = 13028;
                                I = 76;
                                break
                            }
                        case 99:
                            {
                                a[M + 536 + 39 >> 0] = c[M >> 2];
                                w = M + 536 + 39 | 0;
                                o = 1;
                                u = 0;
                                v = 13028;
                                n = J;
                                break
                            }
                        case 109:
                            {
                                n = rc(c[(qc() | 0) >> 2] | 0) | 0;
                                I = 82;
                                break
                            }
                        case 115:
                            {
                                n = c[M >> 2] | 0;
                                n = (n | 0) != 0 ? n : 13038;
                                I = 82;
                                break
                            }
                        case 67:
                            {
                                c[M + 8 >> 2] = c[M >> 2];
                                c[M + 8 + 4 >> 2] = 0;
                                c[M >> 2] = M + 8;
                                r = -1;
                                I = 86;
                                break
                            }
                        case 83:
                            {
                                if (!r) {
                                    Wc(e, 32, H, 0, F);
                                    n = 0;
                                    I = 98
                                } else I = 86;
                                break
                            }
                        case 65:
                        case 71:
                        case 70:
                        case 69:
                        case 97:
                        case 103:
                        case 102:
                        case 101:
                            {
                                q = +h[M >> 3];
                                c[M + 16 >> 2] = 0;
                                h[k >> 3] = q;
                                if ((c[k + 4 >> 2] | 0) >= 0)
                                    if (!(F & 2048)) {
                                        D = F & 1;
                                        E = (F & 1 | 0) == 0 ? 13046 : 13051
                                    } else {
                                        D = 1;
                                        E = 13048
                                    } else {
                                    q = -q;
                                    D = 1;
                                    E = 13045
                                }
                                h[k >> 3] = q;
                                B = c[k + 4 >> 2] & 2146435072;
                                do
                                    if (B >>> 0 < 2146435072 | (B | 0) == 2146435072 & 0 < 0) {
                                        q = +vc(q, M + 16 | 0) * 2.0;
                                        if (q != 0.0) c[M + 16 >> 2] = (c[M + 16 >> 2] | 0) + -1;
                                        if ((v | 32 | 0) == 97) {
                                            w = (v & 32 | 0) == 0 ? E : E + 9 | 0;
                                            u = D | 2;
                                            n = 12 - r | 0;
                                            do
                                                if (!(r >>> 0 > 11 | (n | 0) == 0)) {
                                                    s = 8.0;
                                                    do {
                                                        n = n + -1 | 0;
                                                        s = s * 16.0
                                                    } while ((n | 0) != 0);
                                                    if ((a[w >> 0] | 0) == 45) {
                                                        q = -(s + (-q - s));
                                                        break
                                                    } else {
                                                        q = q + s - s;
                                                        break
                                                    }
                                                }
                                            while (0);
                                            o = c[M + 16 >> 2] | 0;
                                            n = (o | 0) < 0 ? 0 - o | 0 : o;
                                            n = Vc(n, ((n | 0) < 0) << 31 >> 31, M + 576 + 12 | 0) | 0;
                                            if ((n | 0) == (M + 576 + 12 | 0)) {
                                                a[M + 576 + 11 >> 0] = 48;
                                                n = M + 576 + 11 | 0
                                            }
                                            a[n + -1 >> 0] = (o >> 31 & 2) + 43;
                                            t = n + -2 | 0;
                                            a[t >> 0] = v + 15;
                                            p = (r | 0) < 1;
                                            n = M + 588 | 0;
                                            while (1) {
                                                E = ~~q;
                                                o = n + 1 | 0;
                                                a[n >> 0] = d[13012 + E >> 0] | v & 32;
                                                q = (q - +(E | 0)) * 16.0;
                                                do
                                                    if ((o - (M + 588) | 0) == 1) {
                                                        if ((F & 8 | 0) == 0 & (p & q == 0.0)) break;
                                                        a[o >> 0] = 46;
                                                        o = n + 2 | 0
                                                    }
                                                while (0);
                                                if (!(q != 0.0)) break;
                                                else n = o
                                            }
                                            n = ((r | 0) != 0 ? (-2 - (M + 588) + o | 0) < (r | 0) : 0) ? L + 2 + r - t | 0 : L - (M + 588) - t + o | 0;
                                            Wc(e, 32, H, n + u | 0, F);
                                            if (!(c[e >> 2] & 32)) Lc(w, u, e) | 0;
                                            Wc(e, 48, H, n + u | 0, F ^ 65536);
                                            if (!(c[e >> 2] & 32)) Lc(M + 588 | 0, o - (M + 588) | 0, e) | 0;
                                            Wc(e, 48, n - (o - (M + 588) + (L - t)) | 0, 0, 0);
                                            if (!(c[e >> 2] & 32)) Lc(t, L - t | 0, e) | 0;
                                            Wc(e, 32, H, n + u | 0, F ^ 8192);
                                            n = (n + u | 0) < (H | 0) ? H : n + u | 0;
                                            break
                                        }
                                        n = (r | 0) < 0 ? 6 : r;
                                        if (q != 0.0) {
                                            o = (c[M + 16 >> 2] | 0) + -28 | 0;
                                            c[M + 16 >> 2] = o;
                                            q = q * 268435456.0
                                        } else o = c[M + 16 >> 2] | 0;
                                        B = (o | 0) < 0 ? M + 24 | 0 : M + 24 + 288 | 0;
                                        o = B;
                                        while (1) {
                                            A = ~~q >>> 0;
                                            c[o >> 2] = A;
                                            p = o + 4 | 0;
                                            q = (q - +(A >>> 0)) * 1.0e9;
                                            if (!(q != 0.0)) break;
                                            else o = p
                                        }
                                        o = c[M + 16 >> 2] | 0;
                                        if ((o | 0) > 0) {
                                            t = B;
                                            while (1) {
                                                u = (o | 0) > 29 ? 29 : o;
                                                r = p + -4 | 0;
                                                do
                                                    if (r >>> 0 < t >>> 0) r = t;
                                                    else {
                                                        o = 0;
                                                        do {
                                                            A = cd(c[r >> 2] | 0, 0, u | 0) | 0;
                                                            A = dd(A | 0, C | 0, o | 0, 0) | 0;
                                                            o = C;
                                                            z = md(A | 0, o | 0, 1e9, 0) | 0;
                                                            c[r >> 2] = z;
                                                            o = ld(A | 0, o | 0, 1e9, 0) | 0;
                                                            r = r + -4 | 0
                                                        } while (r >>> 0 >= t >>> 0);
                                                        if (!o) {
                                                            r = t;
                                                            break
                                                        }
                                                        r = t + -4 | 0;
                                                        c[r >> 2] = o
                                                    }
                                                while (0); while (1) {
                                                    if (p >>> 0 <= r >>> 0) break;
                                                    o = p + -4 | 0;
                                                    if (!(c[o >> 2] | 0)) p = o;
                                                    else break
                                                }
                                                o = (c[M + 16 >> 2] | 0) - u | 0;
                                                c[M + 16 >> 2] = o;
                                                if ((o | 0) > 0) t = r;
                                                else break
                                            }
                                        } else r = B;
                                        if ((o | 0) < 0) {
                                            do {
                                                w = 0 - o | 0;
                                                w = (w | 0) > 9 ? 9 : w;
                                                do
                                                    if (r >>> 0 < p >>> 0) {
                                                        o = 0;
                                                        u = r;
                                                        while (1) {
                                                            t = c[u >> 2] | 0;
                                                            c[u >> 2] = (t >>> w) + o;
                                                            t = _(t & (1 << w) + -1, 1e9 >>> w) | 0;
                                                            u = u + 4 | 0;
                                                            if (u >>> 0 >= p >>> 0) break;
                                                            else o = t
                                                        }
                                                        o = (c[r >> 2] | 0) == 0 ? r + 4 | 0 : r;
                                                        if (!t) {
                                                            r = o;
                                                            o = p;
                                                            break
                                                        }
                                                        c[p >> 2] = t;
                                                        r = o;
                                                        o = p + 4 | 0
                                                    } else {
                                                        r = (c[r >> 2] | 0) == 0 ? r + 4 | 0 : r;
                                                        o = p
                                                    }
                                                while (0);
                                                p = (v | 32 | 0) == 102 ? B : r;
                                                p = (o - p >> 2 | 0) > (((n + 25 | 0) / 9 | 0) + 1 | 0) ? p + (((n + 25 | 0) / 9 | 0) + 1 << 2) | 0 : o;
                                                o = (c[M + 16 >> 2] | 0) + w | 0;
                                                c[M + 16 >> 2] = o
                                            } while ((o | 0) < 0);
                                            o = r;
                                            z = p
                                        } else {
                                            o = r;
                                            z = p
                                        }
                                        do
                                            if (o >>> 0 < z >>> 0) {
                                                p = (B - o >> 2) * 9 | 0;
                                                t = c[o >> 2] | 0;
                                                if (t >>> 0 < 10) break;
                                                else r = 10;
                                                do {
                                                    r = r * 10 | 0;
                                                    p = p + 1 | 0
                                                } while (t >>> 0 >= r >>> 0)
                                            } else p = 0;
                                        while (0);
                                        w = n - ((v | 32 | 0) != 102 ? p : 0) + (((n | 0) != 0 & (v | 32 | 0) == 103) << 31 >> 31) | 0;
                                        if ((w | 0) < (((z - B >> 2) * 9 | 0) + -9 | 0)) {
                                            r = B + (((w + 9216 | 0) / 9 | 0) + -1023 << 2) | 0;
                                            if ((((w + 9216 | 0) % 9 | 0) + 1 | 0) < 9) {
                                                t = 10;
                                                u = ((w + 9216 | 0) % 9 | 0) + 1 | 0;
                                                do {
                                                    t = t * 10 | 0;
                                                    u = u + 1 | 0
                                                } while ((u | 0) != 9)
                                            } else t = 10;
                                            x = c[r >> 2] | 0;
                                            y = (x >>> 0) % (t >>> 0) | 0;
                                            if (!((y | 0) == 0 ? (B + (((w + 9216 | 0) / 9 | 0) + -1022 << 2) | 0) == (z | 0) : 0)) I = 163;
                                            do
                                                if ((I | 0) == 163) {
                                                    I = 0;
                                                    s = (((x >>> 0) / (t >>> 0) | 0) & 1 | 0) == 0 ? 9007199254740992.0 : 9007199254740994.0;
                                                    u = (t | 0) / 2 | 0;
                                                    do
                                                        if (y >>> 0 < u >>> 0) q = .5;
                                                        else {
                                                            if ((y | 0) == (u | 0) ? (B + (((w + 9216 | 0) / 9 | 0) + -1022 << 2) | 0) == (z | 0) : 0) {
                                                                q = 1.0;
                                                                break
                                                            }
                                                            q = 1.5
                                                        }
                                                    while (0);
                                                    do
                                                        if (D) {
                                                            if ((a[E >> 0] | 0) != 45) break;
                                                            s = -s;
                                                            q = -q
                                                        }
                                                    while (0);
                                                    c[r >> 2] = x - y;
                                                    if (!(s + q != s)) break;
                                                    A = x - y + t | 0;
                                                    c[r >> 2] = A;
                                                    if (A >>> 0 > 999999999) {
                                                        p = r;
                                                        while (1) {
                                                            r = p + -4 | 0;
                                                            c[p >> 2] = 0;
                                                            if (r >>> 0 < o >>> 0) {
                                                                o = o + -4 | 0;
                                                                c[o >> 2] = 0
                                                            }
                                                            A = (c[r >> 2] | 0) + 1 | 0;
                                                            c[r >> 2] = A;
                                                            if (A >>> 0 > 999999999) p = r;
                                                            else break
                                                        }
                                                    }
                                                    p = (B - o >> 2) * 9 | 0;
                                                    u = c[o >> 2] | 0;
                                                    if (u >>> 0 < 10) break;
                                                    else t = 10;
                                                    do {
                                                        t = t * 10 | 0;
                                                        p = p + 1 | 0
                                                    } while (u >>> 0 >= t >>> 0)
                                                }
                                            while (0);
                                            y = r + 4 | 0;
                                            A = o;
                                            o = z >>> 0 > y >>> 0 ? y : z
                                        } else {
                                            A = o;
                                            o = z
                                        }
                                        u = 0 - p | 0;
                                        while (1) {
                                            if (o >>> 0 <= A >>> 0) {
                                                x = 0;
                                                z = o;
                                                break
                                            }
                                            r = o + -4 | 0;
                                            if (!(c[r >> 2] | 0)) o = r;
                                            else {
                                                x = 1;
                                                z = o;
                                                break
                                            }
                                        }
                                        do
                                            if ((v | 32 | 0) == 103) {
                                                if ((((n | 0) != 0 ^ 1) + n | 0) > (p | 0) & (p | 0) > -5) {
                                                    v = v + -1 | 0;
                                                    n = ((n | 0) != 0 ^ 1) + n + -1 - p | 0
                                                } else {
                                                    v = v + -2 | 0;
                                                    n = ((n | 0) != 0 ^ 1) + n + -1 | 0
                                                }
                                                if (F & 8) {
                                                    t = F & 8;
                                                    break
                                                }
                                                do
                                                    if (x) {
                                                        o = c[z + -4 >> 2] | 0;
                                                        if (!o) {
                                                            r = 9;
                                                            break
                                                        }
                                                        if (!((o >>> 0) % 10 | 0)) {
                                                            t = 10;
                                                            r = 0
                                                        } else {
                                                            r = 0;
                                                            break
                                                        }
                                                        do {
                                                            t = t * 10 | 0;
                                                            r = r + 1 | 0
                                                        } while (((o >>> 0) % (t >>> 0) | 0 | 0) == 0)
                                                    } else r = 9;
                                                while (0);
                                                o = ((z - B >> 2) * 9 | 0) + -9 | 0;
                                                if ((v | 32 | 0) == 102) {
                                                    t = o - r | 0;
                                                    t = (t | 0) < 0 ? 0 : t;
                                                    n = (n | 0) < (t | 0) ? n : t;
                                                    t = 0;
                                                    break
                                                } else {
                                                    t = o + p - r | 0;
                                                    t = (t | 0) < 0 ? 0 : t;
                                                    n = (n | 0) < (t | 0) ? n : t;
                                                    t = 0;
                                                    break
                                                }
                                            } else t = F & 8;
                                        while (0);
                                        w = n | t;
                                        r = (v | 32 | 0) == 102;
                                        if (r) {
                                            o = (p | 0) > 0 ? p : 0;
                                            v = 0
                                        } else {
                                            o = (p | 0) < 0 ? u : p;
                                            o = Vc(o, ((o | 0) < 0) << 31 >> 31, M + 576 + 12 | 0) | 0;
                                            if ((L - o | 0) < 2)
                                                do {
                                                    o = o + -1 | 0;
                                                    a[o >> 0] = 48
                                                } while ((L - o | 0) < 2);
                                            a[o + -1 >> 0] = (p >> 31 & 2) + 43;
                                            y = o + -2 | 0;
                                            a[y >> 0] = v;
                                            o = L - y | 0;
                                            v = y
                                        }
                                        y = D + 1 + n + ((w | 0) != 0 & 1) + o | 0;
                                        Wc(e, 32, H, y, F);
                                        if (!(c[e >> 2] & 32)) Lc(E, D, e) | 0;
                                        Wc(e, 48, H, y, F ^ 65536);
                                        do
                                            if (r) {
                                                r = A >>> 0 > B >>> 0 ? B : A;
                                                p = r;
                                                while (1) {
                                                    o = Vc(c[p >> 2] | 0, 0, K) | 0;
                                                    do
                                                        if ((p | 0) == (r | 0)) {
                                                            if ((o | 0) != (K | 0)) break;
                                                            a[M + 588 + 8 >> 0] = 48;
                                                            o = M + 588 + 8 | 0
                                                        } else {
                                                            if (o >>> 0 <= (M + 588 | 0) >>> 0) break;
                                                            do {
                                                                o = o + -1 | 0;
                                                                a[o >> 0] = 48
                                                            } while (o >>> 0 > (M + 588 | 0) >>> 0)
                                                        }
                                                    while (0);
                                                    if (!(c[e >> 2] & 32)) Lc(o, K - o | 0, e) | 0;
                                                    o = p + 4 | 0;
                                                    if (o >>> 0 > B >>> 0) break;
                                                    else p = o
                                                }
                                                do
                                                    if (w) {
                                                        if (c[e >> 2] & 32) break;
                                                        Lc(13080, 1, e) | 0
                                                    }
                                                while (0);
                                                if ((n | 0) > 0 & o >>> 0 < z >>> 0) {
                                                    p = o;
                                                    while (1) {
                                                        o = Vc(c[p >> 2] | 0, 0, K) | 0;
                                                        if (o >>> 0 > (M + 588 | 0) >>> 0)
                                                            do {
                                                                o = o + -1 | 0;
                                                                a[o >> 0] = 48
                                                            } while (o >>> 0 > (M + 588 | 0) >>> 0);
                                                        if (!(c[e >> 2] & 32)) Lc(o, (n | 0) > 9 ? 9 : n, e) | 0;
                                                        p = p + 4 | 0;
                                                        o = n + -9 | 0;
                                                        if (!((n | 0) > 9 & p >>> 0 < z >>> 0)) {
                                                            n = o;
                                                            break
                                                        } else n = o
                                                    }
                                                }
                                                Wc(e, 48, n + 9 | 0, 9, 0)
                                            } else {
                                                u = x ? z : A + 4 | 0;
                                                if ((n | 0) > -1) {
                                                    t = (t | 0) == 0;
                                                    r = A;
                                                    do {
                                                        o = Vc(c[r >> 2] | 0, 0, K) | 0;
                                                        if ((o | 0) == (K | 0)) {
                                                            a[M + 588 + 8 >> 0] = 48;
                                                            o = M + 588 + 8 | 0
                                                        }
                                                        do
                                                            if ((r | 0) == (A | 0)) {
                                                                p = o + 1 | 0;
                                                                if (!(c[e >> 2] & 32)) Lc(o, 1, e) | 0;
                                                                if (t & (n | 0) < 1) {
                                                                    o = p;
                                                                    break
                                                                }
                                                                if (c[e >> 2] & 32) {
                                                                    o = p;
                                                                    break
                                                                }
                                                                Lc(13080, 1, e) | 0;
                                                                o = p
                                                            } else {
                                                                if (o >>> 0 <= (M + 588 | 0) >>> 0) break;
                                                                do {
                                                                    o = o + -1 | 0;
                                                                    a[o >> 0] = 48
                                                                } while (o >>> 0 > (M + 588 | 0) >>> 0)
                                                            }
                                                        while (0);
                                                        p = K - o | 0;
                                                        if (!(c[e >> 2] & 32)) Lc(o, (n | 0) > (p | 0) ? p : n, e) | 0;
                                                        n = n - p | 0;
                                                        r = r + 4 | 0
                                                    } while (r >>> 0 < u >>> 0 & (n | 0) > -1)
                                                }
                                                Wc(e, 48, n + 18 | 0, 18, 0);
                                                if (c[e >> 2] & 32) break;
                                                Lc(v, L - v | 0, e) | 0
                                            }
                                        while (0);
                                        Wc(e, 32, H, y, F ^ 8192);
                                        n = (y | 0) < (H | 0) ? H : y
                                    } else {
                                        r = q != q | 0.0 != 0.0;
                                        o = r ? 0 : D;
                                        Wc(e, 32, H, o + 3 | 0, p);
                                        n = c[e >> 2] | 0;
                                        if (!(n & 32)) {
                                            Lc(E, o, e) | 0;
                                            n = c[e >> 2] | 0
                                        }
                                        if (!(n & 32)) Lc(r ? ((v & 32 | 0) != 0 ? 13072 : 13076) : (v & 32 | 0) != 0 ? 13064 : 13068, 3, e) | 0;
                                        Wc(e, 32, H, o + 3 | 0, F ^ 8192);
                                        n = (o + 3 | 0) < (H | 0) ? H : o + 3 | 0
                                    }
                                while (0);
                                w = G;
                                continue a
                            }
                        default:
                            {
                                p = F;
                                o = r;
                                u = 0;
                                v = 13028;
                                n = J
                            }
                    }
                    while (0);
                    g: do
                        if ((I | 0) == 64) {
                            o = c[M >> 2] | 0;
                            p = c[M + 4 >> 2] | 0;
                            t = v & 32;
                            if (!((o | 0) == 0 & (p | 0) == 0)) {
                                n = J;
                                do {
                                    n = n + -1 | 0;
                                    a[n >> 0] = d[13012 + (o & 15) >> 0] | t;
                                    o = bd(o | 0, p | 0, 4) | 0;
                                    p = C
                                } while (!((o | 0) == 0 & (p | 0) == 0));
                                if ((u & 8 | 0) == 0 | (c[M >> 2] | 0) == 0 & (c[M + 4 >> 2] | 0) == 0) {
                                    o = u;
                                    u = 0;
                                    t = 13028;
                                    I = 77
                                } else {
                                    o = u;
                                    u = 2;
                                    t = 13028 + (v >> 4) | 0;
                                    I = 77
                                }
                            } else {
                                n = J;
                                o = u;
                                u = 0;
                                t = 13028;
                                I = 77
                            }
                        } else
                if ((I | 0) == 76) {
                    n = Vc(n, o, J) | 0;
                    o = F;
                    u = p;
                    I = 77
                } else if ((I | 0) == 82) {
                    I = 0;
                    F = Pc(n, 0, r) | 0;
                    w = n;
                    o = (F | 0) == 0 ? r : F - n | 0;
                    u = 0;
                    v = 13028;
                    n = (F | 0) == 0 ? n + r | 0 : F
                } else if ((I | 0) == 86) {
                    I = 0;
                    o = 0;
                    n = 0;
                    t = c[M >> 2] | 0;
                    while (1) {
                        p = c[t >> 2] | 0;
                        if (!p) break;
                        n = yc(M + 528 | 0, p) | 0;
                        if ((n | 0) < 0 | n >>> 0 > (r - o | 0) >>> 0) break;
                        o = n + o | 0;
                        if (r >>> 0 > o >>> 0) t = t + 4 | 0;
                        else break
                    }
                    if ((n | 0) < 0) {
                        m = -1;
                        break a
                    }
                    Wc(e, 32, H, o, F);
                    if (!o) {
                        n = 0;
                        I = 98
                    } else {
                        p = 0;
                        r = c[M >> 2] | 0;
                        while (1) {
                            n = c[r >> 2] | 0;
                            if (!n) {
                                n = o;
                                I = 98;
                                break g
                            }
                            n = yc(M + 528 | 0, n) | 0;
                            p = n + p | 0;
                            if ((p | 0) > (o | 0)) {
                                n = o;
                                I = 98;
                                break g
                            }
                            if (!(c[e >> 2] & 32)) Lc(M + 528 | 0, n, e) | 0;
                            if (p >>> 0 >= o >>> 0) {
                                n = o;
                                I = 98;
                                break
                            } else r = r + 4 | 0
                        }
                    }
                }
                while (0);
                if ((I | 0) == 98) {
                    I = 0;
                    Wc(e, 32, H, n, F ^ 8192);
                    w = G;
                    n = (H | 0) > (n | 0) ? H : n;
                    continue
                }
                if ((I | 0) == 77) {
                    I = 0;
                    p = (r | 0) > -1 ? o & -65537 : o;
                    o = (c[M >> 2] | 0) != 0 | (c[M + 4 >> 2] | 0) != 0;
                    if ((r | 0) != 0 | o) {
                        o = (o & 1 ^ 1) + (J - n) | 0;
                        w = n;
                        o = (r | 0) > (o | 0) ? r : o;
                        v = t;
                        n = J
                    } else {
                        w = J;
                        o = 0;
                        v = t;
                        n = J
                    }
                }
                t = n - w | 0;
                o = (o | 0) < (t | 0) ? t : o;
                r = u + o | 0;
                n = (H | 0) < (r | 0) ? r : H;
                Wc(e, 32, n, r, p);
                if (!(c[e >> 2] & 32)) Lc(v, u, e) | 0;
                Wc(e, 48, n, r, p ^ 65536);
                Wc(e, 48, o, t, 0);
                if (!(c[e >> 2] & 32)) Lc(w, t, e) | 0;
                Wc(e, 32, n, r, p ^ 8192);
                w = G
            }
            h: do
                if ((I | 0) == 245)
                    if (!e)
                        if (f) {
                            m = 1;
                            while (1) {
                                f = c[l + (m << 2) >> 2] | 0;
                                if (!f) break;
                                Uc(j + (m << 3) | 0, f, g);
                                m = m + 1 | 0;
                                if ((m | 0) >= 10) {
                                    m = 1;
                                    break h
                                }
                            }
                            if ((m | 0) < 10)
                                while (1) {
                                    if (c[l + (m << 2) >> 2] | 0) {
                                        m = -1;
                                        break h
                                    }
                                    m = m + 1 | 0;
                                    if ((m | 0) >= 10) {
                                        m = 1;
                                        break
                                    }
                                } else m = 1
                        } else m = 0;
            while (0);
            i = M;
            return m | 0
        }

        function Uc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0.0;
            a: do
                if (b >>> 0 <= 20)
                    do switch (b | 0) {
                        case 9:
                            {
                                e = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                b = c[e >> 2] | 0;
                                c[d >> 2] = e + 4;
                                c[a >> 2] = b;
                                break a
                            }
                        case 10:
                            {
                                b = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                e = c[b >> 2] | 0;
                                c[d >> 2] = b + 4;
                                c[a >> 2] = e;
                                c[a + 4 >> 2] = ((e | 0) < 0) << 31 >> 31;
                                break a
                            }
                        case 11:
                            {
                                b = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                e = c[b >> 2] | 0;
                                c[d >> 2] = b + 4;
                                c[a >> 2] = e;
                                c[a + 4 >> 2] = 0;
                                break a
                            }
                        case 12:
                            {
                                f = (c[d >> 2] | 0) + (8 - 1) & ~(8 - 1);
                                b = c[f >> 2] | 0;
                                e = c[f + 4 >> 2] | 0;
                                c[d >> 2] = f + 8;
                                c[a >> 2] = b;
                                c[a + 4 >> 2] = e;
                                break a
                            }
                        case 13:
                            {
                                e = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                f = c[e >> 2] | 0;
                                c[d >> 2] = e + 4;
                                c[a >> 2] = (f & 65535) << 16 >> 16;
                                c[a + 4 >> 2] = (((f & 65535) << 16 >> 16 | 0) < 0) << 31 >> 31;
                                break a
                            }
                        case 14:
                            {
                                e = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                f = c[e >> 2] | 0;
                                c[d >> 2] = e + 4;
                                c[a >> 2] = f & 65535;
                                c[a + 4 >> 2] = 0;
                                break a
                            }
                        case 15:
                            {
                                e = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                f = c[e >> 2] | 0;
                                c[d >> 2] = e + 4;
                                c[a >> 2] = (f & 255) << 24 >> 24;
                                c[a + 4 >> 2] = (((f & 255) << 24 >> 24 | 0) < 0) << 31 >> 31;
                                break a
                            }
                        case 16:
                            {
                                e = (c[d >> 2] | 0) + (4 - 1) & ~(4 - 1);
                                f = c[e >> 2] | 0;
                                c[d >> 2] = e + 4;
                                c[a >> 2] = f & 255;
                                c[a + 4 >> 2] = 0;
                                break a
                            }
                        case 17:
                            {
                                f = (c[d >> 2] | 0) + (8 - 1) & ~(8 - 1);
                                g = +h[f >> 3];
                                c[d >> 2] = f + 8;
                                h[a >> 3] = g;
                                break a
                            }
                        case 18:
                            {
                                f = (c[d >> 2] | 0) + (8 - 1) & ~(8 - 1);
                                g = +h[f >> 3];
                                c[d >> 2] = f + 8;
                                h[a >> 3] = g;
                                break a
                            }
                        default:
                            break a
                    }
                    while (0); while (0);
            return
        }

        function Vc(b, c, d) {
            b = b | 0;
            c = c | 0;
            d = d | 0;
            var e = 0;
            if (c >>> 0 > 0 | (c | 0) == 0 & b >>> 0 > 4294967295) {
                while (1) {
                    e = md(b | 0, c | 0, 10, 0) | 0;
                    d = d + -1 | 0;
                    a[d >> 0] = e | 48;
                    e = ld(b | 0, c | 0, 10, 0) | 0;
                    if (c >>> 0 > 9 | (c | 0) == 9 & b >>> 0 > 4294967295) {
                        b = e;
                        c = C
                    } else break
                }
                b = e
            }
            if (b)
                while (1) {
                    d = d + -1 | 0;
                    a[d >> 0] = (b >>> 0) % 10 | 0 | 48;
                    if (b >>> 0 < 10) break;
                    else b = (b >>> 0) / 10 | 0
                }
            return d | 0
        }

        function Wc(a, b, d, e, f) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
                h = 0;
            h = i;
            i = i + 256 | 0;
            do
                if ((d | 0) > (e | 0) & (f & 73728 | 0) == 0) {
                    ad(h | 0, b | 0, ((d - e | 0) >>> 0 > 256 ? 256 : d - e | 0) | 0) | 0;
                    f = c[a >> 2] | 0;
                    if ((d - e | 0) >>> 0 > 255) {
                        g = d - e | 0;
                        b = f;
                        f = (f & 32 | 0) == 0;
                        do {
                            if (f) {
                                Lc(h, 256, a) | 0;
                                b = c[a >> 2] | 0
                            }
                            g = g + -256 | 0;
                            f = (b & 32 | 0) == 0
                        } while (g >>> 0 > 255);
                        if (f) b = d - e & 255;
                        else break
                    } else if (!(f & 32)) b = d - e | 0;
                    else break;
                    Lc(h, b, a) | 0
                }
            while (0);
            i = h;
            return
        }

        function Xc(a) {
            a = a | 0;
            var b = 0,
                d = 0,
                e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0,
                v = 0,
                w = 0,
                x = 0,
                y = 0,
                z = 0,
                A = 0,
                B = 0,
                C = 0,
                D = 0,
                E = 0,
                F = 0,
                G = 0;
            do
                if (a >>> 0 < 245) {
                    n = a >>> 0 < 11 ? 16 : a + 11 & -8;
                    g = c[2010] | 0;
                    if (g >>> (n >>> 3) & 3) {
                        a = (g >>> (n >>> 3) & 1 ^ 1) + (n >>> 3) << 1;
                        b = c[8080 + (a + 2 << 2) >> 2] | 0;
                        d = c[b + 8 >> 2] | 0;
                        do
                            if ((8080 + (a << 2) | 0) != (d | 0)) {
                                if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                                if ((c[d + 12 >> 2] | 0) == (b | 0)) {
                                    c[d + 12 >> 2] = 8080 + (a << 2);
                                    c[8080 + (a + 2 << 2) >> 2] = d;
                                    break
                                } else ma()
                            } else c[2010] = g & ~(1 << (g >>> (n >>> 3) & 1 ^ 1) + (n >>> 3));
                        while (0);
                        G = (g >>> (n >>> 3) & 1 ^ 1) + (n >>> 3) << 3;
                        c[b + 4 >> 2] = G | 3;
                        c[b + (G | 4) >> 2] = c[b + (G | 4) >> 2] | 1;
                        G = b + 8 | 0;
                        return G | 0
                    }
                    b = c[2012] | 0;
                    if (n >>> 0 > b >>> 0) {
                        if (g >>> (n >>> 3)) {
                            a = g >>> (n >>> 3) << (n >>> 3) & (2 << (n >>> 3) | 0 - (2 << (n >>> 3)));
                            f = ((a & 0 - a) + -1 | 0) >>> (((a & 0 - a) + -1 | 0) >>> 12 & 16);
                            e = f >>> (f >>> 5 & 8) >>> (f >>> (f >>> 5 & 8) >>> 2 & 4);
                            e = (f >>> 5 & 8 | ((a & 0 - a) + -1 | 0) >>> 12 & 16 | f >>> (f >>> 5 & 8) >>> 2 & 4 | e >>> 1 & 2 | e >>> (e >>> 1 & 2) >>> 1 & 1) + (e >>> (e >>> 1 & 2) >>> (e >>> (e >>> 1 & 2) >>> 1 & 1)) | 0;
                            f = c[8080 + ((e << 1) + 2 << 2) >> 2] | 0;
                            a = c[f + 8 >> 2] | 0;
                            do
                                if ((8080 + (e << 1 << 2) | 0) != (a | 0)) {
                                    if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                    if ((c[a + 12 >> 2] | 0) == (f | 0)) {
                                        c[a + 12 >> 2] = 8080 + (e << 1 << 2);
                                        c[8080 + ((e << 1) + 2 << 2) >> 2] = a;
                                        h = c[2012] | 0;
                                        break
                                    } else ma()
                                } else {
                                    c[2010] = g & ~(1 << e);
                                    h = b
                                }
                            while (0);
                            c[f + 4 >> 2] = n | 3;
                            c[f + (n | 4) >> 2] = (e << 3) - n | 1;
                            c[f + (e << 3) >> 2] = (e << 3) - n;
                            if (h) {
                                d = c[2015] | 0;
                                b = h >>> 3;
                                a = c[2010] | 0;
                                if (a & 1 << b) {
                                    a = c[8080 + ((b << 1) + 2 << 2) >> 2] | 0;
                                    if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                    else {
                                        i = 8080 + ((b << 1) + 2 << 2) | 0;
                                        j = a
                                    }
                                } else {
                                    c[2010] = a | 1 << b;
                                    i = 8080 + ((b << 1) + 2 << 2) | 0;
                                    j = 8080 + (b << 1 << 2) | 0
                                }
                                c[i >> 2] = d;
                                c[j + 12 >> 2] = d;
                                c[d + 8 >> 2] = j;
                                c[d + 12 >> 2] = 8080 + (b << 1 << 2)
                            }
                            c[2012] = (e << 3) - n;
                            c[2015] = f + n;
                            G = f + 8 | 0;
                            return G | 0
                        }
                        a = c[2011] | 0;
                        if (a) {
                            d = ((a & 0 - a) + -1 | 0) >>> (((a & 0 - a) + -1 | 0) >>> 12 & 16);
                            e = d >>> (d >>> 5 & 8) >>> (d >>> (d >>> 5 & 8) >>> 2 & 4);
                            e = c[8344 + ((d >>> 5 & 8 | ((a & 0 - a) + -1 | 0) >>> 12 & 16 | d >>> (d >>> 5 & 8) >>> 2 & 4 | e >>> 1 & 2 | e >>> (e >>> 1 & 2) >>> 1 & 1) + (e >>> (e >>> 1 & 2) >>> (e >>> (e >>> 1 & 2) >>> 1 & 1)) << 2) >> 2] | 0;
                            d = (c[e + 4 >> 2] & -8) - n | 0;
                            b = e;
                            while (1) {
                                a = c[b + 16 >> 2] | 0;
                                if (!a) {
                                    a = c[b + 20 >> 2] | 0;
                                    if (!a) {
                                        i = d;
                                        break
                                    }
                                }
                                b = (c[a + 4 >> 2] & -8) - n | 0;
                                G = b >>> 0 < d >>> 0;
                                d = G ? b : d;
                                b = a;
                                e = G ? a : e
                            }
                            g = c[2014] | 0;
                            if (e >>> 0 < g >>> 0) ma();
                            if (e >>> 0 >= (e + n | 0) >>> 0) ma();
                            h = c[e + 24 >> 2] | 0;
                            a = c[e + 12 >> 2] | 0;
                            do
                                if ((a | 0) == (e | 0)) {
                                    a = c[e + 20 >> 2] | 0;
                                    if (!a) {
                                        a = c[e + 16 >> 2] | 0;
                                        if (!a) {
                                            k = 0;
                                            break
                                        } else b = e + 16 | 0
                                    } else b = e + 20 | 0;
                                    while (1) {
                                        d = a + 20 | 0;
                                        f = c[d >> 2] | 0;
                                        if (f) {
                                            a = f;
                                            b = d;
                                            continue
                                        }
                                        d = a + 16 | 0;
                                        f = c[d >> 2] | 0;
                                        if (!f) break;
                                        else {
                                            a = f;
                                            b = d
                                        }
                                    }
                                    if (b >>> 0 < g >>> 0) ma();
                                    else {
                                        c[b >> 2] = 0;
                                        k = a;
                                        break
                                    }
                                } else {
                                    b = c[e + 8 >> 2] | 0;
                                    if (b >>> 0 < g >>> 0) ma();
                                    if ((c[b + 12 >> 2] | 0) != (e | 0)) ma();
                                    if ((c[a + 8 >> 2] | 0) == (e | 0)) {
                                        c[b + 12 >> 2] = a;
                                        c[a + 8 >> 2] = b;
                                        k = a;
                                        break
                                    } else ma()
                                }
                            while (0);
                            do
                                if (h) {
                                    a = c[e + 28 >> 2] | 0;
                                    if ((e | 0) == (c[8344 + (a << 2) >> 2] | 0)) {
                                        c[8344 + (a << 2) >> 2] = k;
                                        if (!k) {
                                            c[2011] = c[2011] & ~(1 << a);
                                            break
                                        }
                                    } else {
                                        if (h >>> 0 < (c[2014] | 0) >>> 0) ma();
                                        if ((c[h + 16 >> 2] | 0) == (e | 0)) c[h + 16 >> 2] = k;
                                        else c[h + 20 >> 2] = k;
                                        if (!k) break
                                    }
                                    b = c[2014] | 0;
                                    if (k >>> 0 < b >>> 0) ma();
                                    c[k + 24 >> 2] = h;
                                    a = c[e + 16 >> 2] | 0;
                                    do
                                        if (a)
                                            if (a >>> 0 < b >>> 0) ma();
                                            else {
                                                c[k + 16 >> 2] = a;
                                                c[a + 24 >> 2] = k;
                                                break
                                            }
                                    while (0);
                                    a = c[e + 20 >> 2] | 0;
                                    if (a)
                                        if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                        else {
                                            c[k + 20 >> 2] = a;
                                            c[a + 24 >> 2] = k;
                                            break
                                        }
                                }
                            while (0);
                            if (i >>> 0 < 16) {
                                c[e + 4 >> 2] = i + n | 3;
                                c[e + (i + n + 4) >> 2] = c[e + (i + n + 4) >> 2] | 1
                            } else {
                                c[e + 4 >> 2] = n | 3;
                                c[e + (n | 4) >> 2] = i | 1;
                                c[e + (i + n) >> 2] = i;
                                b = c[2012] | 0;
                                if (b) {
                                    d = c[2015] | 0;
                                    a = c[2010] | 0;
                                    if (a & 1 << (b >>> 3)) {
                                        a = c[8080 + ((b >>> 3 << 1) + 2 << 2) >> 2] | 0;
                                        if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                        else {
                                            l = 8080 + ((b >>> 3 << 1) + 2 << 2) | 0;
                                            m = a
                                        }
                                    } else {
                                        c[2010] = a | 1 << (b >>> 3);
                                        l = 8080 + ((b >>> 3 << 1) + 2 << 2) | 0;
                                        m = 8080 + (b >>> 3 << 1 << 2) | 0
                                    }
                                    c[l >> 2] = d;
                                    c[m + 12 >> 2] = d;
                                    c[d + 8 >> 2] = m;
                                    c[d + 12 >> 2] = 8080 + (b >>> 3 << 1 << 2)
                                }
                                c[2012] = i;
                                c[2015] = e + n
                            }
                            G = e + 8 | 0;
                            return G | 0
                        } else i = n
                    } else i = n
                } else if (a >>> 0 <= 4294967231) {
                k = a + 11 & -8;
                i = c[2011] | 0;
                if (i) {
                    if ((a + 11 | 0) >>> 8)
                        if (k >>> 0 > 16777215) h = 31;
                        else {
                            h = (a + 11 | 0) >>> 8 << ((((a + 11 | 0) >>> 8) + 1048320 | 0) >>> 16 & 8);
                            h = 14 - ((h + 520192 | 0) >>> 16 & 4 | (((a + 11 | 0) >>> 8) + 1048320 | 0) >>> 16 & 8 | ((h << ((h + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) + (h << ((h + 520192 | 0) >>> 16 & 4) << (((h << ((h + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                            h = k >>> (h + 7 | 0) & 1 | h << 1
                        } else h = 0;
                    a = c[8344 + (h << 2) >> 2] | 0;
                    a: do
                        if (!a) {
                            b = 0 - k | 0;
                            d = 0;
                            a = 0;
                            w = 86
                        } else {
                            b = 0 - k | 0;
                            d = 0;
                            f = k << ((h | 0) == 31 ? 0 : 25 - (h >>> 1) | 0);
                            g = a;
                            a = 0;
                            while (1) {
                                e = c[g + 4 >> 2] & -8;
                                if ((e - k | 0) >>> 0 < b >>> 0)
                                    if ((e | 0) == (k | 0)) {
                                        b = e - k | 0;
                                        e = g;
                                        a = g;
                                        w = 90;
                                        break a
                                    } else {
                                        b = e - k | 0;
                                        a = g
                                    }
                                w = c[g + 20 >> 2] | 0;
                                g = c[g + 16 + (f >>> 31 << 2) >> 2] | 0;
                                d = (w | 0) == 0 | (w | 0) == (g | 0) ? d : w;
                                if (!g) {
                                    w = 86;
                                    break
                                } else f = f << 1
                            }
                        }
                    while (0);
                    if ((w | 0) == 86) {
                        if ((d | 0) == 0 & (a | 0) == 0) {
                            a = 2 << h;
                            if (!(i & (a | 0 - a))) {
                                i = k;
                                break
                            }
                            m = (i & (a | 0 - a) & 0 - (i & (a | 0 - a))) + -1 | 0;
                            a = m >>> (m >>> 12 & 16) >>> (m >>> (m >>> 12 & 16) >>> 5 & 8);
                            d = a >>> (a >>> 2 & 4) >>> (a >>> (a >>> 2 & 4) >>> 1 & 2);
                            d = c[8344 + ((m >>> (m >>> 12 & 16) >>> 5 & 8 | m >>> 12 & 16 | a >>> 2 & 4 | a >>> (a >>> 2 & 4) >>> 1 & 2 | d >>> 1 & 1) + (d >>> (d >>> 1 & 1)) << 2) >> 2] | 0;
                            a = 0
                        }
                        if (!d) {
                            i = b;
                            j = a
                        } else {
                            e = d;
                            w = 90
                        }
                    }
                    if ((w | 0) == 90)
                        while (1) {
                            w = 0;
                            m = (c[e + 4 >> 2] & -8) - k | 0;
                            d = m >>> 0 < b >>> 0;
                            b = d ? m : b;
                            a = d ? e : a;
                            d = c[e + 16 >> 2] | 0;
                            if (d) {
                                e = d;
                                w = 90;
                                continue
                            }
                            e = c[e + 20 >> 2] | 0;
                            if (!e) {
                                i = b;
                                j = a;
                                break
                            } else w = 90
                        }
                    if ((j | 0) != 0 ? i >>> 0 < ((c[2012] | 0) - k | 0) >>> 0 : 0) {
                        f = c[2014] | 0;
                        if (j >>> 0 < f >>> 0) ma();
                        h = j + k | 0;
                        if (j >>> 0 >= h >>> 0) ma();
                        g = c[j + 24 >> 2] | 0;
                        a = c[j + 12 >> 2] | 0;
                        do
                            if ((a | 0) == (j | 0)) {
                                b = j + 20 | 0;
                                a = c[b >> 2] | 0;
                                if (!a) {
                                    b = j + 16 | 0;
                                    a = c[b >> 2] | 0;
                                    if (!a) {
                                        n = 0;
                                        break
                                    }
                                }
                                while (1) {
                                    d = a + 20 | 0;
                                    e = c[d >> 2] | 0;
                                    if (e) {
                                        a = e;
                                        b = d;
                                        continue
                                    }
                                    d = a + 16 | 0;
                                    e = c[d >> 2] | 0;
                                    if (!e) break;
                                    else {
                                        a = e;
                                        b = d
                                    }
                                }
                                if (b >>> 0 < f >>> 0) ma();
                                else {
                                    c[b >> 2] = 0;
                                    n = a;
                                    break
                                }
                            } else {
                                b = c[j + 8 >> 2] | 0;
                                if (b >>> 0 < f >>> 0) ma();
                                if ((c[b + 12 >> 2] | 0) != (j | 0)) ma();
                                if ((c[a + 8 >> 2] | 0) == (j | 0)) {
                                    c[b + 12 >> 2] = a;
                                    c[a + 8 >> 2] = b;
                                    n = a;
                                    break
                                } else ma()
                            }
                        while (0);
                        do
                            if (g) {
                                a = c[j + 28 >> 2] | 0;
                                if ((j | 0) == (c[8344 + (a << 2) >> 2] | 0)) {
                                    c[8344 + (a << 2) >> 2] = n;
                                    if (!n) {
                                        c[2011] = c[2011] & ~(1 << a);
                                        break
                                    }
                                } else {
                                    if (g >>> 0 < (c[2014] | 0) >>> 0) ma();
                                    if ((c[g + 16 >> 2] | 0) == (j | 0)) c[g + 16 >> 2] = n;
                                    else c[g + 20 >> 2] = n;
                                    if (!n) break
                                }
                                b = c[2014] | 0;
                                if (n >>> 0 < b >>> 0) ma();
                                c[n + 24 >> 2] = g;
                                a = c[j + 16 >> 2] | 0;
                                do
                                    if (a)
                                        if (a >>> 0 < b >>> 0) ma();
                                        else {
                                            c[n + 16 >> 2] = a;
                                            c[a + 24 >> 2] = n;
                                            break
                                        }
                                while (0);
                                a = c[j + 20 >> 2] | 0;
                                if (a)
                                    if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                    else {
                                        c[n + 20 >> 2] = a;
                                        c[a + 24 >> 2] = n;
                                        break
                                    }
                            }
                        while (0);
                        b: do
                            if (i >>> 0 >= 16) {
                                c[j + 4 >> 2] = k | 3;
                                c[j + (k | 4) >> 2] = i | 1;
                                c[j + (i + k) >> 2] = i;
                                b = i >>> 3;
                                if (i >>> 0 < 256) {
                                    a = c[2010] | 0;
                                    if (a & 1 << b) {
                                        a = c[8080 + ((b << 1) + 2 << 2) >> 2] | 0;
                                        if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                        else {
                                            p = 8080 + ((b << 1) + 2 << 2) | 0;
                                            q = a
                                        }
                                    } else {
                                        c[2010] = a | 1 << b;
                                        p = 8080 + ((b << 1) + 2 << 2) | 0;
                                        q = 8080 + (b << 1 << 2) | 0
                                    }
                                    c[p >> 2] = h;
                                    c[q + 12 >> 2] = h;
                                    c[j + (k + 8) >> 2] = q;
                                    c[j + (k + 12) >> 2] = 8080 + (b << 1 << 2);
                                    break
                                }
                                a = i >>> 8;
                                if (a)
                                    if (i >>> 0 > 16777215) e = 31;
                                    else {
                                        e = a << ((a + 1048320 | 0) >>> 16 & 8) << (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4);
                                        e = 14 - (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (a + 1048320 | 0) >>> 16 & 8 | (e + 245760 | 0) >>> 16 & 2) + (e << ((e + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                                        e = i >>> (e + 7 | 0) & 1 | e << 1
                                    } else e = 0;
                                a = 8344 + (e << 2) | 0;
                                c[j + (k + 28) >> 2] = e;
                                c[j + (k + 20) >> 2] = 0;
                                c[j + (k + 16) >> 2] = 0;
                                b = c[2011] | 0;
                                d = 1 << e;
                                if (!(b & d)) {
                                    c[2011] = b | d;
                                    c[a >> 2] = h;
                                    c[j + (k + 24) >> 2] = a;
                                    c[j + (k + 12) >> 2] = h;
                                    c[j + (k + 8) >> 2] = h;
                                    break
                                }
                                a = c[a >> 2] | 0;
                                c: do
                                    if ((c[a + 4 >> 2] & -8 | 0) != (i | 0)) {
                                        e = i << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
                                        while (1) {
                                            d = a + 16 + (e >>> 31 << 2) | 0;
                                            b = c[d >> 2] | 0;
                                            if (!b) break;
                                            if ((c[b + 4 >> 2] & -8 | 0) == (i | 0)) {
                                                v = b;
                                                break c
                                            } else {
                                                e = e << 1;
                                                a = b
                                            }
                                        }
                                        if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                                        else {
                                            c[d >> 2] = h;
                                            c[j + (k + 24) >> 2] = a;
                                            c[j + (k + 12) >> 2] = h;
                                            c[j + (k + 8) >> 2] = h;
                                            break b
                                        }
                                    } else v = a;
                                while (0);
                                a = v + 8 | 0;
                                b = c[a >> 2] | 0;
                                G = c[2014] | 0;
                                if (b >>> 0 >= G >>> 0 & v >>> 0 >= G >>> 0) {
                                    c[b + 12 >> 2] = h;
                                    c[a >> 2] = h;
                                    c[j + (k + 8) >> 2] = b;
                                    c[j + (k + 12) >> 2] = v;
                                    c[j + (k + 24) >> 2] = 0;
                                    break
                                } else ma()
                            } else {
                                G = i + k | 0;
                                c[j + 4 >> 2] = G | 3;
                                G = j + (G + 4) | 0;
                                c[G >> 2] = c[G >> 2] | 1
                            }
                        while (0);
                        G = j + 8 | 0;
                        return G | 0
                    } else i = k
                } else i = k
            } else i = -1;
            while (0);
            d = c[2012] | 0;
            if (d >>> 0 >= i >>> 0) {
                a = d - i | 0;
                b = c[2015] | 0;
                if (a >>> 0 > 15) {
                    c[2015] = b + i;
                    c[2012] = a;
                    c[b + (i + 4) >> 2] = a | 1;
                    c[b + d >> 2] = a;
                    c[b + 4 >> 2] = i | 3
                } else {
                    c[2012] = 0;
                    c[2015] = 0;
                    c[b + 4 >> 2] = d | 3;
                    c[b + (d + 4) >> 2] = c[b + (d + 4) >> 2] | 1
                }
                G = b + 8 | 0;
                return G | 0
            }
            a = c[2013] | 0;
            if (a >>> 0 > i >>> 0) {
                F = a - i | 0;
                c[2013] = F;
                G = c[2016] | 0;
                c[2016] = G + i;
                c[G + (i + 4) >> 2] = F | 1;
                c[G + 4 >> 2] = i | 3;
                G = G + 8 | 0;
                return G | 0
            }
            do
                if (!(c[2128] | 0)) {
                    a = ya(30) | 0;
                    if (!(a + -1 & a)) {
                        c[2130] = a;
                        c[2129] = a;
                        c[2131] = -1;
                        c[2132] = -1;
                        c[2133] = 0;
                        c[2121] = 0;
                        c[2128] = (Ca(0) | 0) & -16 ^ 1431655768;
                        break
                    } else ma()
                }
            while (0);
            f = i + 48 | 0;
            e = c[2130] | 0;
            g = i + 47 | 0;
            h = e + g & 0 - e;
            if (h >>> 0 <= i >>> 0) {
                G = 0;
                return G | 0
            }
            a = c[2120] | 0;
            if ((a | 0) != 0 ? (v = c[2118] | 0, (v + h | 0) >>> 0 <= v >>> 0 | (v + h | 0) >>> 0 > a >>> 0) : 0) {
                G = 0;
                return G | 0
            }
            d: do
                if (!(c[2121] & 4)) {
                    b = c[2016] | 0;
                    e: do
                        if (b) {
                            a = 8488;
                            while (1) {
                                d = c[a >> 2] | 0;
                                if (d >>> 0 <= b >>> 0 ? (o = a + 4 | 0, (d + (c[o >> 2] | 0) | 0) >>> 0 > b >>> 0) : 0) break;
                                a = c[a + 8 >> 2] | 0;
                                if (!a) {
                                    w = 174;
                                    break e
                                }
                            }
                            b = e + g - (c[2013] | 0) & 0 - e;
                            if (b >>> 0 < 2147483647) {
                                d = pa(b | 0) | 0;
                                v = (d | 0) == ((c[a >> 2] | 0) + (c[o >> 2] | 0) | 0);
                                a = v ? b : 0;
                                if (v) {
                                    if ((d | 0) != (-1 | 0)) {
                                        q = d;
                                        p = a;
                                        w = 194;
                                        break d
                                    }
                                } else w = 184
                            } else a = 0
                        } else w = 174;
                    while (0);
                    do
                        if ((w | 0) == 174) {
                            e = pa(0) | 0;
                            if ((e | 0) != (-1 | 0)) {
                                a = c[2129] | 0;
                                if (!(a + -1 & e)) b = h;
                                else b = h - e + (a + -1 + e & 0 - a) | 0;
                                a = c[2118] | 0;
                                d = a + b | 0;
                                if (b >>> 0 > i >>> 0 & b >>> 0 < 2147483647) {
                                    v = c[2120] | 0;
                                    if ((v | 0) != 0 ? d >>> 0 <= a >>> 0 | d >>> 0 > v >>> 0 : 0) {
                                        a = 0;
                                        break
                                    }
                                    d = pa(b | 0) | 0;
                                    a = (d | 0) == (e | 0) ? b : 0;
                                    if ((d | 0) == (e | 0)) {
                                        q = e;
                                        p = a;
                                        w = 194;
                                        break d
                                    } else w = 184
                                } else a = 0
                            } else a = 0
                        }
                    while (0);
                    f: do
                        if ((w | 0) == 184) {
                            e = 0 - b | 0;
                            do
                                if (f >>> 0 > b >>> 0 & (b >>> 0 < 2147483647 & (d | 0) != (-1 | 0)) ? (r = c[2130] | 0, r = g - b + r & 0 - r, r >>> 0 < 2147483647) : 0)
                                    if ((pa(r | 0) | 0) == (-1 | 0)) {
                                        pa(e | 0) | 0;
                                        break f
                                    } else {
                                        b = r + b | 0;
                                        break
                                    }
                            while (0);
                            if ((d | 0) != (-1 | 0)) {
                                q = d;
                                p = b;
                                w = 194;
                                break d
                            }
                        }
                    while (0);
                    c[2121] = c[2121] | 4;
                    w = 191
                } else {
                    a = 0;
                    w = 191
                }
            while (0);
            if ((((w | 0) == 191 ? h >>> 0 < 2147483647 : 0) ? (s = pa(h | 0) | 0, t = pa(0) | 0, s >>> 0 < t >>> 0 & ((s | 0) != (-1 | 0) & (t | 0) != (-1 | 0))) : 0) ? (u = (t - s | 0) >>> 0 > (i + 40 | 0) >>> 0, u) : 0) {
                q = s;
                p = u ? t - s | 0 : a;
                w = 194
            }
            if ((w | 0) == 194) {
                a = (c[2118] | 0) + p | 0;
                c[2118] = a;
                if (a >>> 0 > (c[2119] | 0) >>> 0) c[2119] = a;
                g = c[2016] | 0;
                g: do
                    if (g) {
                        e = 8488;
                        do {
                            a = c[e >> 2] | 0;
                            b = e + 4 | 0;
                            d = c[b >> 2] | 0;
                            if ((q | 0) == (a + d | 0)) {
                                x = e;
                                w = 204;
                                break
                            }
                            e = c[e + 8 >> 2] | 0
                        } while ((e | 0) != 0);
                        if (((w | 0) == 204 ? (c[x + 12 >> 2] & 8 | 0) == 0 : 0) ? g >>> 0 < q >>> 0 & g >>> 0 >= a >>> 0 : 0) {
                            c[b >> 2] = d + p;
                            G = (c[2013] | 0) + p | 0;
                            F = (g + 8 & 7 | 0) == 0 ? 0 : 0 - (g + 8) & 7;
                            c[2016] = g + F;
                            c[2013] = G - F;
                            c[g + (F + 4) >> 2] = G - F | 1;
                            c[g + (G + 4) >> 2] = 40;
                            c[2017] = c[2132];
                            break
                        }
                        a = c[2014] | 0;
                        if (q >>> 0 < a >>> 0) {
                            c[2014] = q;
                            l = q
                        } else l = a;
                        a = q + p | 0;
                        d = 8488;
                        while (1) {
                            if ((c[d >> 2] | 0) == (a | 0)) {
                                b = d;
                                a = d;
                                w = 212;
                                break
                            }
                            d = c[d + 8 >> 2] | 0;
                            if (!d) {
                                a = 8488;
                                break
                            }
                        }
                        if ((w | 0) == 212)
                            if (!(c[a + 12 >> 2] & 8)) {
                                c[b >> 2] = q;
                                c[a + 4 >> 2] = (c[a + 4 >> 2] | 0) + p;
                                n = q + 8 | 0;
                                n = (n & 7 | 0) == 0 ? 0 : 0 - n & 7;
                                j = q + (p + 8) | 0;
                                j = (j & 7 | 0) == 0 ? 0 : 0 - j & 7;
                                a = q + (j + p) | 0;
                                m = n + i | 0;
                                o = q + m | 0;
                                k = a - (q + n) - i | 0;
                                c[q + (n + 4) >> 2] = i | 3;
                                h: do
                                    if ((a | 0) != (g | 0)) {
                                        if ((a | 0) == (c[2015] | 0)) {
                                            G = (c[2012] | 0) + k | 0;
                                            c[2012] = G;
                                            c[2015] = o;
                                            c[q + (m + 4) >> 2] = G | 1;
                                            c[q + (G + m) >> 2] = G;
                                            break
                                        }
                                        h = p + 4 | 0;
                                        i = c[q + (h + j) >> 2] | 0;
                                        if ((i & 3 | 0) == 1) {
                                            i: do
                                                if (i >>> 0 >= 256) {
                                                    g = c[q + ((j | 24) + p) >> 2] | 0;
                                                    b = c[q + (p + 12 + j) >> 2] | 0;
                                                    do
                                                        if ((b | 0) == (a | 0)) {
                                                            d = q + (h + (j | 16)) | 0;
                                                            b = c[d >> 2] | 0;
                                                            if (!b) {
                                                                d = q + ((j | 16) + p) | 0;
                                                                b = c[d >> 2] | 0;
                                                                if (!b) {
                                                                    D = 0;
                                                                    break
                                                                }
                                                            }
                                                            while (1) {
                                                                e = b + 20 | 0;
                                                                f = c[e >> 2] | 0;
                                                                if (f) {
                                                                    b = f;
                                                                    d = e;
                                                                    continue
                                                                }
                                                                e = b + 16 | 0;
                                                                f = c[e >> 2] | 0;
                                                                if (!f) break;
                                                                else {
                                                                    b = f;
                                                                    d = e
                                                                }
                                                            }
                                                            if (d >>> 0 < l >>> 0) ma();
                                                            else {
                                                                c[d >> 2] = 0;
                                                                D = b;
                                                                break
                                                            }
                                                        } else {
                                                            d = c[q + ((j | 8) + p) >> 2] | 0;
                                                            if (d >>> 0 < l >>> 0) ma();
                                                            if ((c[d + 12 >> 2] | 0) != (a | 0)) ma();
                                                            if ((c[b + 8 >> 2] | 0) == (a | 0)) {
                                                                c[d + 12 >> 2] = b;
                                                                c[b + 8 >> 2] = d;
                                                                D = b;
                                                                break
                                                            } else ma()
                                                        }
                                                    while (0);
                                                    if (!g) break;
                                                    b = c[q + (p + 28 + j) >> 2] | 0;
                                                    do
                                                        if ((a | 0) != (c[8344 + (b << 2) >> 2] | 0)) {
                                                            if (g >>> 0 < (c[2014] | 0) >>> 0) ma();
                                                            if ((c[g + 16 >> 2] | 0) == (a | 0)) c[g + 16 >> 2] = D;
                                                            else c[g + 20 >> 2] = D;
                                                            if (!D) break i
                                                        } else {
                                                            c[8344 + (b << 2) >> 2] = D;
                                                            if (D) break;
                                                            c[2011] = c[2011] & ~(1 << b);
                                                            break i
                                                        }
                                                    while (0);
                                                    b = c[2014] | 0;
                                                    if (D >>> 0 < b >>> 0) ma();
                                                    c[D + 24 >> 2] = g;
                                                    a = c[q + ((j | 16) + p) >> 2] | 0;
                                                    do
                                                        if (a)
                                                            if (a >>> 0 < b >>> 0) ma();
                                                            else {
                                                                c[D + 16 >> 2] = a;
                                                                c[a + 24 >> 2] = D;
                                                                break
                                                            }
                                                    while (0);
                                                    a = c[q + (h + (j | 16)) >> 2] | 0;
                                                    if (!a) break;
                                                    if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                                    else {
                                                        c[D + 20 >> 2] = a;
                                                        c[a + 24 >> 2] = D;
                                                        break
                                                    }
                                                } else {
                                                    b = c[q + ((j | 8) + p) >> 2] | 0;
                                                    d = c[q + (p + 12 + j) >> 2] | 0;
                                                    do
                                                        if ((b | 0) != (8080 + (i >>> 3 << 1 << 2) | 0)) {
                                                            if (b >>> 0 < l >>> 0) ma();
                                                            if ((c[b + 12 >> 2] | 0) == (a | 0)) break;
                                                            ma()
                                                        }
                                                    while (0);
                                                    if ((d | 0) == (b | 0)) {
                                                        c[2010] = c[2010] & ~(1 << (i >>> 3));
                                                        break
                                                    }
                                                    do
                                                        if ((d | 0) == (8080 + (i >>> 3 << 1 << 2) | 0)) B = d + 8 | 0;
                                                        else {
                                                            if (d >>> 0 < l >>> 0) ma();
                                                            if ((c[d + 8 >> 2] | 0) == (a | 0)) {
                                                                B = d + 8 | 0;
                                                                break
                                                            }
                                                            ma()
                                                        }
                                                    while (0);
                                                    c[b + 12 >> 2] = d;
                                                    c[B >> 2] = b
                                                }while (0);a = q + ((i & -8 | j) + p) | 0;f = (i & -8) + k | 0
                                        } else f = k;
                                        b = a + 4 | 0;
                                        c[b >> 2] = c[b >> 2] & -2;
                                        c[q + (m + 4) >> 2] = f | 1;
                                        c[q + (f + m) >> 2] = f;
                                        b = f >>> 3;
                                        if (f >>> 0 < 256) {
                                            a = c[2010] | 0;
                                            do
                                                if (!(a & 1 << b)) {
                                                    c[2010] = a | 1 << b;
                                                    E = 8080 + ((b << 1) + 2 << 2) | 0;
                                                    F = 8080 + (b << 1 << 2) | 0
                                                } else {
                                                    a = c[8080 + ((b << 1) + 2 << 2) >> 2] | 0;
                                                    if (a >>> 0 >= (c[2014] | 0) >>> 0) {
                                                        E = 8080 + ((b << 1) + 2 << 2) | 0;
                                                        F = a;
                                                        break
                                                    }
                                                    ma()
                                                }
                                            while (0);
                                            c[E >> 2] = o;
                                            c[F + 12 >> 2] = o;
                                            c[q + (m + 8) >> 2] = F;
                                            c[q + (m + 12) >> 2] = 8080 + (b << 1 << 2);
                                            break
                                        }
                                        a = f >>> 8;
                                        do
                                            if (!a) e = 0;
                                            else {
                                                if (f >>> 0 > 16777215) {
                                                    e = 31;
                                                    break
                                                }
                                                e = a << ((a + 1048320 | 0) >>> 16 & 8) << (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4);
                                                e = 14 - (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (a + 1048320 | 0) >>> 16 & 8 | (e + 245760 | 0) >>> 16 & 2) + (e << ((e + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                                                e = f >>> (e + 7 | 0) & 1 | e << 1
                                            }
                                        while (0);
                                        a = 8344 + (e << 2) | 0;
                                        c[q + (m + 28) >> 2] = e;
                                        c[q + (m + 20) >> 2] = 0;
                                        c[q + (m + 16) >> 2] = 0;
                                        b = c[2011] | 0;
                                        d = 1 << e;
                                        if (!(b & d)) {
                                            c[2011] = b | d;
                                            c[a >> 2] = o;
                                            c[q + (m + 24) >> 2] = a;
                                            c[q + (m + 12) >> 2] = o;
                                            c[q + (m + 8) >> 2] = o;
                                            break
                                        }
                                        a = c[a >> 2] | 0;
                                        j: do
                                            if ((c[a + 4 >> 2] & -8 | 0) != (f | 0)) {
                                                e = f << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
                                                while (1) {
                                                    d = a + 16 + (e >>> 31 << 2) | 0;
                                                    b = c[d >> 2] | 0;
                                                    if (!b) break;
                                                    if ((c[b + 4 >> 2] & -8 | 0) == (f | 0)) {
                                                        G = b;
                                                        break j
                                                    } else {
                                                        e = e << 1;
                                                        a = b
                                                    }
                                                }
                                                if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                                                else {
                                                    c[d >> 2] = o;
                                                    c[q + (m + 24) >> 2] = a;
                                                    c[q + (m + 12) >> 2] = o;
                                                    c[q + (m + 8) >> 2] = o;
                                                    break h
                                                }
                                            } else G = a;
                                        while (0);
                                        a = G + 8 | 0;
                                        b = c[a >> 2] | 0;
                                        F = c[2014] | 0;
                                        if (b >>> 0 >= F >>> 0 & G >>> 0 >= F >>> 0) {
                                            c[b + 12 >> 2] = o;
                                            c[a >> 2] = o;
                                            c[q + (m + 8) >> 2] = b;
                                            c[q + (m + 12) >> 2] = G;
                                            c[q + (m + 24) >> 2] = 0;
                                            break
                                        } else ma()
                                    } else {
                                        G = (c[2013] | 0) + k | 0;
                                        c[2013] = G;
                                        c[2016] = o;
                                        c[q + (m + 4) >> 2] = G | 1
                                    }
                                while (0);
                                G = q + (n | 8) | 0;
                                return G | 0
                            } else a = 8488;
                        while (1) {
                            b = c[a >> 2] | 0;
                            if (b >>> 0 <= g >>> 0 ? (y = c[a + 4 >> 2] | 0, (b + y | 0) >>> 0 > g >>> 0) : 0) break;
                            a = c[a + 8 >> 2] | 0
                        }
                        f = b + (y + -47 + ((b + (y + -39) & 7 | 0) == 0 ? 0 : 0 - (b + (y + -39)) & 7)) | 0;
                        f = f >>> 0 < (g + 16 | 0) >>> 0 ? g : f;
                        G = q + 8 | 0;
                        G = (G & 7 | 0) == 0 ? 0 : 0 - G & 7;
                        F = p + -40 - G | 0;
                        c[2016] = q + G;
                        c[2013] = F;
                        c[q + (G + 4) >> 2] = F | 1;
                        c[q + (p + -36) >> 2] = 40;
                        c[2017] = c[2132];
                        c[f + 4 >> 2] = 27;
                        c[f + 8 >> 2] = c[2122];
                        c[f + 8 + 4 >> 2] = c[2123];
                        c[f + 8 + 8 >> 2] = c[2124];
                        c[f + 8 + 12 >> 2] = c[2125];
                        c[2122] = q;
                        c[2123] = p;
                        c[2125] = 0;
                        c[2124] = f + 8;
                        c[f + 28 >> 2] = 7;
                        if ((f + 32 | 0) >>> 0 < (b + y | 0) >>> 0) {
                            a = f + 28 | 0;
                            do {
                                G = a;
                                a = a + 4 | 0;
                                c[a >> 2] = 7
                            } while ((G + 8 | 0) >>> 0 < (b + y | 0) >>> 0)
                        }
                        if ((f | 0) != (g | 0)) {
                            c[f + 4 >> 2] = c[f + 4 >> 2] & -2;
                            c[g + 4 >> 2] = f - g | 1;
                            c[f >> 2] = f - g;
                            if ((f - g | 0) >>> 0 < 256) {
                                a = c[2010] | 0;
                                if (a & 1 << ((f - g | 0) >>> 3)) {
                                    a = c[8080 + (((f - g | 0) >>> 3 << 1) + 2 << 2) >> 2] | 0;
                                    if (a >>> 0 < (c[2014] | 0) >>> 0) ma();
                                    else {
                                        z = 8080 + (((f - g | 0) >>> 3 << 1) + 2 << 2) | 0;
                                        A = a
                                    }
                                } else {
                                    c[2010] = a | 1 << ((f - g | 0) >>> 3);
                                    z = 8080 + (((f - g | 0) >>> 3 << 1) + 2 << 2) | 0;
                                    A = 8080 + ((f - g | 0) >>> 3 << 1 << 2) | 0
                                }
                                c[z >> 2] = g;
                                c[A + 12 >> 2] = g;
                                c[g + 8 >> 2] = A;
                                c[g + 12 >> 2] = 8080 + ((f - g | 0) >>> 3 << 1 << 2);
                                break
                            }
                            if ((f - g | 0) >>> 8)
                                if ((f - g | 0) >>> 0 > 16777215) e = 31;
                                else {
                                    e = (f - g | 0) >>> 8 << ((((f - g | 0) >>> 8) + 1048320 | 0) >>> 16 & 8);
                                    e = 14 - ((e + 520192 | 0) >>> 16 & 4 | (((f - g | 0) >>> 8) + 1048320 | 0) >>> 16 & 8 | ((e << ((e + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) + (e << ((e + 520192 | 0) >>> 16 & 4) << (((e << ((e + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                                    e = (f - g | 0) >>> (e + 7 | 0) & 1 | e << 1
                                } else e = 0;
                            a = 8344 + (e << 2) | 0;
                            c[g + 28 >> 2] = e;
                            c[g + 20 >> 2] = 0;
                            c[g + 16 >> 2] = 0;
                            b = c[2011] | 0;
                            d = 1 << e;
                            if (!(b & d)) {
                                c[2011] = b | d;
                                c[a >> 2] = g;
                                c[g + 24 >> 2] = a;
                                c[g + 12 >> 2] = g;
                                c[g + 8 >> 2] = g;
                                break
                            }
                            a = c[a >> 2] | 0;
                            k: do
                                if ((c[a + 4 >> 2] & -8 | 0) != (f - g | 0)) {
                                    e = f - g << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
                                    while (1) {
                                        d = a + 16 + (e >>> 31 << 2) | 0;
                                        b = c[d >> 2] | 0;
                                        if (!b) break;
                                        if ((c[b + 4 >> 2] & -8 | 0) == (f - g | 0)) {
                                            C = b;
                                            break k
                                        } else {
                                            e = e << 1;
                                            a = b
                                        }
                                    }
                                    if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                                    else {
                                        c[d >> 2] = g;
                                        c[g + 24 >> 2] = a;
                                        c[g + 12 >> 2] = g;
                                        c[g + 8 >> 2] = g;
                                        break g
                                    }
                                } else C = a;
                            while (0);
                            a = C + 8 | 0;
                            b = c[a >> 2] | 0;
                            G = c[2014] | 0;
                            if (b >>> 0 >= G >>> 0 & C >>> 0 >= G >>> 0) {
                                c[b + 12 >> 2] = g;
                                c[a >> 2] = g;
                                c[g + 8 >> 2] = b;
                                c[g + 12 >> 2] = C;
                                c[g + 24 >> 2] = 0;
                                break
                            } else ma()
                        }
                    } else {
                        G = c[2014] | 0;
                        if ((G | 0) == 0 | q >>> 0 < G >>> 0) c[2014] = q;
                        c[2122] = q;
                        c[2123] = p;
                        c[2125] = 0;
                        c[2019] = c[2128];
                        c[2018] = -1;
                        a = 0;
                        do {
                            G = a << 1;
                            c[8080 + (G + 3 << 2) >> 2] = 8080 + (G << 2);
                            c[8080 + (G + 2 << 2) >> 2] = 8080 + (G << 2);
                            a = a + 1 | 0
                        } while ((a | 0) != 32);
                        G = q + 8 | 0;
                        G = (G & 7 | 0) == 0 ? 0 : 0 - G & 7;
                        F = p + -40 - G | 0;
                        c[2016] = q + G;
                        c[2013] = F;
                        c[q + (G + 4) >> 2] = F | 1;
                        c[q + (p + -36) >> 2] = 40;
                        c[2017] = c[2132]
                    }
                while (0);
                a = c[2013] | 0;
                if (a >>> 0 > i >>> 0) {
                    F = a - i | 0;
                    c[2013] = F;
                    G = c[2016] | 0;
                    c[2016] = G + i;
                    c[G + (i + 4) >> 2] = F | 1;
                    c[G + 4 >> 2] = i | 3;
                    G = G + 8 | 0;
                    return G | 0
                }
            }
            c[(qc() | 0) >> 2] = 12;
            G = 0;
            return G | 0
        }

        function Yc(a) {
            a = a | 0;
            var b = 0,
                d = 0,
                e = 0,
                f = 0,
                g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0,
                q = 0,
                r = 0,
                s = 0,
                t = 0,
                u = 0;
            if (!a) return;
            i = c[2014] | 0;
            if ((a + -8 | 0) >>> 0 < i >>> 0) ma();
            p = c[a + -4 >> 2] | 0;
            if ((p & 3 | 0) == 1) ma();
            o = a + ((p & -8) + -8) | 0;
            do
                if (!(p & 1)) {
                    k = c[a + -8 >> 2] | 0;
                    if (!(p & 3)) return;
                    l = a + (-8 - k) | 0;
                    m = k + (p & -8) | 0;
                    if (l >>> 0 < i >>> 0) ma();
                    if ((l | 0) == (c[2015] | 0)) {
                        b = c[a + ((p & -8) + -4) >> 2] | 0;
                        if ((b & 3 | 0) != 3) {
                            t = l;
                            g = m;
                            break
                        }
                        c[2012] = m;
                        c[a + ((p & -8) + -4) >> 2] = b & -2;
                        c[a + (-8 - k + 4) >> 2] = m | 1;
                        c[o >> 2] = m;
                        return
                    }
                    if (k >>> 0 < 256) {
                        b = c[a + (-8 - k + 8) >> 2] | 0;
                        d = c[a + (-8 - k + 12) >> 2] | 0;
                        if ((b | 0) != (8080 + (k >>> 3 << 1 << 2) | 0)) {
                            if (b >>> 0 < i >>> 0) ma();
                            if ((c[b + 12 >> 2] | 0) != (l | 0)) ma()
                        }
                        if ((d | 0) == (b | 0)) {
                            c[2010] = c[2010] & ~(1 << (k >>> 3));
                            t = l;
                            g = m;
                            break
                        }
                        if ((d | 0) != (8080 + (k >>> 3 << 1 << 2) | 0)) {
                            if (d >>> 0 < i >>> 0) ma();
                            if ((c[d + 8 >> 2] | 0) != (l | 0)) ma();
                            else e = d + 8 | 0
                        } else e = d + 8 | 0;
                        c[b + 12 >> 2] = d;
                        c[e >> 2] = b;
                        t = l;
                        g = m;
                        break
                    }
                    h = c[a + (-8 - k + 24) >> 2] | 0;
                    b = c[a + (-8 - k + 12) >> 2] | 0;
                    do
                        if ((b | 0) == (l | 0)) {
                            b = c[a + (-8 - k + 20) >> 2] | 0;
                            if (!b) {
                                b = c[a + (-8 - k + 16) >> 2] | 0;
                                if (!b) {
                                    j = 0;
                                    break
                                } else d = a + (-8 - k + 16) | 0
                            } else d = a + (-8 - k + 20) | 0;
                            while (1) {
                                e = b + 20 | 0;
                                f = c[e >> 2] | 0;
                                if (f) {
                                    b = f;
                                    d = e;
                                    continue
                                }
                                e = b + 16 | 0;
                                f = c[e >> 2] | 0;
                                if (!f) break;
                                else {
                                    b = f;
                                    d = e
                                }
                            }
                            if (d >>> 0 < i >>> 0) ma();
                            else {
                                c[d >> 2] = 0;
                                j = b;
                                break
                            }
                        } else {
                            d = c[a + (-8 - k + 8) >> 2] | 0;
                            if (d >>> 0 < i >>> 0) ma();
                            if ((c[d + 12 >> 2] | 0) != (l | 0)) ma();
                            if ((c[b + 8 >> 2] | 0) == (l | 0)) {
                                c[d + 12 >> 2] = b;
                                c[b + 8 >> 2] = d;
                                j = b;
                                break
                            } else ma()
                        }
                    while (0);
                    if (h) {
                        b = c[a + (-8 - k + 28) >> 2] | 0;
                        if ((l | 0) == (c[8344 + (b << 2) >> 2] | 0)) {
                            c[8344 + (b << 2) >> 2] = j;
                            if (!j) {
                                c[2011] = c[2011] & ~(1 << b);
                                t = l;
                                g = m;
                                break
                            }
                        } else {
                            if (h >>> 0 < (c[2014] | 0) >>> 0) ma();
                            if ((c[h + 16 >> 2] | 0) == (l | 0)) c[h + 16 >> 2] = j;
                            else c[h + 20 >> 2] = j;
                            if (!j) {
                                t = l;
                                g = m;
                                break
                            }
                        }
                        d = c[2014] | 0;
                        if (j >>> 0 < d >>> 0) ma();
                        c[j + 24 >> 2] = h;
                        b = c[a + (-8 - k + 16) >> 2] | 0;
                        do
                            if (b)
                                if (b >>> 0 < d >>> 0) ma();
                                else {
                                    c[j + 16 >> 2] = b;
                                    c[b + 24 >> 2] = j;
                                    break
                                }
                        while (0);
                        b = c[a + (-8 - k + 20) >> 2] | 0;
                        if (b)
                            if (b >>> 0 < (c[2014] | 0) >>> 0) ma();
                            else {
                                c[j + 20 >> 2] = b;
                                c[b + 24 >> 2] = j;
                                t = l;
                                g = m;
                                break
                            } else {
                            t = l;
                            g = m
                        }
                    } else {
                        t = l;
                        g = m
                    }
                } else {
                    t = a + -8 | 0;
                    g = p & -8
                }
            while (0);
            if (t >>> 0 >= o >>> 0) ma();
            e = c[a + ((p & -8) + -4) >> 2] | 0;
            if (!(e & 1)) ma();
            if (!(e & 2)) {
                if ((o | 0) == (c[2016] | 0)) {
                    u = (c[2013] | 0) + g | 0;
                    c[2013] = u;
                    c[2016] = t;
                    c[t + 4 >> 2] = u | 1;
                    if ((t | 0) != (c[2015] | 0)) return;
                    c[2015] = 0;
                    c[2012] = 0;
                    return
                }
                if ((o | 0) == (c[2015] | 0)) {
                    u = (c[2012] | 0) + g | 0;
                    c[2012] = u;
                    c[2015] = t;
                    c[t + 4 >> 2] = u | 1;
                    c[t + u >> 2] = u;
                    return
                }
                g = (e & -8) + g | 0;
                do
                    if (e >>> 0 >= 256) {
                        h = c[a + ((p & -8) + 16) >> 2] | 0;
                        b = c[a + (p & -8 | 4) >> 2] | 0;
                        do
                            if ((b | 0) == (o | 0)) {
                                b = c[a + ((p & -8) + 12) >> 2] | 0;
                                if (!b) {
                                    b = c[a + ((p & -8) + 8) >> 2] | 0;
                                    if (!b) {
                                        q = 0;
                                        break
                                    } else d = a + ((p & -8) + 8) | 0
                                } else d = a + ((p & -8) + 12) | 0;
                                while (1) {
                                    e = b + 20 | 0;
                                    f = c[e >> 2] | 0;
                                    if (f) {
                                        b = f;
                                        d = e;
                                        continue
                                    }
                                    e = b + 16 | 0;
                                    f = c[e >> 2] | 0;
                                    if (!f) break;
                                    else {
                                        b = f;
                                        d = e
                                    }
                                }
                                if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                                else {
                                    c[d >> 2] = 0;
                                    q = b;
                                    break
                                }
                            } else {
                                d = c[a + (p & -8) >> 2] | 0;
                                if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                                if ((c[d + 12 >> 2] | 0) != (o | 0)) ma();
                                if ((c[b + 8 >> 2] | 0) == (o | 0)) {
                                    c[d + 12 >> 2] = b;
                                    c[b + 8 >> 2] = d;
                                    q = b;
                                    break
                                } else ma()
                            }
                        while (0);
                        if (h) {
                            b = c[a + ((p & -8) + 20) >> 2] | 0;
                            if ((o | 0) == (c[8344 + (b << 2) >> 2] | 0)) {
                                c[8344 + (b << 2) >> 2] = q;
                                if (!q) {
                                    c[2011] = c[2011] & ~(1 << b);
                                    break
                                }
                            } else {
                                if (h >>> 0 < (c[2014] | 0) >>> 0) ma();
                                if ((c[h + 16 >> 2] | 0) == (o | 0)) c[h + 16 >> 2] = q;
                                else c[h + 20 >> 2] = q;
                                if (!q) break
                            }
                            d = c[2014] | 0;
                            if (q >>> 0 < d >>> 0) ma();
                            c[q + 24 >> 2] = h;
                            b = c[a + ((p & -8) + 8) >> 2] | 0;
                            do
                                if (b)
                                    if (b >>> 0 < d >>> 0) ma();
                                    else {
                                        c[q + 16 >> 2] = b;
                                        c[b + 24 >> 2] = q;
                                        break
                                    }
                            while (0);
                            b = c[a + ((p & -8) + 12) >> 2] | 0;
                            if (b)
                                if (b >>> 0 < (c[2014] | 0) >>> 0) ma();
                                else {
                                    c[q + 20 >> 2] = b;
                                    c[b + 24 >> 2] = q;
                                    break
                                }
                        }
                    } else {
                        d = c[a + (p & -8) >> 2] | 0;
                        b = c[a + (p & -8 | 4) >> 2] | 0;
                        if ((d | 0) != (8080 + (e >>> 3 << 1 << 2) | 0)) {
                            if (d >>> 0 < (c[2014] | 0) >>> 0) ma();
                            if ((c[d + 12 >> 2] | 0) != (o | 0)) ma()
                        }
                        if ((b | 0) == (d | 0)) {
                            c[2010] = c[2010] & ~(1 << (e >>> 3));
                            break
                        }
                        if ((b | 0) != (8080 + (e >>> 3 << 1 << 2) | 0)) {
                            if (b >>> 0 < (c[2014] | 0) >>> 0) ma();
                            if ((c[b + 8 >> 2] | 0) != (o | 0)) ma();
                            else n = b + 8 | 0
                        } else n = b + 8 | 0;
                        c[d + 12 >> 2] = b;
                        c[n >> 2] = d
                    }
                while (0);
                c[t + 4 >> 2] = g | 1;
                c[t + g >> 2] = g;
                if ((t | 0) == (c[2015] | 0)) {
                    c[2012] = g;
                    return
                }
            } else {
                c[a + ((p & -8) + -4) >> 2] = e & -2;
                c[t + 4 >> 2] = g | 1;
                c[t + g >> 2] = g
            }
            d = g >>> 3;
            if (g >>> 0 < 256) {
                b = c[2010] | 0;
                if (b & 1 << d) {
                    b = c[8080 + ((d << 1) + 2 << 2) >> 2] | 0;
                    if (b >>> 0 < (c[2014] | 0) >>> 0) ma();
                    else {
                        r = 8080 + ((d << 1) + 2 << 2) | 0;
                        s = b
                    }
                } else {
                    c[2010] = b | 1 << d;
                    r = 8080 + ((d << 1) + 2 << 2) | 0;
                    s = 8080 + (d << 1 << 2) | 0
                }
                c[r >> 2] = t;
                c[s + 12 >> 2] = t;
                c[t + 8 >> 2] = s;
                c[t + 12 >> 2] = 8080 + (d << 1 << 2);
                return
            }
            b = g >>> 8;
            if (b)
                if (g >>> 0 > 16777215) f = 31;
                else {
                    f = b << ((b + 1048320 | 0) >>> 16 & 8) << (((b << ((b + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4);
                    f = 14 - (((b << ((b + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (b + 1048320 | 0) >>> 16 & 8 | (f + 245760 | 0) >>> 16 & 2) + (f << ((f + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                    f = g >>> (f + 7 | 0) & 1 | f << 1
                } else f = 0;
            b = 8344 + (f << 2) | 0;
            c[t + 28 >> 2] = f;
            c[t + 20 >> 2] = 0;
            c[t + 16 >> 2] = 0;
            d = c[2011] | 0;
            e = 1 << f;
            a: do
                if (d & e) {
                    b = c[b >> 2] | 0;
                    b: do
                        if ((c[b + 4 >> 2] & -8 | 0) != (g | 0)) {
                            f = g << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
                            while (1) {
                                e = b + 16 + (f >>> 31 << 2) | 0;
                                d = c[e >> 2] | 0;
                                if (!d) break;
                                if ((c[d + 4 >> 2] & -8 | 0) == (g | 0)) {
                                    u = d;
                                    break b
                                } else {
                                    f = f << 1;
                                    b = d
                                }
                            }
                            if (e >>> 0 < (c[2014] | 0) >>> 0) ma();
                            else {
                                c[e >> 2] = t;
                                c[t + 24 >> 2] = b;
                                c[t + 12 >> 2] = t;
                                c[t + 8 >> 2] = t;
                                break a
                            }
                        } else u = b;
                    while (0);
                    b = u + 8 | 0;
                    d = c[b >> 2] | 0;
                    s = c[2014] | 0;
                    if (d >>> 0 >= s >>> 0 & u >>> 0 >= s >>> 0) {
                        c[d + 12 >> 2] = t;
                        c[b >> 2] = t;
                        c[t + 8 >> 2] = d;
                        c[t + 12 >> 2] = u;
                        c[t + 24 >> 2] = 0;
                        break
                    } else ma()
                } else {
                    c[2011] = d | e;
                    c[b >> 2] = t;
                    c[t + 24 >> 2] = b;
                    c[t + 12 >> 2] = t;
                    c[t + 8 >> 2] = t
                }
            while (0);
            u = (c[2018] | 0) + -1 | 0;
            c[2018] = u;
            if (!u) b = 8496;
            else return;
            while (1) {
                b = c[b >> 2] | 0;
                if (!b) break;
                else b = b + 8 | 0
            }
            c[2018] = -1;
            return
        }

        function Zc(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0;
            if (a) {
                d = _(b, a) | 0;
                if ((b | a) >>> 0 > 65535) d = ((d >>> 0) / (a >>> 0) | 0 | 0) == (b | 0) ? d : -1
            } else d = 0;
            b = Xc(d) | 0;
            if (!b) return b | 0;
            if (!(c[b + -4 >> 2] & 3)) return b | 0;
            ad(b | 0, 0, d | 0) | 0;
            return b | 0
        }

        function _c() {}

        function $c(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            d = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0;
            return (C = d, a - c >>> 0 | 0) | 0
        }

        function ad(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
                g = 0,
                h = 0;
            f = b + e | 0;
            if ((e | 0) >= 20) {
                d = d & 255;
                g = b & 3;
                h = d | d << 8 | d << 16 | d << 24;
                if (g) {
                    g = b + 4 - g | 0;
                    while ((b | 0) < (g | 0)) {
                        a[b >> 0] = d;
                        b = b + 1 | 0
                    }
                }
                while ((b | 0) < (f & ~3 | 0)) {
                    c[b >> 2] = h;
                    b = b + 4 | 0
                }
            }
            while ((b | 0) < (f | 0)) {
                a[b >> 0] = d;
                b = b + 1 | 0
            }
            return b - e | 0
        }

        function bd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            if ((c | 0) < 32) {
                C = b >>> c;
                return a >>> c | (b & (1 << c) - 1) << 32 - c
            }
            C = 0;
            return b >>> c - 32 | 0
        }

        function cd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            if ((c | 0) < 32) {
                C = b << c | (a & (1 << c) - 1 << 32 - c) >>> 32 - c;
                return a << c
            }
            C = a << c - 32;
            return 0
        }

        function dd(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            return (C = b + d + (a + c >>> 0 >>> 0 < a >>> 0 | 0) >>> 0, a + c >>> 0 | 0) | 0
        }

        function ed(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0;
            if ((e | 0) >= 4096) return ra(b | 0, d | 0, e | 0) | 0;
            f = b | 0;
            if ((b & 3) == (d & 3)) {
                while (b & 3) {
                    if (!e) return f | 0;
                    a[b >> 0] = a[d >> 0] | 0;
                    b = b + 1 | 0;
                    d = d + 1 | 0;
                    e = e - 1 | 0
                }
                while ((e | 0) >= 4) {
                    c[b >> 2] = c[d >> 2];
                    b = b + 4 | 0;
                    d = d + 4 | 0;
                    e = e - 4 | 0
                }
            }
            while ((e | 0) > 0) {
                a[b >> 0] = a[d >> 0] | 0;
                b = b + 1 | 0;
                d = d + 1 | 0;
                e = e - 1 | 0
            }
            return f | 0
        }

        function fd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            if ((c | 0) < 32) {
                C = b >> c;
                return a >>> c | (b & (1 << c) - 1) << 32 - c
            }
            C = (b | 0) < 0 ? -1 : 0;
            return b >> c - 32 | 0
        }

        function gd(b) {
            b = b | 0;
            var c = 0;
            c = a[m + (b & 255) >> 0] | 0;
            if ((c | 0) < 8) return c | 0;
            c = a[m + (b >> 8 & 255) >> 0] | 0;
            if ((c | 0) < 8) return c + 8 | 0;
            c = a[m + (b >> 16 & 255) >> 0] | 0;
            if ((c | 0) < 8) return c + 16 | 0;
            return (a[m + (b >>> 24) >> 0] | 0) + 24 | 0
        }

        function hd(a, b) {
            a = a | 0;
            b = b | 0;
            var c = 0,
                d = 0,
                e = 0;
            c = _(b & 65535, a & 65535) | 0;
            e = (c >>> 16) + (_(b & 65535, a >>> 16) | 0) | 0;
            d = _(b >>> 16, a & 65535) | 0;
            return (C = (e >>> 16) + (_(b >>> 16, a >>> 16) | 0) + (((e & 65535) + d | 0) >>> 16) | 0, e + d << 16 | c & 65535 | 0) | 0
        }

        function id(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            var e = 0,
                f = 0,
                g = 0,
                h = 0;
            g = b >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
            e = ((b | 0) < 0 ? -1 : 0) >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
            h = d >> 31 | ((d | 0) < 0 ? -1 : 0) << 1;
            f = ((d | 0) < 0 ? -1 : 0) >> 31 | ((d | 0) < 0 ? -1 : 0) << 1;
            a = $c(g ^ a, e ^ b, g, e) | 0;
            b = C;
            return $c((nd(a, b, $c(h ^ c, f ^ d, h, f) | 0, C, 0) | 0) ^ (h ^ g), C ^ (f ^ e), h ^ g, f ^ e) | 0
        }

        function jd(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
                g = 0,
                h = 0,
                j = 0,
                k = 0;
            f = i;
            i = i + 16 | 0;
            h = b >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
            g = ((b | 0) < 0 ? -1 : 0) >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
            k = e >> 31 | ((e | 0) < 0 ? -1 : 0) << 1;
            j = ((e | 0) < 0 ? -1 : 0) >> 31 | ((e | 0) < 0 ? -1 : 0) << 1;
            a = $c(h ^ a, g ^ b, h, g) | 0;
            b = C;
            nd(a, b, $c(k ^ d, j ^ e, k, j) | 0, C, f | 0) | 0;
            e = $c(c[f >> 2] ^ h, c[f + 4 >> 2] ^ g, h, g) | 0;
            d = C;
            i = f;
            return (C = d, e) | 0
        }

        function kd(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            var e = 0,
                f = 0;
            e = hd(a, c) | 0;
            f = C;
            return (C = (_(b, c) | 0) + (_(d, a) | 0) + f | f & 0, e | 0 | 0) | 0
        }

        function ld(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            return nd(a, b, c, d, 0) | 0
        }

        function md(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0;
            f = i;
            i = i + 16 | 0;
            nd(a, b, d, e, f | 0) | 0;
            i = f;
            return (C = c[f + 4 >> 2] | 0, c[f >> 2] | 0) | 0
        }

        function nd(a, b, d, e, f) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
                h = 0,
                i = 0,
                j = 0,
                k = 0,
                l = 0,
                m = 0,
                n = 0,
                o = 0,
                p = 0;
            if (!b)
                if (!e) {
                    if (f) {
                        c[f >> 2] = (a >>> 0) % (d >>> 0);
                        c[f + 4 >> 2] = 0
                    }
                    e = 0;
                    f = (a >>> 0) / (d >>> 0) >>> 0;
                    return (C = e, f) | 0
                } else {
                    if (!f) {
                        e = 0;
                        f = 0;
                        return (C = e, f) | 0
                    }
                    c[f >> 2] = a | 0;
                    c[f + 4 >> 2] = b & 0;
                    e = 0;
                    f = 0;
                    return (C = e, f) | 0
                }
            do
                if (d) {
                    if (e) {
                        h = (aa(e | 0) | 0) - (aa(b | 0) | 0) | 0;
                        if (h >>> 0 <= 31) {
                            n = h + 1 | 0;
                            i = a >>> ((h + 1 | 0) >>> 0) & h - 31 >> 31 | b << 31 - h;
                            m = b >>> ((h + 1 | 0) >>> 0) & h - 31 >> 31;
                            g = 0;
                            h = a << 31 - h;
                            break
                        }
                        if (!f) {
                            e = 0;
                            f = 0;
                            return (C = e, f) | 0
                        }
                        c[f >> 2] = a | 0;
                        c[f + 4 >> 2] = b | b & 0;
                        e = 0;
                        f = 0;
                        return (C = e, f) | 0
                    }
                    if (d - 1 & d) {
                        h = (aa(d | 0) | 0) + 33 - (aa(b | 0) | 0) | 0;
                        n = h;
                        i = 32 - h - 1 >> 31 & b >>> ((h - 32 | 0) >>> 0) | (b << 32 - h | a >>> (h >>> 0)) & h - 32 >> 31;
                        m = h - 32 >> 31 & b >>> (h >>> 0);
                        g = a << 64 - h & 32 - h >> 31;
                        h = (b << 64 - h | a >>> ((h - 32 | 0) >>> 0)) & 32 - h >> 31 | a << 32 - h & h - 33 >> 31;
                        break
                    }
                    if (f) {
                        c[f >> 2] = d - 1 & a;
                        c[f + 4 >> 2] = 0
                    }
                    if ((d | 0) == 1) {
                        e = b | b & 0;
                        f = a | 0 | 0;
                        return (C = e, f) | 0
                    } else {
                        f = gd(d | 0) | 0;
                        e = b >>> (f >>> 0) | 0;
                        f = b << 32 - f | a >>> (f >>> 0) | 0;
                        return (C = e, f) | 0
                    }
                } else {
                    if (!e) {
                        if (f) {
                            c[f >> 2] = (b >>> 0) % (d >>> 0);
                            c[f + 4 >> 2] = 0
                        }
                        e = 0;
                        f = (b >>> 0) / (d >>> 0) >>> 0;
                        return (C = e, f) | 0
                    }
                    if (!a) {
                        if (f) {
                            c[f >> 2] = 0;
                            c[f + 4 >> 2] = (b >>> 0) % (e >>> 0)
                        }
                        d = 0;
                        f = (b >>> 0) / (e >>> 0) >>> 0;
                        return (C = d, f) | 0
                    }
                    if (!(e - 1 & e)) {
                        if (f) {
                            c[f >> 2] = a | 0;
                            c[f + 4 >> 2] = e - 1 & b | b & 0
                        }
                        d = 0;
                        f = b >>> ((gd(e | 0) | 0) >>> 0);
                        return (C = d, f) | 0
                    }
                    h = (aa(e | 0) | 0) - (aa(b | 0) | 0) | 0;
                    if (h >>> 0 <= 30) {
                        n = h + 1 | 0;
                        i = b << 31 - h | a >>> ((h + 1 | 0) >>> 0);
                        m = b >>> ((h + 1 | 0) >>> 0);
                        g = 0;
                        h = a << 31 - h;
                        break
                    }
                    if (!f) {
                        e = 0;
                        f = 0;
                        return (C = e, f) | 0
                    }
                    c[f >> 2] = a | 0;
                    c[f + 4 >> 2] = b | b & 0;
                    e = 0;
                    f = 0;
                    return (C = e, f) | 0
                }
            while (0);
            if (!n) {
                j = h;
                b = m;
                a = 0;
                h = 0
            } else {
                k = dd(d | 0 | 0, e | e & 0 | 0, -1, -1) | 0;
                l = C;
                j = h;
                b = m;
                a = n;
                h = 0;
                do {
                    p = j;
                    j = g >>> 31 | j << 1;
                    g = h | g << 1;
                    p = i << 1 | p >>> 31 | 0;
                    o = i >>> 31 | b << 1 | 0;
                    $c(k, l, p, o) | 0;
                    n = C;
                    m = n >> 31 | ((n | 0) < 0 ? -1 : 0) << 1;
                    h = m & 1;
                    i = $c(p, o, m & (d | 0), (((n | 0) < 0 ? -1 : 0) >> 31 | ((n | 0) < 0 ? -1 : 0) << 1) & (e | e & 0)) | 0;
                    b = C;
                    a = a - 1 | 0
                } while ((a | 0) != 0);
                a = 0
            }
            if (f) {
                c[f >> 2] = i;
                c[f + 4 >> 2] = b
            }
            o = (g | 0) >>> 31 | j << 1 | (0 << 1 | g >>> 31) & 0 | a;
            p = (g << 1 | 0 >>> 31) & -2 | h;
            return (C = o, p) | 0
        }

        function od(a) {
            a = a | 0;
            return Ia[a & 31]() | 0
        }

        function pd() {
            return ea(0) | 0
        }

        function qd() {
            return ea(1) | 0
        }

        function rd() {
            return ea(2) | 0
        }

        function sd() {
            return ea(3) | 0
        }

        function td() {
            return ea(4) | 0
        }

        function ud() {
            return ea(5) | 0
        }

        function vd() {
            return ea(6) | 0
        }

        function wd() {
            return ea(7) | 0
        }

        function xd(a, b) {
            a = a | 0;
            b = b | 0;
            return Ja[a & 31](b | 0) | 0
        }

        function yd(a) {
            a = a | 0;
            return ga(0, a | 0) | 0
        }

        function zd(a) {
            a = a | 0;
            return ga(1, a | 0) | 0
        }

        function Ad(a) {
            a = a | 0;
            return ga(2, a | 0) | 0
        }

        function Bd(a) {
            a = a | 0;
            return ga(3, a | 0) | 0
        }

        function Cd(a) {
            a = a | 0;
            return ga(4, a | 0) | 0
        }

        function Dd(a) {
            a = a | 0;
            return ga(5, a | 0) | 0
        }

        function Ed(a) {
            a = a | 0;
            return ga(6, a | 0) | 0
        }

        function Fd(a) {
            a = a | 0;
            return ga(7, a | 0) | 0
        }

        function Gd(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            return Ka[a & 31](b | 0, c | 0, d | 0) | 0
        }

        function Hd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(0, a | 0, b | 0, c | 0) | 0
        }

        function Id(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(1, a | 0, b | 0, c | 0) | 0
        }

        function Jd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(2, a | 0, b | 0, c | 0) | 0
        }

        function Kd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(3, a | 0, b | 0, c | 0) | 0
        }

        function Ld(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(4, a | 0, b | 0, c | 0) | 0
        }

        function Md(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(5, a | 0, b | 0, c | 0) | 0
        }

        function Nd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(6, a | 0, b | 0, c | 0) | 0
        }

        function Od(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return ia(7, a | 0, b | 0, c | 0) | 0
        }

        function Pd(a, b) {
            a = a | 0;
            b = b | 0;
            La[a & 31](b | 0)
        }

        function Qd(a) {
            a = a | 0;
            ka(0, a | 0)
        }

        function Rd(a) {
            a = a | 0;
            ka(1, a | 0)
        }

        function Sd(a) {
            a = a | 0;
            ka(2, a | 0)
        }

        function Td(a) {
            a = a | 0;
            ka(3, a | 0)
        }

        function Ud(a) {
            a = a | 0;
            ka(4, a | 0)
        }

        function Vd(a) {
            a = a | 0;
            ka(5, a | 0)
        }

        function Wd(a) {
            a = a | 0;
            ka(6, a | 0)
        }

        function Xd(a) {
            a = a | 0;
            ka(7, a | 0)
        }

        function Yd() {
            ba(0);
            return 0
        }

        function Zd(a) {
            a = a | 0;
            ba(1);
            return 0
        }

        function _d(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            ba(2);
            return 0
        }

        function $d(a) {
            a = a | 0;
            ba(3)
        }

        // EMSCRIPTEN_END_FUNCS
        var Ia = [Yd, pd, qd, rd, sd, td, ud, vd, wd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Ob, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd, Yd];
        var Ja = [Zd, yd, zd, Ad, Bd, Cd, Dd, Ed, Fd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Ec, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd, Zd];
        var Ka = [_d, Hd, Id, Jd, Kd, Ld, Md, Nd, Od, _d, _d, _d, _d, _d, _d, _d, _d, _d, Gc, Fc, Hc, _d, _d, _d, _d, _d, _d, _d, _d, _d, _d, _d];
        var La = [$d, Qd, Rd, Sd, Td, Ud, Vd, Wd, Xd, $d, $d, $d, $d, $d, $d, $d, $d, $d, Sc, $d, $d, $d, $d, $d, $d, $d, $d, $d, $d, $d, $d, $d];
        return {
            _mceliecejs_init: ic,
            _mceliecejs_encrypt: oc,
            _free: Yc,
            _mceliecejs_private_key_bytes: kc,
            _mceliecejs_decrypted_bytes: mc,
            _i64Add: dd,
            _mceliecejs_keypair: nc,
            _i64Subtract: $c,
            _memset: ad,
            _malloc: Xc,
            _mceliecejs_public_key_bytes: jc,
            _memcpy: ed,
            _bitshift64Lshr: bd,
            _mceliecejs_encrypted_bytes: lc,
            _mceliecejs_decrypt: pc,
            _bitshift64Shl: cd,
            runPostSets: _c,
            stackAlloc: Ma,
            stackSave: Na,
            stackRestore: Oa,
            establishStackSpace: Pa,
            setThrew: Qa,
            setTempRet0: Ta,
            getTempRet0: Ua,
            dynCall_i: od,
            dynCall_ii: xd,
            dynCall_iiii: Gd,
            dynCall_vi: Pd
        }
    })

    // EMSCRIPTEN_END_ASM
    (Module.asmGlobalArg, Module.asmLibraryArg, buffer);
    var _mceliecejs_init = Module["_mceliecejs_init"] = asm["_mceliecejs_init"];
    var _mceliecejs_encrypt = Module["_mceliecejs_encrypt"] = asm["_mceliecejs_encrypt"];
    var _free = Module["_free"] = asm["_free"];
    var runPostSets = Module["runPostSets"] = asm["runPostSets"];
    var _mceliecejs_private_key_bytes = Module["_mceliecejs_private_key_bytes"] = asm["_mceliecejs_private_key_bytes"];
    var _mceliecejs_public_key_bytes = Module["_mceliecejs_public_key_bytes"] = asm["_mceliecejs_public_key_bytes"];
    var _i64Add = Module["_i64Add"] = asm["_i64Add"];
    var _mceliecejs_keypair = Module["_mceliecejs_keypair"] = asm["_mceliecejs_keypair"];
    var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
    var _memset = Module["_memset"] = asm["_memset"];
    var _malloc = Module["_malloc"] = asm["_malloc"];
    var _mceliecejs_decrypted_bytes = Module["_mceliecejs_decrypted_bytes"] = asm["_mceliecejs_decrypted_bytes"];
    var _memcpy = Module["_memcpy"] = asm["_memcpy"];
    var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
    var _mceliecejs_encrypted_bytes = Module["_mceliecejs_encrypted_bytes"] = asm["_mceliecejs_encrypted_bytes"];
    var _mceliecejs_decrypt = Module["_mceliecejs_decrypt"] = asm["_mceliecejs_decrypt"];
    var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
    var dynCall_i = Module["dynCall_i"] = asm["dynCall_i"];
    var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
    var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
    var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
    Runtime.stackAlloc = asm["stackAlloc"];
    Runtime.stackSave = asm["stackSave"];
    Runtime.stackRestore = asm["stackRestore"];
    Runtime.establishStackSpace = asm["establishStackSpace"];
    Runtime.setTempRet0 = asm["setTempRet0"];
    Runtime.getTempRet0 = asm["getTempRet0"];

    function ExitStatus(status) {
        this.name = "ExitStatus";
        this.message = "Program terminated with exit(" + status + ")";
        this.status = status
    }
    ExitStatus.prototype = new Error;
    ExitStatus.prototype.constructor = ExitStatus;
    var initialStackTop;
    var preloadStartTime = null;
    var calledMain = false;
    dependenciesFulfilled = function runCaller() {
        if (!Module["calledRun"]) run();
        if (!Module["calledRun"]) dependenciesFulfilled = runCaller
    };
    Module["callMain"] = Module.callMain = function callMain(args) {
        assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
        assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
        args = args || [];
        ensureInitRuntime();
        var argc = args.length + 1;

        function pad() {
            for (var i = 0; i < 4 - 1; i++) {
                argv.push(0)
            }
        }
        var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
        pad();
        for (var i = 0; i < argc - 1; i = i + 1) {
            argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
            pad()
        }
        argv.push(0);
        argv = allocate(argv, "i32", ALLOC_NORMAL);
        try {
            var ret = Module["_main"](argc, argv, 0);
            exit(ret, true)
        } catch (e) {
            if (e instanceof ExitStatus) {
                return
            } else if (e == "SimulateInfiniteLoop") {
                Module["noExitRuntime"] = true;
                return
            } else {
                if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [e, e.stack]);
                throw e
            }
        } finally {
            calledMain = true
        }
    };

    function run(args) {
        args = args || Module["arguments"];
        if (preloadStartTime === null) preloadStartTime = Date.now();
        if (runDependencies > 0) {
            return
        }
        preRun();
        if (runDependencies > 0) return;
        if (Module["calledRun"]) return;

        function doRun() {
            if (Module["calledRun"]) return;
            Module["calledRun"] = true;
            if (ABORT) return;
            ensureInitRuntime();
            preMain();
            if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
            if (Module["_main"] && shouldRunNow) Module["callMain"](args);
            postRun()
        }
        if (Module["setStatus"]) {
            Module["setStatus"]("Running...");
            setTimeout((function() {
                setTimeout((function() {
                    Module["setStatus"]("")
                }), 1);
                doRun()
            }), 1)
        } else {
            doRun()
        }
    }
    Module["run"] = Module.run = run;

    function exit(status, implicit) {
        if (implicit && Module["noExitRuntime"]) {
            return
        }
        if (Module["noExitRuntime"]) {} else {
            ABORT = true;
            EXITSTATUS = status;
            STACKTOP = initialStackTop;
            exitRuntime();
            if (Module["onExit"]) Module["onExit"](status)
        }
        if (ENVIRONMENT_IS_NODE) {
            process["stdout"]["once"]("drain", (function() {
                process["exit"](status)
            }));
            console.log(" ");
            setTimeout((function() {
                process["exit"](status)
            }), 500)
        } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
            quit(status)
        }
        throw new ExitStatus(status)
    }
    Module["exit"] = Module.exit = exit;
    var abortDecorators = [];

    function abort(what) {
        if (what !== undefined) {
            Module.print(what);
            Module.printErr(what);
            what = JSON.stringify(what)
        } else {
            what = ""
        }
        ABORT = true;
        EXITSTATUS = 1;
        var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
        var output = "abort(" + what + ") at " + stackTrace() + extra;
        if (abortDecorators) {
            abortDecorators.forEach((function(decorator) {
                output = decorator(output, what)
            }))
        }
        throw output
    }
    Module["abort"] = Module.abort = abort;
    if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
            Module["preInit"].pop()()
        }
    }
    var shouldRunNow = true;
    if (Module["noInitialRun"]) {
        shouldRunNow = false
    }
    run();

    function dataResult(buffer, bytes) {
        return new Uint8Array(new Uint8Array(Module.HEAPU8.buffer, buffer, bytes))
    }

    function dataFree(buffer) {
        try {
            Module._free(buffer)
        } catch (_) {}
    }
    Module._mceliecejs_init();
    var mceliece = {
        publicKeyLength: Module._mceliecejs_public_key_bytes(),
        privateKeyLength: Module._mceliecejs_private_key_bytes(),
        encryptedDataLength: Module._mceliecejs_encrypted_bytes(),
        decryptedDataLength: Module._mceliecejs_decrypted_bytes(),
        keyPair: (function() {
            var publicKeyBuffer = Module._malloc(mceliece.publicKeyLength);
            var privateKeyBuffer = Module._malloc(mceliece.privateKeyLength);
            try {
                Module._mceliecejs_keypair(publicKeyBuffer, privateKeyBuffer);
                return {
                    publicKey: dataResult(publicKeyBuffer, mceliece.publicKeyLength),
                    privateKey: dataResult(privateKeyBuffer, mceliece.privateKeyLength)
                }
            } finally {
                dataFree(publicKeyBuffer);
                dataFree(privateKeyBuffer)
            }
        }),
        encrypt: (function(message, publicKey) {
            var messageBuffer = Module._malloc(message.length + 4);
            var publicKeyBuffer = Module._malloc(mceliece.publicKeyLength);
            var encryptedBuffer = Module._malloc(mceliece.encryptedDataLength);
            Module.writeArrayToMemory(message, messageBuffer + 4);
            Module.writeArrayToMemory(publicKey, publicKeyBuffer);
            Module.writeArrayToMemory(new Uint8Array((new Uint32Array([message.length])).buffer), messageBuffer);
            try {
                Module._mceliecejs_encrypt(messageBuffer, publicKeyBuffer, encryptedBuffer);
                return dataResult(encryptedBuffer, mceliece.encryptedDataLength)
            } finally {
                dataFree(messageBuffer);
                dataFree(publicKeyBuffer);
                dataFree(encryptedBuffer)
            }
        }),
        decrypt: (function(encrypted, privateKey) {
            var encryptedBuffer = Module._malloc(mceliece.encryptedDataLength);
            var privateKeyBuffer = Module._malloc(mceliece.privateKeyLength);
            var decryptedBuffer = Module._malloc(mceliece.decryptedDataLength);
            Module.writeArrayToMemory(encrypted, encryptedBuffer);
            Module.writeArrayToMemory(privateKey, privateKeyBuffer);
            try {
                Module._mceliecejs_decrypt(encryptedBuffer, privateKeyBuffer, decryptedBuffer);
                return dataResult(decryptedBuffer + 4, (new Uint32Array(Module.HEAPU8.buffer, decryptedBuffer, 1))[0])
            } finally {
                dataFree(encryptedBuffer);
                dataFree(privateKeyBuffer);
                dataFree(decryptedBuffer)
            }
        }),
        stringToUTF8Array: (function (str) {
            var utf8 = [];
            for (var i=0; i < str.length; i++) {
                var charcode = str.charCodeAt(i);
                if (charcode < 0x80) utf8.push(charcode);
                else if (charcode < 0x800) {
                    utf8.push(0xc0 | (charcode >> 6), 
                              0x80 | (charcode & 0x3f));
                }
                else if (charcode < 0xd800 || charcode >= 0xe000) {
                    utf8.push(0xe0 | (charcode >> 12), 
                              0x80 | ((charcode>>6) & 0x3f), 
                              0x80 | (charcode & 0x3f));
                }
                // surrogate pair
                else {
                    i++;
                    // UTF-16 encodes 0x10000-0x10FFFF by
                    // subtracting 0x10000 and splitting the
                    // 20 bits of 0x0-0xFFFFF into two halves
                    charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                              | (str.charCodeAt(i) & 0x3ff));
                    utf8.push(0xf0 | (charcode >>18), 
                              0x80 | ((charcode>>12) & 0x3f), 
                              0x80 | ((charcode>>6) & 0x3f), 
                              0x80 | (charcode & 0x3f));
                }
            }
            return utf8;
        }),
        UTF8ArraytoString: (function (array) {
            var out, i, len, c;
            var char2, char3;

            out = "";
            len = array.length;
            i = 0;
            while(i < len) {
            c = array[i++];
            switch(c >> 4)
            { 
              case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
              case 12: case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
              case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                               ((char2 & 0x3F) << 6) |
                               ((char3 & 0x3F) << 0));
                break;
            }
            }

            return out;
        })
    };
    return mceliece
})();
module.exports = mceliece;