#ifndef OSM_CLIENT_H
#define OSM_CLIENT_H

#include <string>
#include "Graph.h"


Graph* get_osm_graph(double lat, double lon, double distance);

#endif
