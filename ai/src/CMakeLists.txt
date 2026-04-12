add_library(q-liteengine STATIC ${src})

target_sources(q-liteengine
	PRIVATE
		BFS.cpp
		Engine.cpp
		Position.cpp

	PUBLIC
	FILE_SET HEADERS
	FILES
		BFS.h
		Engine.h
		Position.h
		Quoridor.h
)

if (EMSCRIPTEN)
	set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../src/wasm")
	add_executable(wasmbuild 
		Bindings.cpp
	)

	target_link_libraries(wasmbuild q-liteengine embind)
	target_link_options(wasmbuild
		PUBLIC
			"-sMODULARIZE"
			"-sEXPORT_NAME=qlite"
			"-sSINGLE_FILE"
			"-sEXPORT_ES6"
	)

	include_directories(wasmbuild PUBLIC "${CMAKE_SOURCE_DIR}/emsdk/upstream/emscripten/system/include")
endif()