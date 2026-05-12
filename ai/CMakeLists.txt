cmake_minimum_required(VERSION 4.00)
project(q-lite)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(src)

include(FetchContent)

FetchContent_Declare(
	libcoro
	GIT_REPOSITORY git@github.com:jbaldwin/libcoro.git
	GIT_TAG main
	GIT_SUBMODULES ""
)

set(LIBCORO_FEATURE_NETWORKING OFF CACHE BOOL "" FORCE)
set(LIBCORO_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LIBCORO_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(libcoro)

include(CTest)

if (BUILD_TESTING)
	message(STATUS "Doing Tests")


	FetchContent_Declare(
	  googletest
	  GIT_REPOSITORY https://github.com/google/googletest.git
	  GIT_TAG main
	)

	FetchContent_MakeAvailable(googletest)

	add_subdirectory(tests)
endif()

