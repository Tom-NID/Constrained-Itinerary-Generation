# Version minimale requise de CMake
cmake_minimum_required(VERSION 3.10)

# Nom du projet
project(OSM_AStar_Project)

# Définir la version de C++ utilisée
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Ajouter les fichiers sources
set(SOURCES
    main.cpp
    osm_client.cpp
)

# Inclure les fichiers d'en-tête
include_directories(${CMAKE_SOURCE_DIR})

# Trouver la bibliothèque CURL
find_package(CURL REQUIRED)

# Ajouter l'exécutable
add_executable(server ${SOURCES})

# Lier la bibliothèque CURL à l'exécutable
target_link_libraries(server PRIVATE CURL::libcurl)
