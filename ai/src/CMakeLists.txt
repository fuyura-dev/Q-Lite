add_library(q-liteengine STATIC ${src})

target_sources(q-liteengine
	PRIVATE
		Engine.cpp
		MoveGen.cpp
		Position.cpp
		Search.cpp
		TransTable.cpp
	PUBLIC
	FILE_SET HEADERS
	FILES
		BFS.h
		Engine.h
		MoveGen.h
		Position.h
		Quoridor.h
		Search.h
		TransTable.h
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