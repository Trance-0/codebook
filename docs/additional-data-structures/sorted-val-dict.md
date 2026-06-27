---
sidebar_position: 8
---

# Sorted Value Dictionary

A sorted value dictionary is a data structure that allows you to store key-value pairs and retrieve the values in sorted order.

## Implementation

```python
import collections
from heapq import heappush, heappop

class DoubleHeap:
    # used for return the max k sum for length n array
    def __init__(self, k: int, verbose: bool = False):
        # stores the entry count for each element
        self.cnt = collections.defaultdict(int)
        # the maximum size of the topk
        self.k = k
        # tracking the topk sum
        self.topks = 0
        # stores the top k elements
        self.topk = []
        # stores the entry count for each elements in topk
        self.topke = dict()
        # stores the least n-k elements
        self.lesk = []
        # stores the entry count for each elements in lesk
        self.leske = dict()
        # verbose mode
        self.verbose = verbose
    
    def __cleanheap(self,hp,hpe,r:int = 1):
        # update stale ranks, update at most n times. r=-1 means reverse order
        # after cleaning, the top element must be latest
        if self.verbose:
            print(f"cleaning heap: {hp}, {hpe}, {r}")
        if len(hp)>0:
            hv,hk=hp[0]
            while r*hv!=self.cnt[r*hk]:
                heappop(hp)
                if r*hk in hpe:
                    # dec stale entry
                    hpe[r*hk] -= 1
                    # delete stale record
                    if hpe[r*hk] == 0:
                        del hpe[r*hk]
                if hp: 
                    hv,hk=hp[0]
                else:
                    break

    def __popheap(self,hp,hpe,r:int = 1)->tuple[int,int]:
        # r is sign for hv, hk, r=1 for topk, r=-1 for lesk
        # all inputs are expected to be normalized, and the output is also normalized
        hv,hk=heappop(hp)
        hpe[r*hk] -= 1
        if hpe[r*hk] == 0:
            del hpe[r*hk]
        return r*hv,r*hk

    def __pushheap(self,hv,hk,hp,hpe,r:int = 1):
        # r is sign for hv, hk, r=1 for topk, r=-1 for lesk
        # all inputs are expected to be normalized
        heappush(hp,(r*hv,r*hk))
        if hk not in hpe:
            hpe[hk] = 1
        else:
            hpe[hk] += 1

    def __balance(self):
        self.__cleanheap(self.lesk,self.leske,-1)
        self.__cleanheap(self.topk,self.topke,1)
        # when we can add the number to the topk, we do it
        while len(self.leske)>0:
            lv,lk=self.lesk[0]
            lv,lk=-lv,-lk
            if self.verbose:
                print(f"topk: {self.topk}, topke: {self.topke}, lesk: {self.lesk}, leske: {self.leske}, len(topk)==0: {len(self.topk)==0}, (topk[0][0]==lv and topk[0][1]>lk): {''if len(self.topk)==0 else (self.topk[0][0]==lv and self.topk[0][1]>lk)}, (topk[0][0]<lv): {''if len(self.topk)==0 else self.topk[0][0]<lv}")
            if len(self.topke)<=self.k or (self.topk[0][0]==lv and self.topk[0][1]<lk) or self.topk[0][0]<lv:
                self.__popheap(self.lesk,self.leske,-1)
                self.__pushheap(lv,lk,self.topk,self.topke,-1)
                # add the sum to the topks
                self.topks+=lv*lk
                if len(self.topke)>self.k:
                    tv,tk=self.__popheap(self.topk,self.topke,1)
                    self.__pushheap(self.lesk,self.leske,-1)
                    self.topks-=tv*tk
                    break
            else:
                break
            # renew entry in lesk
            self.__cleanheap(self.lesk,self.leske,-1)
            # renew entry in topk
            self.__cleanheap(self.topk,self.topke,1)
        if self.verbose:
            print(f"after insertion, topk: {self.topk}, cnt: {self.cnt}, topke: {self.topke}, topks: {self.topks}")

    def add(self, num: int):
        self.cnt[num] += 1
        if num in self.topke:
            self.topks += self.cnt[num]
            self.__pushheap(self.cnt[num],num,self.topk,self.topke,1)
        else:
            self.__pushheap(self.cnt[num],num,self.lesk,self.leske,-1)
        self.__balance()

    def remove(self, num: int):
        self.cnt[num] -= 1
        if num in self.topke:
            self.topks -= self.cnt[num]
            if self.cnt[num] == 0:
                del self.topke[num]
        else:
            if self.cnt[num] == 0:
                del self.leske[num]
        self.__balance()

    def get_topk_sum(self):
        return self.topks
```


Solution:

```python
class Solution:
    def findXSum(self, nums: List[int], k: int, x: int) -> List[int]:
        dh = DoubleHeap(k)
        res = []
        for i,e in enumerate(nums):
            dh.add(e)
            if i>=k:
                dh.remove(nums[i-k])
            if i>=k-1:
                res.append(dh.get_topk_sum())
        return res
```

