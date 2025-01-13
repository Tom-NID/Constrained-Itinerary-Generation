#ifndef NODE_H
#define NODE_H

#include <string>
#include <map>
#include <vector>

#include "Cost.h"

class Node {

public:
    Node(int nodeId, double lat, double lon);
    Node();
    ~Node();

    int getId() const;
    double getLat() const;
    double getLon() const;
    bool addNeighbor(Node& other, Cost& cost);
    
    std::map<int, Cost>& getNeighbors();
    Cost getCost(const Node& other) const;

    size_t countEdge() const;

    double heuristic(const Node& other) const;
    double measure(const Node& other) const;

private:
    int m_iNodeId;
    double m_dLat;
    double m_dLon;
    std::map<int, Cost> m_edge;
};

#endif // NODE_H