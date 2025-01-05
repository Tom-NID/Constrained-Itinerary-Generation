# Constrained Itinerary Generation Server

This project uses Crow, a C++ microframework, to set up and run a RESTful server. Follow these steps to initialize, build, and run the server.
Prerequisites

## Requirements
- C++ Compiler: GCC or Clang (with C++11 support or later).
- CMake: Version 3.10 or higher.
- Boost: Required for Crow.
    - Linux : 
        ```
        sudo apt-get install libboost-all-dev

        sudo apt-get install libasio-dev
        ```
- Curl
    
## Compiling from source
### Install dependencies:
- Crow

Follow the instructions on Crow git

    git clone https://github.com/CrowCpp/Crow.git

- Curl

Install curl   

    https://curl.se/


### Get the code :

    git clone https://github.com/Tom-NID/Constrained-Itinerary-Generation && cd Constrained-Itinerary-Generation

Generate crow_all.h

This creates a crow_all.h file in the root of the Crow repository.

Move the crow_all.h file to your project’s server directory:

    mv crow_all.h ../Constrained-Itinerary-Generation/server/

Return to the server directory:

    cd ../Constrained-Itinerary-Generation/server

### Build the Server

Create a build directory:

    mkdir build && cd build

Generate the build files using CMake:

    cmake ..

Compile the project:

    make

4. Start the Server

Run the compiled server executable:

    ./server

The server will start and listen on http://localhost:8080.
Debugging Tips

Verify Crow Setup: Ensure the crow_all.h file is correctly generated and placed in the include/ directory.

Check Boost Installation: If you encounter linking errors, verify that Boost is installed and accessible.

CORS Issues: Ensure that the frontend and server have compatible CORS settings to allow communication.

#### With these steps, your server should be running and ready to handle requests!
