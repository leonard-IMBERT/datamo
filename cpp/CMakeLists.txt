cmake_minimum_required(VERSION 3.16.4 FATAL_ERROR)

set(CMAKE_C_COMPILER "/usr/bin/clang")
set(CMAKE_CXX_COMPILER "/usr/bin/clang++")

set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)

if(EXISTS ${PROJECT_SOURCE_DIR}/libtorch)
  message("${PROJECT_NAME}: Found local libtorch")
  set(TORCH_PREFIX_PATH ${PROJECT_SOURCE_DIR}/libtorch)
else()
  execute_process(COMMAND python3 -c "import torch;print(torch.utils.cmake_prefix_path)"
    COMMAND tr -d \\n
    OUTPUT_VARIABLE TORCH_PREFIX_PATH)
endif()



# ================= DataMo ==================

project(DataMo VERSION 0.1.1 DESCRIPTION "Data Monitoring Library")

add_library(DataMo STATIC
  writer.cpp
)


set(CMAKE_PREFIX_PATH ${CMAKE_PREFIX_PATH} ${TORCH_PREFIX_PATH})
set(CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS} ${TORCH_CXX_FLAGS})
find_package(Torch REQUIRED)

include_directories(${TORCH_INCLUDE_DIRS})

set_target_properties(DataMo PROPERTIES VERSION ${PROJECT_VERSION})
set_target_properties(DataMo PROPERTIES PUBLIC_HEADER writer.hpp)
set_target_properties(DataMo PROPERTIES CXX_STANDARD 14)

target_link_libraries(DataMo ${TORCH_LIBRARIES})

install(TARGETS DataMo
  LIBRARY DESTINATION ${DataMo_SOURCE_DIR}/lib
  PUBLIC_HEADER DESTINATION ${DataMo_SOURCE_DIR}/include)

configure_file(./DataMo.pc.in ./DataMo.pc @ONLY)
install(FILES ${CMAKE_BINARY_DIR}/DataMo.pc DESTINATION ${DataMo_SOURCE_DIR}/pkgconfig)

# =============== Test ===============
project(DataMoTest VERSION 0.1.1 DESCRIPTION "Testing DataMo")

add_executable(DataMoTest test/test.cpp)

set(CMAKE_PREFIX_PATH ${CMAKE_PREFIX_PATH} ${TORCH_PREFIX_PATH})
set(CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS} ${TORCH_CXX_FLAGS})
find_package(Torch REQUIRED)

include_directories(${TORCH_INCLUDE_DIRS})

set(DataMoTest_BINARY_DIR cpp/build)
set_target_properties(DataMoTest PROPERTIES VERSION ${PROJECT_VERSION})
set_target_properties(DataMoTest PROPERTIES CXX_STANDARD 14)

target_link_libraries(DataMoTest ${TORCH_LIBRARIES})
target_link_libraries(DataMoTest DataMo)
