#include "Node.h"
#include <complex>
#include <cmath>
#include <limits>
#include <iostream>

#include "Cost.h"

# define PI 3.14159265358979323846

Node::Node(int nodeId, double lat, double lon)
{
    m_iNodeId = nodeId;
    m_dLat = lat;
    m_dLon = lon;
}

Node::Node()
{
    m_iNodeId = -1;
    m_dLat = 0;
    m_dLon = 0;
}

Node::~Node()
{
}

int Node::getId()
{
    return m_iNodeId;
}

double Node::getLat()
{
    return m_dLat;
}

double Node::getLon()
{
    return m_dLon;
}

bool Node::addNeighbor(Node other, Cost cost)
{
    m_edge[other.m_iNodeId] = cost;
    return true; 
}

std::map<int, Cost> Node::getNeighbors()
{
    return m_edge;
}

size_t Node::countEdge() const
{
    return m_edge.size();
}

double Node::heuristic(const Node other)
{
    std::cout << m_dLat << m_dLon << std::endl;
    std::cout << other.m_dLat << other.m_dLon << std::endl;
    return std::sqrt(std::pow(m_dLat - other.m_dLat, 2) + std::pow(m_dLon - other.m_dLon, 2));
}


double Node::measure(const Node other) 
{
    double R = 6378.137; // Radius of earth in KM
    double dLat = (other.m_dLat * PI) / 180 - (m_dLat * PI) / 180;
    double dLon = (other.m_dLon * PI) / 180 - (m_dLon * PI) / 180;
    double a =
        sin(dLat / 2) * sin(dLat / 2) +
        cos((m_dLat * PI) / 180) *
            cos((other.m_dLat * PI) / 180) *
            sin(dLon / 2) *
            sin(dLon / 2);
    double c = 2 * atan2(std::sqrt(a), std::sqrt(1 - a));
    double d = R * c;
    return d * 1000; // meters
}

Cost Node::getCost(const Node other) {
    if (m_edge.find(other.m_iNodeId) == m_edge.end()) {
        // static Cost temp();
        // return &temp;
        //TODO
    }
    return m_edge.at(other.m_iNodeId);
}
