#ifndef ALGO_H
#define ALGO_H

#include <string>
#include <map>
#include <vector>

#include "Graph.h"

void aStar(Graph& graph, int startId, int endId, std::vector<int>& path);

void getPathsAStar(Graph& graph, int startId, int precision, int searchRadius, std::vector<std::vector<int>>& paths);

double getPathLenght(Graph& graph, const std::vector<int> path);

struct PriorityQueueElement {
    int nodeId;
    double gScore;
    double fScore;
    
    PriorityQueueElement(int id, double g, double f) : nodeId(id), gScore(g), fScore(f) {}

    bool operator<(const PriorityQueueElement& other) const {
        return fScore > other.fScore;
    }
};

#endif // ALGO_H
