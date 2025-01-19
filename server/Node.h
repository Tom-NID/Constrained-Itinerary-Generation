#ifndef NODE_H
#define NODE_H

#include <string>
#include <map>
#include <vector>

#include "Cost.h"

/**
 * @class Node
 * @brief Represents a single node in a graph.
 *
 * Each node is identified by a unique ID and contains geographic coordinates (latitude and longitude).
 * The node also stores its neighboring nodes and the associated costs for edges connecting them.
 */
class Node {

public:
    /**
     * @brief Constructor to create a Node with specific coordinates.
     * 
     * @param nodeId Unique identifier for the node.
     * @param lat Latitude of the node.
     * @param lon Longitude of the node.
     */
    Node(int nodeId, double lat, double lon);

    /**
     * @brief Default constructor for the Node class.
     */
    Node();

    /**
     * @brief Destructor for the Node class.
     */
    ~Node();

    /**
     * @brief Retrieves the unique identifier of the node.
     * 
     * @return The ID of the node.
     */
    int getId() const;

    /**
     * @brief Retrieves the latitude of the node.
     * 
     * @return The latitude of the node.
     */
    double getLat() const;

    /**
     * @brief Retrieves the longitude of the node.
     * 
     * @return The longitude of the node.
     */
    double getLon() const;

    /**
     * @brief Adds a neighboring node by ID with an associated cost.
     * 
     * @param other ID of the neighboring node.
     * @param cost Cost associated with the edge to the neighbor.
     * @return true if the neighbor was successfully added, false otherwise.
     */
    bool addNeighbor(int other, Cost& cost);

    /**
     * @brief Removes a neighboring node by ID.
     * 
     * @param otherId ID of the neighboring node to be removed.
     * @return true if the neighbor was successfully removed, false otherwise.
     */
    bool removeNeighbor(int otherId);

    /**
     * @brief Retrieves all neighbors of the node.
     * 
     * @return A map containing neighboring nodes and their associated costs.
     */
    std::map<int, Cost>& getNeighbors();

    /**
     * @brief Sets the cost for an edge to a specific neighboring node by ID.
     * 
     * @param otherId ID of the neighboring node.
     * @param cost New cost for the edge.
     */
    void setCost(int otherId, Cost& cost);

    /**
     * @brief Retrieves the cost of the edge to a specific neighboring node.
     * 
     * @param other  The neighboring node id.
     * @return The cost of the edge.
     */
    double getCost(const int other) const;


    /**
     * @brief Counts the total number of edges connected to the node.
     * 
     * @return The number of edges.
     */
    size_t countEdge() const;

    /**
     * @brief Calculates the heuristic value to another node.
     * 
     * Typically used in pathfinding algorithms like A*.
     * 
     * @param other Reference to the target node.
     * @return The heuristic value, often based on distance.
     */
    double heuristic(const Node& other) const;

    /**
     * @brief Measures the geographic distance to another node.
     * 
     * @param other Reference to the target node.
     * @return The geographic distance between the nodes.
     */
    double measure(const Node& other) const;

private:
    int m_iNodeId; ///< Unique identifier for the node.
    double m_dLat; ///< Latitude of the node.
    double m_dLon; ///< Longitude of the node.
    std::map<int, Cost> m_edge; ///< Edges and associated costs, keyed by neighbor IDs.
};

#endif // NODE_H