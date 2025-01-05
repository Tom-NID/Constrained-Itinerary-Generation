# Constrained Itinerary Generation Server

This project uses Crow, a C++ microframework, to set up and run a RESTful server. Follow these steps to initialize, build, and run the server.
Prerequisites

## Requirements
- C++ Compiler: GCC or Clang (with C++11 support or later).
- CMake: Version 3.10 or higher.
- Boost: Required for Crow.
    - Debian / Ubuntu : 
        ```
        sudo apt-get install libboost-all-dev
        sudo apt-get install libasio-dev
        ```
    - Arch
        ```
        sudo pacman -S boost
        sudo pacman -S asio
        ```
- Curl
  - Debian / Ubuntu 
      ```
      sudo apt-get install curl
      ```
  - Arch
    ```
    sudo pacman -S curl
    ```      
    
## Compiling from source
### Get the project:
Clone the repo and move to the project folder:
```
git clone https://github.com/Tom-NID/Constrained-Itinerary-Generation && cd Constrained-Itinerary-Generation
```

### Get crow:
Clone the repo and go the the scripts directory:
```
git clone https://github.com/CrowCpp/Crow.git && cd Crow/scripts
```

Generate craw_all.h:
```
./merge_all.py ../include/ craw_all.h
```

Move craw_all.h to the project directory:
```
mv crow_all.h ../../server/ && cd ..
```

Optionally remove the crow Folder:
```
rm -rf Crow/
```

### Build the Server:

Go to the server directory:
```
cd server/
```

Create a build directory:
```
mkdir build && cd build
```
Generate the build files using CMake:
```
cmake ..
```
Compile the project:
```
make
```

### Start the Server:

Run the compiled server executable:
```
./server
```
    
The server will start and listen on http://localhost:8080.
Debugging Tips

Verify Crow Setup: Ensure the crow_all.h file is correctly generated and placed in the include/ directory.

Check Boost Installation: If you encounter linking errors, verify that Boost is installed and accessible.

CORS Issues: Ensure that the frontend and server have compatible CORS settings to allow communication.

#### With these steps, your server should be running and ready to handle requests!
