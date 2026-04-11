add_library(q-liteengine STATIC ${src})

target_sources(q-liteengine
	PRIVATE
		BFS.cpp
		Position.cpp

	PUBLIC
	FILE_SET HEADERS
	FILES
		BFS.h
		Position.h
		Quoridor.h
)