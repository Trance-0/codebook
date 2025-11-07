---
sidebar_position: 2
---

# Mono Queue and Mono Stack

## Mono stack

A mono stack is a stack that only allows the elements to be pushed in decreasing/increasing order.

This structure is useful when the increment/decrement of the elements is the only thing we are caring about.

For example, when we use interval editing to construct the array, we only care about the increment/decrement of the elements.

Since craving a hole is equivalent to create a new heap.

## Applications

### Monostack

### Leetcode 1526

- [Leetcode 1526](https://leetcode.com/problems/minimum-number-of-increments-on-subarrays-to-form-a-target-array/)

<details>
<summary>Intuition</summary>

We only need to care about the increment/decrement of the elements, so we can use a mono stack to keep track of the elements that are not yet filled.

</details>

<details>
<summary>Solution</summary>

```python
class Solution:
    def minNumberOperations(self, target: List[int]) -> int:
        # use mono stack
        st=[0]
        res=0
        for i in target:
            if i==st[-1]:
                continue
            elif i<st[-1]:
                while i<=st[-1]:
                    st.pop()
                st.append(i)
            else:
                res+=i-st[-1]
                st.append(i)
        return res
```
</details>