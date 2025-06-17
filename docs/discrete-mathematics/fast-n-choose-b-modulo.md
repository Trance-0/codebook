---
sidebar_position: 2
---

# Fast N Choose B Modulo

Fast N Choose B Modulo is a technique used to compute $\binom{n}{b} \mod m$ efficiently when $n$ and $b$ are large.

It states as follows:

## Codes

```python
def n_choose_k_modulo(n, k, m):
    """
    Fast N Choose B Modulo
    :param n: n
    :param k: k
    :param m: modulo m
    :return: n choose k modulo m
    """
    # Precompute A = (n-1)! / (n-1-k)!  A is n-1 choose k
    A = 1
    # avoid multiplication by zero
    if n-k-1!=0 and k!=0:
        for i in range(n-k, n):
            A = A * i % m
        # Compute k! properly (1*2*...*k), not including zero
        kf = 1
        for i in range(1, k+1):
            kf = kf * i % m
        
        # Modular inverse of kf via Fermat: kf^(M-2) mod M
        inv_kf = pow(kf, m-2, m)
        # print(A, kf, inv_kf)
        # Multiply A by inv_kf, then by B and m
        A = A * inv_kf % m
    return A
```

## Description

The proof directly follows from the definition of binomial coefficient.

### Run time analysis

The run time analysis is $O(n)$.

### Memory analysis

The memory analysis is $O(1)$.

## Extensions

No extensions found.

## Applications

### Leetcode 3405

- [Leetcode 3405](https://leetcode.com/problems/count-the-number-of-arrays-with-k-matching-adjacent-elements/description)

This problem is a good example of how to use the algorithm.

<details>
<summary>Intuition</summary>

First, fix the first element, then from the rest $n-1$ elements, we need to choose $k$ elements to be the same as the previous one.

That is $\binom{n-1}{k}$ ways.

Then, we need to choose $m-1$ elements from the rest $n-k-1$ elements to be different from the previous one.

</details>

<details>
<summary>Solution</summary>

```python
class Solution:
    def countGoodArrays(self, n: int, m: int, k: int) -> int:
        # combinatoric
        M = 10**9 + 7

        # Precompute A = (n-1)! / (n-1-k)!  A is n-1 choose k
        A = 1
        if n-k-1!=0 and k!=0:
            for i in range(n-k, n):
                A = A * i % M
            # Compute k! properly (1*2*...*k), not including zero
            kf = 1
            for i in range(1, k+1):
                kf = kf * i % M
            
            # Modular inverse of kf via Fermat: kf^(M-2) mod M
            inv_kf = pow(kf, M-2, M)
            # print(A, kf, inv_kf)
            # Multiply A by inv_kf, then by B and m
            A = A * inv_kf % M
        B = pow(m-1, n-1-k, M)

        # print(A,B)
        return m * A % M * B % M
```

</details>

## References

- [stackoverflow](https://stackoverflow.com/questions/10118137/fast-n-choose-k-mod-p-for-large-n)