#ifndef COST_H
#define COST_H

#include <string>
#include <map>

/**
 * @class Cost
 * @brief Represents the cost associated with an edge in the graph.
 * 
 * This class primarily stores the distance between two nodes and provides methods
 * to retrieve this distance.
 */
class Cost {

public:
    /**
     * @brief Constructs a Cost object with a specified distance.
     * 
     * @param distance The distance value associated with this cost.
     */
    Cost(double distance);

    /**
     * @brief Default constructor for a Cost object, initializes with a default distance.
     */
    Cost();

    /**
     * @brief Destructor for the Cost object.
     */
    ~Cost();

    /**
     * @brief Retrieves the distance associated with this cost.
     * 
     * @return The distance as a double value.
     */
    double getDistance() const;
     
private:
    double m_distance; ///< The distance or cost associated with the edge.
};

#endif // COST_H