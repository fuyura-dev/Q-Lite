

add_executable(BFS BFS.cpp)
add_executable(Engine Engine.cpp)

set_target_properties(BFS Engine PROPERTIES FOLDER "Tests")
target_link_libraries(BFS PRIVATE q-liteengine GTest::gtest_main)
target_link_libraries(Engine PRIVATE q-liteengine GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(BFS)
gtest_discover_tests(Engine)