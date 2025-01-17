#include "osm_client.h"
#include "crow_all.h"
#include "Graph.h"
#include "Algo.h"
#include "time.h"

#include <random> // For generating random numbers

// Fonction pour ajouter les en-têtes CORS
void add_cors_headers(crow::response& res) {
    res.add_header("Access-Control-Allow-Origin", "*");  // Allow all origins
    res.add_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");  // Allowed methods
}

int main() {
    crow::SimpleApp app;
    
    CROW_ROUTE(app, "/route")
    .methods("OPTIONS"_method)
    ([](const crow::request& req) {
        crow::response res;
        return res;
    });

    // Define POST route next
    CROW_ROUTE(app, "/route")
    .methods("POST"_method)
    ([](const crow::request& req) {
        std::cout << "Received request at /route" << std::endl;

        auto body = crow::json::load(req.body);
        if (!body) {
            std::cout << "Invalid JSON" << std::endl;
            return crow::response(400, "Invalid JSON");
        }

        double lat = body["lat"].d();
        double lon = body["lon"].d();
        double distance = body["distance"].d();
        int precision = body["precision"].i();
        std::string algo = body["algo"].s();
        
        std::cout << "Received lat: " << lat << ", lon: " << lon << ", distance: " << distance << ", algo: " << algo << std::endl;
        
        Graph graph;
        if (algo == "loopAStar") {
            get_osm_graph(lat, lon, distance / 2, graph);        
        } else {
            get_osm_graph(lat, lon, distance, graph);        
        }

        Node* closestNode;

        graph.getClosestNode(lat, lon, &closestNode);
        
        crow::json::wvalue response;

        std::vector<std::vector<int>> paths;

        if (algo == "aStar") {
            getPathsAStar(graph, closestNode->getId(), precision, distance, paths);
        } else if (algo == "loopAStar") {
            getLoopAStar(graph, closestNode->getId(), precision, distance, paths);   
        } else {
            std::cerr << "No algo from :" << body["algo"] << std::endl;
            return crow::response(400, "Invalid Algo");
        }


        std::cout << std::endl <<"Path response" << std::endl;
        
        int i = 0;
        for (auto& path : paths) { 
            std::vector<crow::json::wvalue> pathResponse;
            double length = getPathLenght(graph, path);
            // std::cout << "Length: " << std::to_string(length) << std::endl;
            response["length"][i] = crow::json::wvalue(length);
                    
            for (const auto& nodeId : path) {
                crow::json::wvalue node_data;
                std::pair<double, double> co = graph.getCoordinates(nodeId);
                node_data["lat"] = co.first;
                node_data["lon"] = co.second;
                pathResponse.push_back(node_data);
            }
            response["paths"][i] = crow::json::wvalue(pathResponse);
            ++i;
        }
        // */

        // Send all nodes
        /*
        std::cout << "GETNODES" << std::endl;
            std::vector<crow::json::wvalue> nodes;
        
        for (auto& [id, node] : graph.getNodes()) {
            crow::json::wvalue node_data;
            node_data["lat"] = node.getLat();
            node_data["lon"] = node.getLon();
            nodes.push_back(node_data);
        }
        response["nodes"] = crow::json::wvalue(nodes);
        */
        

        // for (auto& [id, node] : graph.getNodes()) {
        //     if (node.getNeighbors().size() >= 3) continue;
        //     crow::json::wvalue node_data;
        //     node_data["lat"] = node.getLat();
        //     node_data["lon"] = node.getLon();
        //     nodes.push_back(node_data);
        // }
        // response["nodes"] = crow::json::wvalue(nodes);

        crow::response res(response);
        add_cors_headers(res);  // Add CORS headers for the POST request
        std::cout << "Sending response\n";
        return res;
    });

    app.port(8080).multithreaded().run();
    return 0;
}

