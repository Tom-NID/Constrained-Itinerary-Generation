#include "Graph.h"

#include <cmath>
#include <limits>
#include <iostream>

# define PI 3.14159265358979323846

Graph::Graph()
{

}

Graph::~Graph()
{
}

bool Graph::addNode(int nodeId, double lat, double lon) 
{
    if (m_nodes.find(nodeId) != m_nodes.end()) {
        return false;
    }
    Node* temp = new Node(nodeId, lat, lon);
    return m_nodes.insert({nodeId, Node(nodeId, lat, lon)}).second;
}

bool Graph::hasNode(int nodeId)
{
    return m_nodes.find(nodeId) != m_nodes.end();
}

bool Graph::addEdge(int fromNodeId, int toNodeId, Cost cost)
{
    if (!hasNode(fromNodeId) || !hasNode(toNodeId)) {
        return false;
    }
    m_nodes[fromNodeId].addNeighbor(m_nodes[toNodeId], cost);
    m_nodes[toNodeId].addNeighbor(m_nodes[fromNodeId], cost);
    return true;
}

std::pair<double, double> Graph::getCoordinates(int nodeId) const
{
    if (m_nodes.find(nodeId) == m_nodes.end()) {
        return std::pair<double, double> ();
    }
    Node node = m_nodes.at(nodeId);
    return {node.getLat(), node.getLon()};
}

Node Graph::getNode(int nodeId)
{
    if (m_nodes.find(nodeId) == m_nodes.end()) {
        static Node defaultNode(-1, 0.0, 0.0); 
        return defaultNode;
    }
    return m_nodes[nodeId];
}

std::map<int, Node> Graph::getNodes()
{
    return m_nodes;
}

std::map<int, Cost> Graph::getNeighbors(int nodeId)
{
    if (m_nodes.find(nodeId) == m_nodes.end()) {
        return std::map<int, Cost>();
    }
    return m_nodes[nodeId].getNeighbors();
}

size_t Graph::countNode()
{
    return m_nodes.size();
}

size_t Graph::countEdge()
{
    size_t nb = 0;
    for (const auto& [_, node] : m_nodes) {
        nb += node.countEdge();
    }
    return nb;
}

bool Graph::getClosestNode(double lat, double lon, Node** pp_node)
{
    if (m_nodes.empty()) {
        return false;
    }

    Node falseNode(-1, lat, lon); // dynamically allocated
    Node* closestNode = nullptr;
    double minDistance = std::numeric_limits<double>::max();

    // Log the falseNode coordinates to verify
    
    // Iterate through the nodes map
    for (int i = 0; i < m_nodes.size(); ++i) 
    for (auto& [nodeId, node] : m_nodes) {
        // Log the current node being processed
    
        // Call heuristic with the falseNode (which is a dynamically allocated object)
        double distance = node.heuristic(falseNode); // Note the use of -> to access the node

        // Check if the heuristic returned a valid distance
        if (distance < minDistance) {
            minDistance = distance;
            closestNode = &node; // Use the reference to get the address of the node in the map
        }
    }

    // If closestNode is still nullptr, return false
    if (!closestNode) {
        std::cout << "No closest node found." << std::endl;
        return false;
    }

    // Set the output parameter
    *pp_node = closestNode;
    return true;
}
