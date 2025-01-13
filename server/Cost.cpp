#include "Cost.h"

#include <limits>
#include <iostream>

Cost::Cost(double distance)
{
    m_distance = distance;
}

Cost::Cost()
{
    m_distance = -1; //std::numeric_limits<double>::max();
}

Cost::~Cost()
{

}

double Cost::getDistance() const
{
    return m_distance;
}