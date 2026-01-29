---
sidebar_position: 7
---

# DCEL (Doubly Connected Edge List)

## Codes

<Tabs>
<TabItem value="Python" label="Python">

```python

class HalfEdge:
    def __init__(self, origin_vertex):
        """
        Initialize a half-edge.
        Arguments:
            origin_vertex: the origin vertex of the half-edge
        """
        self.origin_vertex = origin_vertex
        # the twin half-edge
        self.twin_half_edge = None
        # the next half-edge along the face boundary
        self.next_half_edge = None
        # the previous half-edge along the face boundary
        self.prev_half_edge = None
        # identity for the face on the left side of the edge, usually none, need updated from additional function
        self.face = None
    
    def destination_vertex(self):
        """
        Return the destination vertex of the half-edge.
        Returns:
            The destination vertex of the half-edge.
        """
        return self.twin_half_edge.origin_vertex

    def __lt__(self, other):
        return self.origin_vertex < other.origin_vertex
    
    def __str__(self) -> str:
        if self.twin_half_edge is None:
            return f"HalfEdge({self.origin_vertex}, None)"
        basic_str=f"HalfEdge({(self.origin_vertex,self.destination_vertex())})"
        if self.next_half_edge or self.prev_half_edge is None:
            return basic_str
        basic_str +=f"twin_half_edge={(self.twin_half_edge.origin_vertex,self.twin_half_edge.destination_vertex())}, \n next_half_edge={(self.next_half_edge.origin_vertex,self.next_half_edge.destination_vertex())}, \n prev_half_edge={(self.prev_half_edge.origin_vertex,self.prev_half_edge.destination_vertex())}, \n face={self.face})"
        return basic_str
    
    def str(self) -> str:
        return f"HalfEdge({(self.origin_vertex,self.destination_vertex())})"
    
    def as_tuple(self) -> tuple[tuple[float,float],tuple[float,float]]:
        return (self.origin_vertex,self.destination_vertex())

class DCEL:
    def __init__(self):
        self.half_edges = []
        self.faces = []
        self.vertices = []

```

</TabItem>

</Tabs>

## Description

Doubly Connected Edge List (DCEL) is a data structure used to represent a planar graph. It consists of three list of half-edges, faces and vertices.

Each half-edge has an origin vertex, a twin half-edge, a next half-edge along the face boundary, a previous half-edge along the face boundary and a face.

The origin vertex of a half-edge is the vertex that the half-edge starts from. The destination vertex of a half-edge is the vertex that the half-edge ends at.

We may use a root edge for each new vertex, face created and iterate over the half-edges by calling next_half_edge and prev_half_edge for adjacent half-edges.

## References

- Computational Geometry: Algorithms and Applications

