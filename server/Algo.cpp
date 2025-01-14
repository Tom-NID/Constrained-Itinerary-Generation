#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <cmath>
#include <algorithm>
#include "Graph.h"
#include <stdexcept>
#include <iostream>
#include <cmath>
#include <limits>
#include <iostream>
#include <algorithm>

#define PI 3.14159265358979323846
#define MAX_INACCURACY 500

const int MAX_PATHS = 10;


// PriorityQueue implementation for C++
class PriorityQueue {
public:
    void enqueue(int nodeId, double priority) {
        queue.emplace(priority, nodeId);
    }

    int dequeue() {
        if (queue.empty()) {
            throw std::runtime_error("Queue is empty!");
        }
        int nodeId = queue.top().second;
        queue.pop();
        return nodeId;
    }

    bool isEmpty() const {
        return queue.empty();
    }

private:
    std::priority_queue<std::pair<double, int>, std::vector<std::pair<double, int>>, std::greater<>> queue;
};

class GoalInfo {
public:
    std::vector<int> m_path;
    double m_length;

    GoalInfo(std::vector<int> path, double length)
    {
        m_path = path;
        m_length = length;
    }
};

// Helper function to reconstruct the path
void reconstructPath(const std::unordered_map<int, int>& cameFrom, int currentId, std::vector<int>& path) 
{
    path.clear();
    int i = 0;
    while (cameFrom.find(currentId) != cameFrom.end()) {
        path.push_back(currentId);
        currentId = cameFrom.at(currentId);
    }
    path.push_back(currentId);
    std::reverse(path.begin(), path.end());
}

void getGoalNodes(Graph& graph, const Node& center, int radius, std::vector<int>& goalNodes)
{
    goalNodes.clear();
    double inaccuracy = radius / 100;

    while (goalNodes.size() == 0 && inaccuracy <= MAX_INACCURACY) {
        for (auto& [nodeId, node] : graph.getNodes()) {
            double distanceToCenter = center.measure(node);
            if (distanceToCenter <= radius + inaccuracy && distanceToCenter >= radius - inaccuracy) {
                goalNodes.push_back(nodeId);
            }
        }
        inaccuracy *= 2;
    }
}

// A* algorithm
void aStar(Graph& graph, int startId, int endId, std::vector<int>& path) 
{
    path.clear();
    
    PriorityQueue openSet;
    openSet.enqueue(startId, 0);

    std::unordered_map<int, int> cameFrom;

    std::unordered_map<int, double> gScore;
    gScore[startId] = 0;

    std::unordered_map<int, double> fScore;
    fScore[startId] = graph.getNode(startId).heuristic(graph.getNode(endId));
    
    std::unordered_set<int> closedSet;

    while (!openSet.isEmpty()) {
        int currentId = openSet.dequeue();

        // If the node has already been visited
        if (closedSet.find(currentId) != closedSet.end()) {
            continue;
        }
        closedSet.insert(currentId);

        // If the goal is reached, reconstruct the path
        if (currentId == endId) {
            reconstructPath(cameFrom, currentId, path);
            return;
        }
        // Evaluate neighbors
        for (const auto& edge : graph.getNeighbors(currentId)) {
            int neighborId = edge.first;
            // Debugging: Check if edge costs are as expected

            if (closedSet.find(neighborId) != closedSet.end()) {
                continue;
            }

            double edgeDistance = edge.second.getDistance();
            
            // Calculate tentative gScore for the neighbor
            double tentativeGScore = gScore[currentId] + edgeDistance;
            
            if (gScore.find(neighborId) == gScore.end() || tentativeGScore < gScore[neighborId]) {
                // If this path is shorter (less costly) than the previous one to this point

                // Update the path to the neighbor
                cameFrom[neighborId] = currentId;

                // Update gScore for the neighbor
                gScore[neighborId] = tentativeGScore;
                
                // Update fScore for the neighbor
                fScore[neighborId] = gScore[neighborId] + graph.getNode(neighborId).heuristic(graph.getNode(endId));

                // Add the neighbor to the priority queue with its fScore as priority
                openSet.enqueue(neighborId, fScore[neighborId]);
            }
        }


    }
}

double getPathLenght(Graph& graph, const std::vector<int> path)
{
    double lenght = 0.0;
    for (int i = 1; i < path.size(); ++i) {
        Node node1 = graph.getNode(path[i - 1]);
        Node node2 = graph.getNode(path[i]);
        lenght += node1.getCost(node2).getDistance();
    }
    return lenght;
}

void getPathsAStar(Graph& graph, int startId, int precision, int searchRadius, std::vector<std::vector<int>>& paths)
{
    paths.clear();

    int distance = searchRadius;
    std::unordered_map<int, GoalInfo> goals;
    std::vector<int> path;
    double ratio = 0.0;

    std::vector<int> goalNodes;
    for (int i = 0; i < precision * 5; ++i) {
        goalNodes.clear();
        getGoalNodes(graph, graph.getNode(startId), searchRadius, goalNodes);
        double totalPathsLenght = 0;
        double totalLenght = 0;

        int nbCheckedNodes = std::max(MAX_PATHS, 10) * precision;
        goalNodes.resize(nbCheckedNodes);
        for (int nodeId : goalNodes) {
            if (startId == nodeId) continue;
            path.clear();
            aStar(graph, startId, nodeId, path);
            
            if (!path.empty()) {
                double lenght = getPathLenght(graph, path);
                
                double currLength = 0.0;
                for (size_t j = 1; j < path.size() - 1; ++j) {
                    currLength += graph.getNode(path[j - 1]).getCost(graph.getNode(path[j])).getDistance();
                    if (currLength >= searchRadius) {
                        size_t index = (std::abs(searchRadius - currLength) <
                                        std::abs(searchRadius - currLength - graph.getNode(path[j - 1]).getCost(graph.getNode(path[j])).getDistance()))
                                           ? j
                                           : j - 1;
                        nodeId = path[index];
                        path.resize(index + 1);
                        break;
                    }
                }

                if (goals.find(nodeId) == goals.end()) {
                    goals.insert({nodeId, GoalInfo(path, lenght)});
                }

                totalPathsLenght += lenght;
                totalLenght += searchRadius;
            }
        }

        if (totalLenght != 0) {
            ratio = 1 - (totalPathsLenght - totalLenght) / totalLenght;
            if (ratio < 0.9) ratio = 0.9;
            searchRadius *= ratio;
        }
    }

    std::vector<std::pair<int, GoalInfo>> sortedGoals(goals.begin(), goals.end());
    std::sort(sortedGoals.begin(), sortedGoals.end(), [&](const auto& a, const auto b) {
        return std::abs(a.second.m_length - distance) < std::abs(b.second.m_length - distance);
    });

    for (size_t i = 0; i < std::min(sortedGoals.size(), static_cast<size_t>(MAX_PATHS)); i++) {
        paths.push_back(sortedGoals[i].second.m_path);   
    }
}

void getLoopAStar(Graph& graph, int startId, int precision, int searchRadius, std::vector<std::vector<int>>& paths)
{
    paths.clear();

    int distance = searchRadius / 2;

    std::unordered_map<int, GoalInfo> goals;
    std::vector<int> path;
    double ratio = 0.0;

    std::vector<int> goalNodes;
    for (int i = 0; i < precision * 5; i++) {
        goalNodes.clear();
        getGoalNodes(graph, graph.getNode(startId), distance, goalNodes);

        double totalPathsLenght = 0;
        double totalLenght = 0;
        int nbCheckedNodes = std::max(MAX_PATHS, 10) * precision;
        goalNodes.resize(nbCheckedNodes);
        for (int nodeId : goalNodes) {
            if (startId == nodeId) continue;
            path.clear();
            aStar(graph, startId, nodeId, path);
            if (!path.empty()) {
                double currLength = 0.0;
                for (size_t j = 1; j < path.size() - 1; ++j) {
                    currLength += graph.getNode(path[j - 1]).getCost(graph.getNode(path[j])).getDistance();
                    if (currLength >= searchRadius) {
                        size_t index = (std::abs(searchRadius - currLength) < std::abs(searchRadius - currLength - graph.getNode(path[j - 1]).getCost(graph.getNode(path[j])).getDistance())) ? j : j - 1;
                        nodeId = path[index];
                        path.resize(index + 1);
                        break;
                    }
                }

                Graph tempGraph = graph;
                for (size_t j = 1; j < path.size(); ++j) {
                    tempGraph.removeEdge(path[j - 1], path[j]);
                    tempGraph.addEdge(path[j - 1], path[j], Cost(std::numeric_limits<double>::max()));
                    // tempGraph.addEdge(path[j - 1], path[j], Cost(graph.getNode(path[j - 1]).getCost(graph.getNode(path[j])).getDistance() * 2));
                }

                std::vector<int> returnPath;
                aStar(tempGraph, nodeId, startId, returnPath);

                path.insert(path.end(), returnPath.begin(), returnPath.end());
                
                double lenght = getPathLenght(graph, path);

                if (goals.find(nodeId) == goals.end()) {
                    goals.insert({nodeId, GoalInfo(path,  lenght)});
                }

                totalPathsLenght += lenght;
                totalLenght += distance;

            }
        }
        if (totalLenght != 0) {
            ratio = 1 - (totalPathsLenght - totalLenght) / totalLenght;
            searchRadius += ratio;
        }
    }

    std::vector<std::pair<int, GoalInfo>> sortedGoals(goals.begin(), goals.end());
    std::sort(sortedGoals.begin(), sortedGoals.end(), [&](const auto& a, const auto b) {
        return std::abs(a.second.m_length - searchRadius) < std::abs(b.second.m_length - searchRadius);
    });

    for (size_t i = 0; i < std::min(sortedGoals.size(), static_cast<size_t>(MAX_PATHS)); i++) {
        paths.push_back(sortedGoals[i].second.m_path);   
    }
}