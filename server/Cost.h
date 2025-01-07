#ifndef COST_H
#define COST_H

#include <string>
#include <map>

class Cost {

public:
    Cost(double distance);
    Cost();
    ~Cost();

    double getDistance();
     
private:
    double m_distance;
};

#endif // COST_H