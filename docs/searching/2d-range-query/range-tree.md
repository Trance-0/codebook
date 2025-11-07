---
sidebar_position: 2
---

# Range Tree

Range tree is an orthogonal range reporting/counting (rectangles)

- Query: returns the number of points in the range

Complexity:

2D: $O(log^2 n + m)$, with fractional cascading $O(log n + m)$; build $O(n log n)$; query $O(log^{k-1} n + m)$

Build time: $O(n log n)$

Query time: $O(log^{k-1} n + m)$ with $k$ the dimension of the points.

## Description

Hierarchical trees per dimension. Excellent for exact orthogonal range queries in low dimensions.

## Codes

### 1D Range Tree

```python
from bisect import bisect_left, bisect_right

class RangeTree:
    class _Node:
        __slots__ = ("dim", "minv", "maxv", "left", "right", "assoc", "vals", "pts")
        def __init__(self, dim, minv, maxv, left, right, assoc, vals, pts):
            self.dim = dim
            # stores the min vertex and max vertex
            self.minv = minv
            self.maxv = maxv
            self.left = left
            self.right = right
            # subtree handling remaining dimensions
            self.assoc = assoc      
            # only at last dimension: sorted values on this dim
            self.vals = vals        
            # only at last dimension: points sorted by this dim
            self.pts = pts         

    def __init__(self, points):
        if not points:
            self.d = 0
            self.root = None
            return
        self.d = len(points[0])
        for p in points:
            if len(p) != self.d:
                raise ValueError("All points must have the same dimension")
        self.root = self._build(points, 0)

    def _build(self, pts, dim):
        if not pts:
            return None
        pts_sorted = sorted(pts, key=lambda p: p[dim])
        minv, maxv = pts_sorted[0][dim], pts_sorted[-1][dim]

        if len(pts_sorted) == 1:
            left = right = None
        else:
            mid = len(pts_sorted) // 2
            left = self._build(pts_sorted[:mid], dim)
            right = self._build(pts_sorted[mid:], dim)

        if dim == self.d - 1:
            vals = [p[dim] for p in pts_sorted]
            assoc = None
            return self._Node(dim, minv, maxv, left, right, assoc, vals, pts_sorted)
        else:
            assoc = self._build(pts_sorted, dim + 1)
            return self._Node(dim, minv, maxv, left, right, assoc, None, None)

    def query(self, lows, highs):
        if self.root is None:
            return []
        if len(lows) != self.d or len(highs) != self.d:
            raise ValueError("Bounds must match point dimension")
        res = []
        self._query_node(self.root, lows, highs, res)
        return res

    def _query_node(self, node, L, H, out):
        if node is None:
            return
        d = node.dim
        if node.maxv < L[d] or node.minv > H[d]:
            return
        if L[d] <= node.minv and node.maxv <= H[d]:
            if d == self.d - 1:
                i = bisect_left(node.vals, L[d])
                j = bisect_right(node.vals, H[d])
                out.extend(node.pts[i:j])
            else:
                self._query_node(node.assoc, L, H, out)
            return
        self._query_node(node.left, L, H, out)
        self._query_node(node.right, L, H, out)

    def query_count(self, lows, highs):
        if self.root is None:
            return 0
        if len(lows) != self.d or len(highs) != self.d:
            raise ValueError("Bounds must match point dimension")
        return self._query_count_node(self.root, lows, highs)

    def _query_count_node(self, node, L, H):
        if node is None:
            return 0
        d = node.dim
        if node.maxv < L[d] or node.minv > H[d]:
            return 0
        if L[d] <= node.minv and node.maxv <= H[d]:
            if d == self.d - 1:
                i = bisect_left(node.vals, L[d])
                j = bisect_right(node.vals, H[d])
                return j - i
            else:
                return self._query_count_node(node.assoc, L, H)
            return
        return self._query_count_node(node.left, L, H) + self._query_count_node(node.right, L, H)
```

compact 2d version:

```python
class RangeTree2D:
    class _Node:
        __slots__ = ("x_min", "x_max", "y_vals", "y_points", "left", "right")
        def __init__(self, x_min, x_max, y_vals, y_points, left, right):
            self.x_min = x_min
            self.x_max = x_max
            self.y_vals = y_vals          # sorted list of y's
            self.y_points = y_points      # same points sorted by y (aligned with y_vals)
            self.left = left
            self.right = right

    def __init__(self, points):
        """
        points: iterable of (x, y). Static set (no updates).
        """
        pts = sorted(points, key=lambda p: p[0])
        self.root = self._build(pts)

    def _build(self, pts):
        if not pts:
            return None
        x_min, x_max = pts[0][0], pts[-1][0]
        y_sorted = sorted(pts, key=lambda p: p[1])
        y_vals = [p[1] for p in y_sorted]

        if len(pts) == 1:
            return self._Node(x_min, x_max, y_vals, y_sorted, None, None)

        mid = len(pts) // 2
        left = self._build(pts[:mid])
        right = self._build(pts[mid:])
        return self._Node(x_min, x_max, y_vals, y_sorted, left, right)

    def query(self, x1, x2, y1, y2):
        """
        Returns all points (x, y) with x1 <= x <= x2 and y1 <= y <= y2.
        """
        if self.root is None:
            return []
        if x2 < x1 or y2 < y1:
            return []

        res = []
        def dfs(node):
            if node is None:
                return
            if node.x_max < x1 or node.x_min > x2:
                return
            if x1 <= node.x_min and node.x_max <= x2:
                i = bisect_left(node.y_vals, y1)
                j = bisect_right(node.y_vals, y2)
                res.extend(node.y_points[i:j])
                return
            dfs(node.left)
            dfs(node.right)

        dfs(self.root)
        return res

    def count(self, x1, x2, y1, y2):
        """
        Counts points (x, y) in the rectangle [x1, x2] × [y1, y2].
        """
        if self.root is None or x2 < x1 or y2 < y1:
            return 0

        total = 0
        def dfs(node):
            nonlocal total
            if node is None:
                return
            if node.x_max < x1 or node.x_min > x2:
                return
            if x1 <= node.x_min and node.x_max <= x2:
                i = bisect_left(node.y_vals, y1)
                j = bisect_right(node.y_vals, y2)
                total += (j - i)
                return
            dfs(node.left)
            dfs(node.right)

        dfs(self.root)
        return total
```

The code above is usable and one typical usage can be found in leetcode 3027, even though it is not the optimal solution for problem like that.

The script is created to solve the problem above, which can be found in [leetcode 3027](https://leetcode.com/problems/find-the-number-of-ways-to-place-people-ii/description)

It works.