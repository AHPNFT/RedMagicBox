cmake_minimum_required(VERSION 3.4.1)
project(cryptocore)

add_library(cryptocore SHARED crypto-core.cpp)
target_compile_options(cryptocore PRIVATE -O2 -fvisibility=hidden -ffunction-sections -fdata-sections)
target_link_options(cryptocore PRIVATE -Wl,--gc-sections -Wl,--strip-all)
