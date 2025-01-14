#ifndef GRAPH_H
#define GRAPH_H

#include <string>
#include <map>
#include <set>
#include <vector>

#include "Node.h"
#include "Cost.h"

/**
 * @class Graph
 * @brief Represents a directed graph with nodes and edges.
 *
 * The Graph class allows the addition, removal, and querying of nodes and edges.
 * Each node has unique coordinates (latitude and longitude) and edges have associated costs.
 */
class Graph {

public:
    /**
     * @brief Constructor for the Graph class.
     * Initializes an empty graph.
     */
    Graph();

    /**
     * @brief Destructor for the Graph class.
     * Cleans up resources used by the graph.
     */
    ~Graph();

    /**
     * @brief Adds a node to the graph.
     * 
     * @param nodeId Unique identifier for the node.
     * @param lat Latitude of the node.
     * @param lon Longitude of the node.
     * @return true if the node was successfully added, false if the node already exists.
     */
    bool addNode(int nodeId, double lat, double lon);

    /**
     * @brief Checks if a node with the given ID exists in the graph.
     * 
     * @param nodeId Unique identifier for the node.
     * @return true if the node exists, false otherwise.
     */
    bool hasNode(int nodeId);

    /**
     * @brief Adds an edge between two nodes in the graph.
     * 
     * @param fromNodeId ID of the source node.
     * @param toNodeId ID of the destination node.
     * @param cost Cost associated with the edge.
     * @return true if the edge was successfully added, false otherwise.
     */
    bool addEdge(int fromNodeId, int toNodeId, Cost cost);

    /**
     * @brief Removes an edge between two nodes.
     * 
     * @param fromNodeId ID of the source node.
     * @param toNodeId ID of the destination node.
     * @return true if the edge was successfully removed, false otherwise.
     */
    bool removeEdge(int fromNodeId, int toNodeId);

    /**
     * @brief Gets the coordinates (latitude, longitude) of a node.
     * 
     * @param nodeID ID of the node.
     * @return A pair representing the latitude and longitude of the node.
     */
    std::pair<double, double> getCoordinates(int nodeID) const;

    /**
     * @brief Retrieves a node from the graph by its ID.
     * 
     * @param nodeId Unique identifier for the node.
     * @return The node object.
     */
    Node getNode(int nodeId);

    /**
     * @brief Retrieves all nodes in the graph.
     * 
     * @return A map containing all nodes, keyed by their IDs.
     */
    std::map<int, Node> getNodes();

    /**
     * @brief Retrieves the neighbors of a given node.
     * 
     * @param nodeId ID of the node.
     * @return A map containing neighbors and their associated costs.
     */
    std::map<int, Cost> getNeighbors(int nodeId);

    /**
     * @brief Counts the total number of nodes in the graph.
     * 
     * @return The number of nodes in the graph.
     */
    size_t countNode();

    /**
     * @brief Counts the total number of edges in the graph.
     * 
     * @return The number of edges in the graph.
     */
    size_t countEdge();

    /**
     * @brief Finds the closest node to the given coordinates.
     * 
     * @param lat Latitude of the target location.
     * @param lon Longitude of the target location.
     * @param node Pointer to the closest node (output parameter).
     * @return true if a closest node was found, false otherwise.
     */
    bool getClosestNode(double lat, double lon, Node** node);

    /**
     * @brief Collapses nodes in the graph based on the number of way.
     * 
     * The implementation of this function depends on the graph's requirements.
     */
    void collapseNode();

    /**
     * @brief Merges nodes that are close to each other.
     * 
     * Useful for simplifying the graph by combining nearby nodes.
     */
    void mergeCloseNodes();

private:
    std::map<int, Node> m_nodes; ///< Stores all nodes in the graph, keyed by their IDs.

    /**
     * @brief Removes a node from the graph.
     * 
     * @param nodeId Unique identifier for the node to be removed.
     * @return true if the node was successfully removed, false otherwise.
     */
    bool removeNode(int nodeId);
};

#endif // GRAPH_H
