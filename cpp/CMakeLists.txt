cmake_minimum_required(VERSION 3.16.4 FATAL_ERROR)

find_package(Clang)

if(DEFINED Clang_FOUND)
  set(CMAKE_C_COMPILER "/usr/bin/clang")
  set(CMAKE_CXX_COMPILER "/usr/bin/clang++")
endif(DEFINED Clang_FOUND)

set(CMAKE_EXPORT_COMPILE_COMMANDS)

# ================= DataMo ==================

project(DataMo VERSION 0.1.0 DESCRIPTION "Data Monitoring Library")

if(EXISTS ${PROJECT_SOURCE_DIR}/libtorch)
  message("${PROJECT_NAME}: Found local libtorch")
  set(TORCH_PREFIX_PATH ${PROJECT_SOURCE_DIR}/libtorch)
else()
  execute_process(COMMAND python3 -c "import torch;print(torch.utils.cmake_prefix_path)"
    COMMAND tr -d \\n
    OUTPUT_VARIABLE TORCH_PREFIX_PATH)
endif()

set(CMAKE_PREFIX_PATH ${CMAKE_PREFIX_PATH} ${TORCH_PREFIX_PATH})

set(CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS} ${TORCH_CXX_FLAGS})
include_directories(${TORCH_INCLUDE_DIRS})

find_package(Torch REQUIRED)

add_library(DataMo SHARED
  writer.cpp
)

set_target_properties(DataMo PROPERTIES VERSION ${PROJECT_VERSION})
set_target_properties(DataMo PROPERTIES PUBLIC_HEADER writer.hpp)
set_target_properties(DataMo PROPERTIES CXX_STANDARD 14)

target_link_libraries(DataMo ${TORCH_LIBRARIES})

install(TARGETS DataMo
  LIBRARY DESTINATION ./lib
  PUBLIC_HEADER DESTINATION ./include)

configure_file(DataMo.pc.in DataMo.pc @ONLY)
install(FILES ${CMAKE_BINARY_DIR}/DataMo.pc DESTINATION ${CMAKE_INSTALL_DATAROOTDIR}/pkgconfig)
