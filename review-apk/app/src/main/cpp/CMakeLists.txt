cmake_minimum_required(VERSION 3.22.1)
project(pocket_cri_audio LANGUAGES C CXX)

if(NOT DEFINED ENV{CRI_SDK_ROOT})
    message(FATAL_ERROR "CRI_SDK_ROOT is required; the private SDK must be downloaded by the Pocket build workflow.")
endif()

set(CRI_ROOT "$ENV{CRI_SDK_ROOT}")
if(CMAKE_ANDROID_ARCH_ABI STREQUAL "arm64-v8a")
    set(CRI_LIBRARY "${CRI_ROOT}/libs/arm64-v8a/libcri_ware_android_le.so")
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL "armeabi-v7a")
    set(CRI_LIBRARY "${CRI_ROOT}/libs/armeabi-v7a/libcri_ware_android_LE.so")
else()
    message(FATAL_ERROR "Unsupported Pocket ABI for CRI ADX LE: ${CMAKE_ANDROID_ARCH_ABI}")
endif()

if(NOT EXISTS "${CRI_LIBRARY}")
    message(FATAL_ERROR "CRI runtime library not found: ${CRI_LIBRARY}")
endif()

add_library(cri_ware_android SHARED IMPORTED)
set_target_properties(cri_ware_android PROPERTIES
    IMPORTED_LOCATION "${CRI_LIBRARY}"
    IMPORTED_NO_SONAME TRUE
)

add_library(pocket_cri_audio SHARED cri_audio_jni.cpp)
target_compile_features(pocket_cri_audio PRIVATE cxx_std_17)
target_include_directories(pocket_cri_audio PRIVATE "${CRI_ROOT}/include")

find_library(log-lib log)
find_library(android-lib android)
find_library(opensles-lib OpenSLES)

target_link_libraries(pocket_cri_audio PRIVATE
    cri_ware_android
    ${log-lib}
    ${android-lib}
    ${opensles-lib}
)
