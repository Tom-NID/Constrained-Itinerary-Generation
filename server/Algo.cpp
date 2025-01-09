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
std::vector<int> reconstructPath(const std::unordered_map<int, int>& cameFrom, int currentId) 
{
    std::vector<int> path;
    while (cameFrom.find(currentId) != cameFrom.end()) {
        path.push_back(currentId);
        currentId = cameFrom.at(currentId);
    }
    path.push_back(currentId);
    std::reverse(path.begin(), path.end());
    return path;
}

std::vector<int> getGoalNodes(Graph& graph, const Node& center, int radius)
{
    std::vector<int> goalNodes;
    int inaccuracy = radius / 100;

    while (goalNodes.size() == 0 && inaccuracy <= MAX_INACCURACY) {
        for (auto& [nodeId, node] : graph.getNodes()) {
            double distanceToCenter = center.getCost(node).getDistance();
            if (distanceToCenter <= radius + inaccuracy && distanceToCenter >= radius - inaccuracy) {
                goalNodes.push_back(nodeId);
            }
        }
        inaccuracy *= 2;
    }
    return goalNodes;
}

// A* algorithm
std::vector<int> aStar(Graph& graph, int startId, int endId) 
{
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
            return reconstructPath(cameFrom, currentId);
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
    return std::vector<int>();
}

double getPathLenght(Graph& graph, const std::vector<int>& path)
{
    double lenght = 0.0;
    for (int i = 1; i < path.size(); ++i) {
        Node node1 = graph.getNode(path[i - 1]);
        Node node2 = graph.getNode(path[i]);
        lenght += node1.getCost(node2).getDistance();
    }
    return lenght;
}

std::vector<int> getPathsAStar(Graph& graph, int startId, int precision, int searchRadius)
{
    std::unordered_map<int, GoalInfo> goals;
    double ratio = 0.0;

    for (int i = 0; i < precision * 5; ++i) {
        std::vector<int> goalNodes = getGoalNodes(graph, graph.getNode(startId), searchRadius);
        
        double totalPathsLenght = 0;
        double totalLenght = 0;

        int nbCheckedNodes = std::max(MAX_PATHS, 10) * precision;
        goalNodes.resize(nbCheckedNodes);
        for (int nodeId : goalNodes) {
            if (startId == nodeId) continue;

            std::vector<int> path = aStar(graph, startId, nodeId);
            if (!path.empty()) {
                double lenght = getPathLenght(graph, path);
                
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
        return std::abs(a.second.m_length - searchRadius) < std::abs(b.second.m_length - searchRadius);
    });

    // if (sortedGoals.size() > MAX_PATHS) {
    //     sortedGoals.resize(MAX_PATHS);
    // }
    if (sortedGoals.size() > 0) {
        return sortedGoals[0].second.m_path; 
    }
    return std::vector<int>();
}
