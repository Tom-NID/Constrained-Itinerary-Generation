#include "osm_client.h"
#include <curl/curl.h>
#include <iostream>
#include <sstream>
#include <map>
#include <string>
#include <vector>
#include <regex>

// Callback function to handle the data received from CURL
size_t write_callback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

// Graph structure assumed to be in your code
Graph* get_osm_graph(double lat, double lon, double distance) {
    Graph temp;
    Graph* graph = &temp;

    // Construct the Overpass API query
    std::ostringstream query;
    query << "[out:xml][timeout:10];"
          << "way(around:" << distance << "," << lat << "," << lon 
          << ")[\"highway\"~\"^(secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track|bus_guideway|escape|raceway|road|busway|footway|bridleway|cycleway|path)$\"];"
          << "(._;>;);"
          << "out;";
    std::string url = "http://overpass-api.de/api/interpreter?data=" + query.str();

    // Perform the HTTP request
    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "Failed to initialize CURL" << std::endl;
        return graph;
    }

    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        std::cerr << "Curl request failed: " << curl_easy_strerror(res) << std::endl;
        return graph;
    }
    
    // Create regexes for extracting node and way data
    std::regex nodeRegex(R"(<node id=\"(\d+)\" lat=\"([-+]?\d*\.\d+|\d+)\" lon=\"([-+]?\d*\.\d+|\d+)\")");
    std::regex wayRegex(R"(<way\s+[^>]*>(.*\s*)*?<\/way>)");
    std::regex ndRefRegex(R"(<nd\s+ref=\"(\d+)\")");

    std::map<unsigned long long, int> nodeIdMap;
    int nodeIdIndex = 0;

    // Parse the nodes from the response
    std::smatch matches;
    std::string::const_iterator searchStart(response.cbegin());
    while (std::regex_search(searchStart, response.cend(), matches, nodeRegex)) {
        unsigned long long id = std::stoull(matches[1].str());
        double nodeLat = std::stod(matches[2].str());
        double nodeLon = std::stod(matches[3].str());

        if (nodeIdMap.find(id) == nodeIdMap.end()) {
            nodeIdMap[id] = nodeIdIndex;
            graph->addNode(nodeIdIndex, nodeLat, nodeLon);
            nodeIdIndex++;
        }

        searchStart = matches.suffix().first;
    }

    // Parse the ways and their nodes
    searchStart = response.cbegin();
    while (std::regex_search(searchStart, response.cend(), matches, wayRegex)) {
        std::string way = matches[0].str();

        std::string::const_iterator wayStart(way.cbegin());
        int previousNodeId = -1;
        
        std::smatch matchNode;
        while (std::regex_search(wayStart, way.cend(), matchNode, ndRefRegex)) {
            unsigned long long nodeId = std::stoull(matchNode[1].str());

            if (previousNodeId != -1 && nodeIdMap.find(previousNodeId) != nodeIdMap.end() && nodeIdMap.find(nodeId) != nodeIdMap.end()) {
                Node node1 = graph->getNode(nodeIdMap[previousNodeId]);
                Node node2 = graph->getNode(nodeIdMap[nodeId]);
                Cost temp(node1.measure(node2));
                if (!graph->addEdge(nodeIdMap[previousNodeId], nodeIdMap[nodeId], temp)) {
                    std::cerr << "GraphAddEdge error" << std::endl;
                }
            }

            previousNodeId = nodeId;
            wayStart = matchNode.suffix().first;
        }
    
        searchStart = matches.suffix().first;
    }

    std::cout << "Graph built with " << graph->countNode() << " nodes and " << graph->countEdge() << " edges." << std::endl;
    return graph;
}
