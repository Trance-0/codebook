---
sidebar_position: 7
---

# Line Segment Intersection

This is a classical problem in computational geometry. Given a list of line segments, determine if any two of them intersect.

The simplified 1D version is seen all over the place. A key idea of it is the line sweep algorithm.

## Line Sweep

First, we sort the line segments by their starting points. Then, we sweep a vertical line from left to right. As we sweep, we maintain a data structure to store the active line segments.

## Applications

### Leetcode 1353

- [Leetcode 1353](https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended/)

This problem is a good example of using 1D line sweep.

<details>
<summary>Intuition</summary>

Notice that what ever you do, you must always select the event that can be attended with earliest ending time.

</details>

<details>
<summary>Solution</summary>

Here we use `lp` to denote the current line location $x$ axis. We use `pq` to store the active events. `ie` is the index of the current unchecked event. `cnt` is the number of events that can be attended.

```python
class Solution:
    def maxEvents(self, events: List[List[int]]) -> int:
        events.sort()
        # print(events)
        # line-sweep!!!
        lp=ie=cnt=0
        pq=[]
        n=len(events)
        while ie<n or pq:
            if len(pq)==0:
                lp=events[ie][0]
            # insert
            while ie<n and events[ie][0]<=lp:
                # insert end, start
                heappush(pq,(events[ie][1],events[ie][0]))
                ie+=1
            # pop expired event
            while len(pq)>0 and pq[0][0]<lp:
                heappop(pq)
            # attend the optimal event
            if len(pq)>0:
                heappop(pq)
                cnt+=1
            lp+=1
        return cnt

```

</details>

## References

- [Computational Geometry](https://cimec.org.ar/foswiki/pub/Main/Cimec/GeometriaComputacional/DeBerg_-_Computational_Geometry_-_Algorithms_and_Applications_2e.pdf)