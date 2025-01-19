#include "Graph.h"

#include <cmath>
#include <limits>
#include <iostream>
#include <unordered_set>
#include <unordered_map>

#include <utility>
#include <functional>


# define PI 3.14159265358979323846
#define MIN_DISTANCE_BETWEEN_TWO_NODES 20 //m

struct PairHash {
    template <typename T1, typename T2>
    std::size_t operator()(const std::pair<T1, T2>& p) const {
        auto hash1 = std::hash<T1>{}(p.first);
        auto hash2 = std::hash<T2>{}(p.second);
        // Combine the two hashes
        return hash1 ^ (hash2 << 1);
    }
};

Graph::Graph()
{

}

Graph::~Graph()
{
}

bool Graph::addNode(int nodeId, double lat, double lon) 
{
    auto result = m_nodes.emplace(nodeId, Node(nodeId, lat, lon));
    return result.second;
}

bool Graph::removeNode(int nodeId)
{
    return m_nodes.erase(nodeId) > 0;
}


bool Graph::hasNode(int nodeId)
{
    return m_nodes.find(nodeId) != m_nodes.end();
}

bool Graph::addEdge(int fromNodeId, int toNodeId, Cost& cost)
{
    m_nodes[fromNodeId].addNeighbor(toNodeId, cost) && m_nodes[toNodeId].addNeighbor(fromNodeId, cost);
    return true;
}

bool Graph::removeEdge(int fromNodeId, int toNodeId)
{
    return m_nodes[fromNodeId].removeNeighbor(toNodeId) && m_nodes[toNodeId].removeNeighbor(fromNodeId);
}

std::pair<double, double> Graph::getCoordinates(int nodeId) const
{
    if (m_nodes.find(nodeId) == m_nodes.end()) {
        return std::pair<double, double> ();
    }
    Node node = m_nodes.at(nodeId);
    return {node.getLat(), node.getLon()};
}

Node& Graph::getNode(int nodeId)
{
    if (m_nodes.find(nodeId) == m_nodes.end()) {
        static Node defaultNode(-1, 0.0, 0.0); 
        return defaultNode;
    }
    return m_nodes[nodeId];
}

std::map<int, Node>& Graph::getNodes()
{
    return m_nodes;
}

std::map<int, Cost>& Graph::getNeighbors(int nodeId)
{
    // if (m_nodes.find(nodeId) == m_nodes.end()) {
    //     return static std::map<int, Cost>();
    // }
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

    Node falseNode(-1, lat, lon);
    Node* closestNode = nullptr;
    double minDistance = std::numeric_limits<double>::max();

    for (auto& [nodeId, node] : m_nodes) {

        double distance = node.heuristic(falseNode); 
        
        if (distance < minDistance) {
            minDistance = distance;
            closestNode = &node;
        }
    }

    if (!closestNode) {
        std::cout << "No closest node found." << std::endl;
        return false;
    }

    *pp_node = closestNode;
    return true;
}

void Graph::collapseNode()
{
    std::unordered_set<int> processedNodes;
    for (auto it = m_nodes.begin(); it != m_nodes.end(); ) {
        int nodeId = it->first;

        const auto& neighbors = getNeighbors(nodeId);
        
        if (neighbors.size() == 2) {
            auto neighborIt = neighbors.begin();
            int neighbor1 = neighborIt->first;
            double cost1 = neighborIt->second.getDistance();
            ++neighborIt;
            int neighbor2 = neighborIt->first;
            double cost2 = neighborIt->second.getDistance();

            Cost cost(cost1 + cost2);
            addEdge(neighbor1, neighbor2, cost);
            removeEdge(nodeId, neighbor1);
            removeEdge(nodeId, neighbor2);
            processedNodes.insert(nodeId);
            it = m_nodes.erase(it);
        } else {
            ++it;
        }
    }
}


void Graph::mergeCloseNodes() {
    std::unordered_map<std::pair<int, int>, std::vector<int>, PairHash> spatialGrid;
    constexpr double GRID_SIZE = MIN_DISTANCE_BETWEEN_TWO_NODES;

    for (const auto& [nodeId, node] : m_nodes) {
        int gridX = static_cast<int>(node.getLat() / GRID_SIZE);
        int gridY = static_cast<int>(node.getLon() / GRID_SIZE);
        spatialGrid[{gridX, gridY}].push_back(nodeId);
    }

    for (const auto& [gridCell, nodeIds] : spatialGrid) {
        for (int i = 0; i < nodeIds.size(); ++i) {
            int nodeId1 = nodeIds[i];
            if (m_nodes.find(nodeId1) == m_nodes.end()) continue;

            for (int j = i + 1; j < nodeIds.size(); ++j) {
                int nodeId2 = nodeIds[j];
                if (m_nodes.find(nodeId2) == m_nodes.end()) continue;

                double distance = m_nodes[nodeId1].measure(m_nodes[nodeId2]);

                if (distance < MIN_DISTANCE_BETWEEN_TWO_NODES) {
                    
                    const auto& neighbors = getNeighbors(nodeId2);

                    for (const auto& edge : neighbors) {
                        int neighborId = edge.first;
                        double edgeCost = edge.second.getDistance();

                        if (neighborId != nodeId1) {
                            Cost cost(edgeCost);
                            addEdge(nodeId1, neighborId, cost);
                            removeEdge(nodeId2, neighborId);
                        }
                    }
                    m_nodes.erase(nodeId2);
                }
            }
        }
    }
}
