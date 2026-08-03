# 原生仿真

域名：`native-emulator`

进程内、零外部依赖的自研 ARM64 解释器，用于仿真执行 Android `.so`：加载共享库、注册模拟 Java 方法、调用导出函数或 `Java_*` JNI 入口，以还原签名/加密算法。无需真机、JVM 或 Frida。会话隔离且显式管理（create→…→destroy），空闲自动过期防泄漏。libapp.so（Flutter Dart AOT）不在此执行，应交给 Dart 层。

## Profile

- workflow
- full

## 典型场景

- native/JNI 签名与加密算法还原
- 从 APK 抽取并加载 arm64-v8a .so
- 逐指令跟踪混淆 native 函数
- 模拟 Java 世界回调（声明式常量）

## 常见组合

- native-emulator + binary-instrument
- native-emulator + dart-inspector

## 工具清单（50）

| 工具 | 说明 |
| --- | --- |
| `nemu_capabilities` | 查看 native 仿真器后端可用性与支持的特性（自研 ARM64 解释器，无外部依赖）。 |
| `nemu_create_session` | 创建一个隔离的 ARM64 仿真器会话并返回 sessionId。每个会话独占自己的 CPU 寄存器、栈和 JNI 对象表，并发分析互不干扰。用完用 nemu_destroy_session 销毁，空闲会话会自动过期。 |
| `nemu_destroy_session` | 销毁一个仿真器会话并释放其内存（已映射的库、栈、JNI 表）。 |
| `nemu_list_sessions` | 列出活动的仿真器会话及其创建和最近使用时间。 |
| `nemu_session_info` | 在不执行 native 代码的情况下检查一个仿真器会话，返回时间戳、导出符号、未解析导入、构造器故障和活动会话数。 |
| `nemu_load_library` | 从文件路径将一个 AArch64 ELF 共享库（.so）加载进会话，映射段并解析导出符号。是 list_symbols / call_symbol / call_jni_export 的前置步骤。 |
| `nemu_load_library_chain` | 加载依赖库链并解析跨库导入符号。先传入依赖库路径数组 dependencyPaths（按序加载），再传入主库路径 primaryPath。各依赖库的导出符号对主库及后续依赖可见。适用于 FFmpeg 风格的多库加载场景，如 libijkplayer.so 调用 libijkffmpeg.so 和 libijksdl.so 的导出函数。 |
| `nemu_inspect_imports` | 在仿真前检查 AArch64 ELF .so 的动态导入重定位信息，列出导入符号、GOT 偏移，并标注每个导入在内置 bionic 桩中是否有支持。无需手写 readelf/Capstone 脚本即可诊断 PLT/GOT NULL 间接调用失败。 |
| `nemu_dump_got` | 待补充中文：Dump the PLT trampoline → GOT → symbol mapping for an AArch64 ELF shared object. Scans .text for the 4-instruction trampoline pattern (adrp x16 → ldr x17 → add x17,x16,x17 → br x17) used by obfuscated SO files and cross-references each slot against dynamic relocations to resolve the callee name. Use this when you need to know what "bl 0xACD0" actually calls without manual readelf + Python scripting. |
| `nemu_extract_apk_libs` | 列出 APK 中可加载的 arm64-v8a native 库（.so）及其字节大小。libapp.so（Flutter Dart AOT）会被列出但无法在此执行，应交给 Dart 层。 |
| `nemu_load_apk_library` | 按名称从 APK 中抽取指定的 arm64-v8a .so 并一步加载进会话（无临时文件）。配合 nemu_extract_apk_libs 发现库名。 |
| `nemu_list_symbols` | 列出已加载库的导出函数符号——即可被 call_symbol / call_jni_export 调用的名字。 |
| `nemu_call_symbol` | 按 AArch64 AAPCS 调用约定调用一个导出函数（参数放 x0..x7，结果在 x0）。用于普通 native 导出；`Java_*` JNI 入口请用 call_jni_export。 |
| `nemu_call_jni_export` | 调用一个导出的 `Java_*` JNI 函数。自动注入 `JNIEnv*` 与 thiz，再传入 Java 参数。返回 x0——直接是 int/jboolean，或是 jobject/jbyteArray/jstring 句柄（用 read_byte_array 解析）。逆向 native 签名/加密例程的主入口。 |
| `nemu_call_address` | 待补充中文：Call a function at an arbitrary guest address (e.g. a native method registered via RegisterNatives). Uses AArch64 AAPCS with args in x0..x7; returns x0. Set injectJni=true to prepend guest JNIEnv* as x0 + thiz=0 as x1 (standard JNI method convention). |
| `nemu_setup_java_mock` | 注册一个模拟 Java 方法，供被仿真的 native 代码经 JNI 回调（GetMethodID/GetStaticMethodID + `Call*Method`）。用 returnInt、returnString 或 returnBytes（base64）声明式指定返回值——模拟 native 例程计算前读取的「Java 世界」。不执行任何代码，仅返回配置的常量。 |
| `nemu_setup_java_field` | 注册一个模拟 Java 字段，供被仿真的 native 代码经 JNI 回读（GetFieldID/GetStaticFieldID + `Get&lt;Type&gt;Field`）。用 valueInt、valueString 或 valueBytes（base64）声明式指定字段值——即 native 例程会折叠进结果的「Java 世界」常量。不执行任何代码。 |
| `nemu_setup_java_mocks` | 待补充中文：Batch-register multiple Java method mocks in one call. Each entry in the array has the same fields as nemu_setup_java_mock: className, methodName, signature, plus one return value (returnInt, returnString, returnBytes, returnObject, returnArray, or returnMap). Use this to define the full mock chain without rebuilding jshook. |
| `nemu_new_byte_array` | 将 base64 字节包装成 JNI jbyteArray 句柄，作为参数传入 call_jni_export（如签名例程要处理的明文）。返回该句柄。 |
| `nemu_read_byte_array` | 将 jbyteArray 句柄（如 native 调用的返回值）解析回字节，以 base64 加长度返回。 |
| `nemu_create_jni_handle` | 待补充中文：Create a mock JNI object handle pre-populated with controlled data. Use BEFORE calling JNI functions to seed the handle table so that GetStringUTFChars / GetObjectArrayElement / GetIntField return expected values. Returns the handle id to pass as an argument to nemu_call_address or nemu_call_symbol. |
| `nemu_trace` | 调用一个导出符号，同时记录执行的每条指令（pc、操作码、步号），可选按步快照指定寄存器。受 maxSteps 限制。用于跟踪混淆 native 函数的控制流/算法。 |
| `nemu_set_pac_key` | 待补充中文：Configure the ARMv8.3 Pointer Authentication key set used by PACIA/PACIB/AUTIA/AUTIB instructions in this emulator session. Set a 128-bit key (32 hex chars) by key slot (ia/ib/da/db) to match keys dumped from a real device via Frida, so AUTIA can verify and strip real-hardware PAC signatures. |
| `nemu_disassemble` | 无需创建仿真器会话即可反汇编单条指令。支持 arm64/aarch64、x86、x64、riscv32/riscv64、mips/mips32 与 mipsel；用于提升 trace 可读性的本地轻量解码器，覆盖常见 SSE/AVX/AVX2/AVX-512 EVEX、RISC-V 和 MIPS 指令。 |
| `nemu_alloc_memory` | 分配原始客户机内存（不是 JNI 句柄——是真正的 char* 地址）。可选通过 fillBytes（base64）填入初始数据。返回客户机地址，可作为整数参数传入 call_symbol。在会话开始时为原生解密/签名例程布置加密数据块，然后用 nemu_read_memory 读取输出。 |
| `nemu_read_memory` | 从客户机内存的指定地址读取原始字节。默认返回有界预览；设置 includeDataBase64=true 可在配置上限内返回完整 base64。用于在原生例程写入输出缓冲区后取回结果。 |
| `nemu_write_memory` | 通过 base64 数据向客户机内存的指定地址写入原始字节。用于在 call_symbol 调用之间更新输入缓冲区而无需重新分配，或就地修补代码/数据。 |
| `nemu_write_regions` | 待补充中文：Write multiple memory regions in a single call. Accepts an array of {address, dataBase64} objects. Essential for atomic code patching: apply all patches in one call to avoid intermediate corrupt states. |
| `nemu_prepare_tls` | 待补充中文：Map the TPIDR_EL0 (thread-pointer) TLS block so its memory is accessible for pre-population via nemu_write_regions. Returns the TLS base address. Use this before writing data to TLS offsets (e.g. frame-table pointer at +0x1768) that native code reads via mrs xN, tpidr_el0; ldr xM, [xN, #large_offset]. |
| `nemu_session_load` | 待补充中文：Load a JSON-serialised array of tool calls and execute them sequentially to set up a session. Each entry is {tool, args}. Supported tools: alloc_memory, write_regions, call_address, call_symbol, prepare_tls, setup_java_mocks, map_memory, bind_host_fn. Use this to replay a debug session from a saved JSON plan without repeating ~20 manual MCP calls. |
| `nemu_bind_host_fn` | 待补充中文：Register a JavaScript host function at a specific guest address, overriding any existing stub. The function receives guest registers (ctx.x(0)..x(7)), can read/write guest memory (ctx.read/ctx.write), and returns a BigInt value placed in x0. Use to mock custom shell imports at their resolved GOT addresses. |
| `nemu_bind_all_imports` | 待补充中文：Batch-bind host functions to ALL resolved import stubs in the GOT. Reads the GOT table (0x74000 range), finds every unique resolved address, and binds the given JS function body to each. Call after load_library to mock every unresolved shell import at once. |
| `nemu_mem_shadow` | 待补充中文：Add a shadow memory overlay at a specific address. Reads from shadow take priority over underlying memory — use to provide mock data at addresses that would otherwise crash (e.g. address 0 where SO ELF header resides). Does NOT modify the underlying SO mapping. |
| `nemu_create_vtable` | 待补充中文：Create a C++ vtable-backed object in guest memory. Allocates a vtable with `numSlots` entries (each pointing to a return-0 host stub) and an object that points to it. Use when native code does direct vtable dispatch (BLR X8 through [obj+offset]) — common in obfuscated SO files calling virtual methods on C++ objects. Returns {objectAddr, vtableAddr} for use with nemu_call_address/nemu_call_symbol. |
| `nemu_set_vtable_slot` | 待补充中文：Override a specific vtable slot with a custom host function. The slot at vtableAddr + slotIndex*8 is rewritten to point to a stub executing `fnBody` (JS, with ctx.x/ctx.writeU64/ctx.persistReg etc.). Use to mock specific C++ virtual methods after creating a vtable with nemu_create_vtable. |
| `nemu_set_registers` | 待补充中文：Set arbitrary CPU registers by index. Pass an object mapping register number to value (e.g. {0: 0x60000000, 10: 0, 11: 0x55150}). Supports x0-x30 and floating-point d0-d31. Use to fix up loop variables or inject context pointers before/after host function calls. |
| `nemu_jni_diag` | 待补充中文：Read the JNI diagnostic log for a session. Tracks every JNI function call (FindClass, GetMethodID, CallIntMethod, etc.) and unimplemented stub invocations. Use after nemu_call_symbol or nemu_trace to see what Java methods the native code tried to call. Actions: "read" (default) reads and clears the log; "snapshot" reads without clearing; "clear" clears without returning. |
| `nemu_jni_handles` | 待补充中文：List all JNI object handles allocated in a session, with their kind and summary. Handles are opaque IDs (jclass, jstring, jbyteArray, jobject) that native code passes around. Use to verify mock setups and debug handle leaks. Optionally filter by kind (e.g. "class", "string", "bytes", "method", "field", "auto-object", "mock-int", "mock-string", "mock-boolean", "objarray") or by specific handle number. |
| `nemu_vm_state_dump` | 待补充中文：Dump LiteVM state from guest memory at specified base addresses. Reads ctx (32×64-bit), table (32×64-bit), and optional output buffer. Returns structured hex values suitable for comparison with Python LiteVM dumps. Use after nemu_call_symbol to inspect native VM execution results. |
| `nemu_vm_state_load` | 待补充中文：Load VM state into guest memory. Takes ctx values and table values as hex strings and writes them at the specified base addresses. Use to bridge Python LiteVM state into native VM: run Python vm.run(), dump ctx/table as hex, then load into nemu guest memory before calling bb2i34u32clsb. |
| `nemu_vm_state_compare` | 待补充中文：Compare native VM state (read from guest memory) against an expected state (e.g. Python LiteVM dump). For each of ctx, table, and output, reports whether they match and lists the first mismatches. Use to cross-validate native VM execution against the known-good Python implementation. |
| `nemu_mem_map` | 待补充中文：Map a memory region in guest address space. Use to extend the mapped area for output buffers or scratch data that would otherwise cause unmapped-memory faults. Idempotent — safe to call on already-mapped regions. |
| `nemu_bytecode_decode` | 待补充中文：Decode a u32 LiteVM bytecode word into its opcode fields: group (G0-G7), sub-opcode, a1 register index, fl field index, imm signed offset, and validity. Matches the Python LiteVM Opcode.is_valid_opcode() semantics. No session needed — pure computation. Use to understand what a native bytecode word means without external scripts. |
| `nemu_bytecode_scan` | 待补充中文：Scan a guest memory region and decode all valid LiteVM bytecode words. Reads `count` u32 words starting at `address`, decodes each one, and returns only the valid opcodes with their offsets. Much faster than manual decode+filter — one call to survey an entire bytecode table. |
| `nemu_pointer_chain` | 待补充中文：Walk a chain of pointers in guest memory. Starting from `base`, reads a u64 pointer, then follows it to the next address, repeating up to `maxDepth` times. At each hop, shows the address, the pointer value, and the first 32 bytes of data there. Essential for understanding CreateLitevm's x24 table indirection structure. |
| `nemu_data_dump` | 待补充中文：Read a guest memory region and format it as a structured table of u32 or u64 values. Each row shows offset, hex value, ASCII preview, and optional annotations. Auto-classifies each word as pointer, bytecode, ASCII, or raw data. Pointers are resolved to show target data when possible. |
| `nemu_dump_frame` | 待补充中文：Read and decode a CreateLitevm frame structure from guest memory. Parses the 256-byte frame fields: chain pointer, bytecode count, frame data, and sub-function flags. Essential for understanding the VM dispatch state at any point during execution. |
| `nemu_patch_apply` | 待补充中文：Apply multiple memory patches in a single call. Each patch is {address, dataBase64, writeProtect?}. Faster than repeated nemu_write_memory calls — essential for atomic code patches that must be applied together to avoid intermediate corrupt states. |
| `nemu_regs_save` | 待补充中文：Save a named snapshot of current GPR registers (x0-x30, sp). Returns a snapshot id usable with nemu_regs_restore. The snapshot persists until the session is destroyed or the name is overwritten. Use to preserve registers before calling an obfuscated function that corrupts callee-saved state. |
| `nemu_regs_restore` | 待补充中文：Restore GPR registers from a previously-saved snapshot (created by nemu_regs_save). Partially restores: only registers that were saved are written back. Use after an obfuscated function call to recover decode/context registers. |
