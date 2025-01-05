#ifndef OSM_CLIENT_H
#define OSM_CLIENT_H

#include <string>
#include <vector>

// Structure pour représenter un nœud OSM
struct OSMNode {
    double lat;
    double lon;
};

// Fonction pour récupérer les données du graphe depuis OSM
std::vector<OSMNode> get_osm_graph(double lat, double lon, double distance);

#endif
