#include "crow_all.h"
#include "osm_client.h"

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

        auto graph = get_osm_graph(lat, lon, distance);

        if (graph.empty()) {
            std::cout << "Failed to fetch OSM data" << std::endl;
            return crow::response(500, "Failed to fetch OSM data");
        }

        crow::json::wvalue response;
        std::vector<crow::json::wvalue> nodes;
        for (const auto& node : graph) {
            crow::json::wvalue node_data;
            node_data["lat"] = node.lat;
            node_data["lon"] = node.lon;
            nodes.push_back(node_data);
            std::cout << node.lat << " : " << node.lon << std::endl;
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
