#include "Cost.h"

#include <limits>

Cost::Cost(double distance)
{
    m_distance = distance;
}

Cost::Cost()
{
    m_distance = std::numeric_limits<double>::max();
}

Cost::~Cost()
{

}

double Cost::getDistance()
{
    return m_distance;
}