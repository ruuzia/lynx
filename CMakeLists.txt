cmake_minimum_required(VERSION 3.10)
project(M1OEP_rzia)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "-Wall -Wextra -pedantic -Werror")

include_directories(src/)
add_executable(Lynx
    src/Lynx.cpp
    src/Line.cpp
    src/main.cpp
    src/SaveData.cpp
)
