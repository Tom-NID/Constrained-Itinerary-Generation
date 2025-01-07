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

    int getId();
    double getLat();
    double getLon();
    bool addNeighbor(Node* other, Cost* cost);
    std::map<int, Cost*>* getNeighbors();

    size_t countEdge() const;

    double heuristic(const Node* other);
    double measure(const Node* other);
    Cost* getCost(const Node* other);

private:
    int m_iNodeId;
    double m_dLat;
    double m_dLon;
    std::map<int, Cost*> m_edge;
};

#endif // NODE_H