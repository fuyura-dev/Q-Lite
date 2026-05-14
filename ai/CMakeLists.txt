cmake_minimum_required(VERSION 4.00)
project(q-lite)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(src)

include(FetchContent)

FetchContent_Declare(
        range
        GIT_REPOSITORY https://github.com/ericniebler/range-v3.git
        GIT_TAG master
        GIT_SUBMODULES ""
)

FetchContent_MakeAvailable(range)

FetchContent_Declare(
	libcoro
	GIT_REPOSITORY https://github.com/jbaldwin/libcoro.git
	GIT_TAG main
	GIT_SUBMODULES ""
)

set(LIBCORO_FEATURE_NETWORKING OFF)
set(LIBCORO_BUILD_TESTS OFF)
set(LIBCORO_BUILD_EXAMPLES OFF)

FetchContent_MakeAvailable(libcoro)


if (BUILD_TESTS)
	enable_testing()
	message(STATUS "Doing Tests")


	FetchContent_Declare(
	  googletest
	  GIT_REPOSITORY https://github.com/google/googletest.git
	  GIT_TAG main
	)

	FetchContent_MakeAvailable(googletest)

	add_subdirectory(tests)
endif()

