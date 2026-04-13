

add_executable(BFS BFS.cpp)
add_executable(Engine Engine.cpp)

target_link_libraries(BFS PRIVATE q-liteengine GTest::gtest_main)
target_link_libraries(Engine PRIVATE q-liteengine GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(BFS)
gtest_discover_tests(Engine)