cmake_minimum_required(VERSION 4.00)
project(q-lite)

set(CMAKE_CXX_STANDARD 20 REQUIRED)


add_subdirectory(src)

include(CTest)

if (BUILD_TESTING)
	message(STATUS "Doing Tests")

	include(FetchContent)
	FetchContent_Declare(
	  googletest
	  GIT_REPOSITORY https://github.com/google/googletest.git
	  GIT_TAG main
	)

	FetchContent_MakeAvailable(googletest)

	add_subdirectory(tests)
endif()

