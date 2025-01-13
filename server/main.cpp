#include "osm_client.h"
#include "crow_all.h"
#include "Graph.h"
#include "Algo.h"

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

        std::cout << "Received lat: " << lat << ", lon: " << lon << ", distance: " << distance << std::endl;
        
        // Graph graph;
        Graph graph = get_osm_graph(lat, lon, distance);        
        
        Node* closestNode;

        graph.getClosestNode(lat, lon, &closestNode);
        
        crow::json::wvalue response;

        
        // std::vector<int> path = aStar(&graph, 1, 50);
        std::vector<std::vector<int>> paths;
        getPathsAStar(graph, closestNode->getId(), 1, distance, paths);
        std::cout << std::endl <<"Path response" << std::endl;
        
        int i = 0;
        for (auto& path : paths) { 
            std::vector<crow::json::wvalue> pathResponse;
            double length = getPathLenght(graph, path);
            std::cout << "Length: " << std::to_string(length) << std::endl;
            response["length"][i] = crow::json::wvalue(length);
                    
            // crow::json::wvalue node_data;
            // node_data["lat"] = closestNode->getLat();
            // node_data["lon"] = closestNode->getLon();
            // response["closest"] = crow::json::wvalue(node_data);
            
            for (const auto& nodeId : path) {
                crow::json::wvalue node_data;
                std::pair<double, double> co = graph.getCoordinates(nodeId);
                node_data["lat"] = co.first;
                node_data["lon"] = co.second;
                pathResponse.push_back(node_data);
                // std::cout << "Id: " << nodeId << " Lat: " << co.first << " Lon: " << co.second << std::endl;
            }
            response["paths"][i] = crow::json::wvalue(pathResponse);
            ++i;
        }

        // Send all nodes
        // std::cout << "GETNODES" << std::endl;
            std::vector<crow::json::wvalue> nodes;
        
        // for (auto& [id, node] : graph.getNodes()) {
        //     if (node.getNeighbors().size() < 3) continue;
        //     crow::json::wvalue node_data;
        //     node_data["lat"] = node.getLat();
        //     node_data["lon"] = node.getLon();
        //     nodes.push_back(node_data);
        // }
        // response["nodes"] = crow::json::wvalue(nodes);


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
