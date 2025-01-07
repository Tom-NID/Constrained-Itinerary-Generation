#include "osm_client.h"
#include "crow_all.h"
#include "Graph.h"
#include "Algo.h"

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
        Graph temp = Graph();
        Graph* graph = &temp;

        graph = get_osm_graph(lat, lon, distance);        
        // Add nodes
        // graph->addNode(0, 0, 0);
        // graph->addNode(1, 1, 1);
        // graph->addNode(2, 1, -1);
        // graph->addNode(3, 2, 0);

        // // Define edge costs
        // Cost cost1(2.0);
        // Cost cost2(4.0);
        // Cost cost3(5.0);
        // Cost cost4(5.0);
        
        // // Add edges
        // graph->addEdge(0, 1, &cost1);
        // graph->addEdge(0, 2, &cost2);
        // graph->addEdge(1, 3, &cost3);
        // graph->addEdge(2, 3, &cost4);

        Node* closestNode;

        // graph->getClosestNode(lat, lon, &closestNode);
        

        
        crow::json::wvalue response;

        std::vector<crow::json::wvalue> pathResponse;
        std::vector<crow::json::wvalue> nodes;
        
        // std::vector<int> path = aStar(graph, 1, 103); //Id 0 to id 3

        // response["length"] = crow::json::wvalue(getPathLenght(graph, &path));
        // std::cout << std::endl <<"Path response" << std::endl;
        
        // crow::json::wvalue node_data;
        // for (const auto& nodeId : path) {
        //     crow::json::wvalue node_data;
        //     std::pair<double, double> co = graph->getCoordinates(nodeId);
        //     node_data["lat"] = co.first;
        //     node_data["lon"] = co.second;
        //     pathResponse.push_back(node_data);
        //     std::cout << "Id: " << nodeId << " Lat: " << co.first << " Lon: " << co.second << std::endl;
        // }
        // response["path"] = crow::json::wvalue(pathResponse);

        // Send all nodes
        std::cout << "GETNODES" << std::endl;
        
        for (auto& [id, node] : graph->getNodes()) {
            crow::json::wvalue node_data;
            node_data["lat"] = node.getLat();
            node_data["lon"] = node.getLon();
            nodes.push_back(node_data);
            // std::cout << "lat" << node.getLat() << "lon" << node.getLon() << std::endl;
        }
        response["nodes"] = crow::json::wvalue(nodes);

        crow::response res(response);
        add_cors_headers(res);  // Add CORS headers for the POST request
        std::cout << "Sending response\n";
        return res;
    });

    app.port(8080).multithreaded().run();
    return 0;
}
