

add_executable(BFS BFS.cpp)

target_link_libraries(BFS PRIVATE q-liteengine GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(BFS)