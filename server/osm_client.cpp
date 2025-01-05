#include "osm_client.h"
#include <curl/curl.h>
#include <iostream>
#include <sstream>

size_t write_callback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::vector<OSMNode> get_osm_graph(double lat, double lon, double distance) {
    std::cout << "\n\n\nAH\n\n\n";

    std::vector<OSMNode> nodes;

    // Construire la requête Overpass API
    std::ostringstream query;
    query << "[out:json];"
          << "node(around:" << distance << "," << lat << "," << lon << ");"
          << "out;";
    std::string url = "http://overpass-api.de/api/interpreter?data=" + query.str();

    CURL* curl;
    CURLcode res;
    std::string response;

    curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

        res = curl_easy_perform(curl);
        curl_easy_cleanup(curl);

        if (res != CURLE_OK) {
            std::cerr << "Curl failed: " << curl_easy_strerror(res) << std::endl;
            return nodes;
        }
    }

    // Parse JSON de la réponse (simulé ici)
    size_t pos = 0;
    while ((pos = response.find("lat", pos)) != std::string::npos) { // Start searching after the previous match
        std::cout << "ah";
        
        OSMNode node;
        
        // Find latitude
        size_t start = response.find(":", pos) + 1;
        size_t end = response.find(",", start);
        node.lat = std::stod(response.substr(start, end - start));

        // Move position past the found latitude and look for longitude
        pos = end; // Move pos to the end of the latitude value

        // Find longitude
        pos = response.find("lon", pos);  // Search for "lon" after latitude processing
        if (pos == std::string::npos) break; // Exit loop if no "lon" is found
        start = response.find(":", pos) + 1;
        end = response.find("}", start);
        node.lon = std::stod(response.substr(start, end - start));

        // Add the node to the list of nodes
        nodes.push_back(node);

        // Move pos to the end of the processed longitude to continue searching
        pos = end;
    }


    return nodes;
}
