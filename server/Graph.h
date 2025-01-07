#ifndef GRAPH_H
#define GRAPH_H

#include <string>
#include <map>
#include <set>
#include <vector>

#include "Node.h"
#include "Cost.h"

class Graph {

public:
    Graph();
    ~Graph();

    bool addNode(int nodeId, double lat, double lon);
    bool hasNode(int nodeId);
    bool addEdge(int fromNodeId, int toNodeId, Cost cost);
    std::pair<double, double> getCoordinates(int nodeID) const;

    Node getNode(int nodeId);
    std::map<int, Node> getNodes();
    std::map<int, Cost> getNeighbors(int nodeId);

    size_t countNode();
    size_t countEdge();

    bool getClosestNode(double lat, double lon, Node** node);

private:

    std::map<int, Node> m_nodes;
};

#endif // GRAPH_H
