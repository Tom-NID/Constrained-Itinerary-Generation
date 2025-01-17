#ifndef OSM_CLIENT_H
#define OSM_CLIENT_H

#include <string>
#include "Graph.h"

/**
 * @brief Fetches an OpenStreetMap graph for a given location and distance.
 * 
 * This function retrieves a graph representing the road network or other structures
 * within a specified distance from a given latitude and longitude.
 * 
 * @param lat The latitude of the center point.
 * @param lon The longitude of the center point.
 * @param distance The radius (in meters) around the center point to fetch the graph.
 * @return A reference to a Graph object containing the nodes and edges for the specified area.
 */
void get_osm_graph(double lat, double lon, double distance, Graph& graph);

#endif
