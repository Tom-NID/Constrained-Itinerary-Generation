#ifndef ALGO_H
#define ALGO_H

#include <string>
#include <map>
#include <vector>

#include "Graph.h"

/**
 * @brief Executes the A* algorithm to find the shortest path between two nodes.
 * 
 * @param graph The graph to perform the search on.
 * @param startId The ID of the starting node.
 * @param endId The ID of the target node.
 * @param path A reference to a vector where the computed path will be stored.
 */
void aStar(Graph& graph, int startId, int endId, std::vector<int>& path);

/**
 * @brief Computes multiple paths using the A* algorithm based on a given starting point and search parameters.
 * 
 * @param graph The graph to perform the search on.
 * @param startId The ID of the starting node.
 * @param precision The precision level for the search.
 * @param searchRadius The radius to consider for finding goal nodes.
 * @param paths A reference to a vector where the computed paths will be stored.
 */
void getPathsAStar(Graph& graph, int startId, int precision, int searchRadius, std::vector<std::vector<int>>& paths);

/**
 * @brief Calculates the total length of a given path.
 * 
 * @param graph The graph containing the path.
 * @param path The path represented as a vector of node IDs.
 * @return The total length of the path.
 */
double getPathLenght(Graph& graph, const std::vector<int> path);

/**
 * @brief Finds closed-loop paths starting and ending at a specified node using the A* algorithm.
 * 
 * @param graph The graph to perform the search on.
 * @param startId The ID of the starting node.
 * @param precision The precision level for the search.
 * @param searchRadius The radius to consider for finding goal nodes.
 * @param paths A reference to a vector where the computed loop paths will be stored.
 */
void getLoopAStar(Graph& graph, int startId, int precision, int searchRadius, std::vector<std::vector<int>>& paths);

/**
 * @struct PriorityQueueElement
 * @brief Represents an element in the priority queue used for the A* algorithm.
 */
struct PriorityQueueElement {
    int nodeId; ///< The ID of the node.
    double gScore; ///< The cost from the start node to this node.
    double fScore; ///< The estimated total cost (gScore + heuristic).
    
    /**
     * @brief Constructor for PriorityQueueElement.
     * 
     * @param id The ID of the node.
     * @param g The gScore value.
     * @param f The fScore value.
     */
    PriorityQueueElement(int id, double g, double f) : nodeId(id), gScore(g), fScore(f) {}

    /**
     * @brief Comparison operator for priority queue ordering.
     * 
     * @param other The other PriorityQueueElement to compare with.
     * @return true if this element has a higher fScore than the other, for use in min-heap structures.
     */
    bool operator<(const PriorityQueueElement& other) const {
        return fScore > other.fScore;
    }
};

#endif // ALGO_H
