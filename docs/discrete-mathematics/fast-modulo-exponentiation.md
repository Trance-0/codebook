---
sidebar_position: 1
---

# Fast Modulo Exponentiation

via binary exponentiation

Fast Modulo Exponentiation is a technique used to compute $a^b \mod m$ efficiently when $b$ is large.

It states as follows:

## Codes

This should be the section that should be filled first; it follows my naming convention and some standard coding. It should have at least runnable Python code so that I can copy and paste efficiently.

```python
def fast_modulo_exponentiation(a, b, m):
    """
    Fast Modulo Exponentiation
    :param a: Base
    :param b: Exponent
    :param m: Modulo
    :return: a^b % m
    """
    result = 1
    while b > 0:
        if b % 2 == 1:
            result = (result * a) % m
        a = (a * a) % m
        b //= 2
    return result
```

## Description

The proof is as follows:

Since any number can be represented as a sum of powers of 2, we can write $b$ as a sum of powers of 2.

$$
b = 2^k_1 + 2^k_2 + \cdots + 2^k_n
$$

where $k_1, k_2, \cdots, k_n$ are the powers of 2 that make up $b$. $k_1 > k_2 > \cdots > k_n$.

## Extensions

This can be used to compute n choose k modulo m efficiently. But for most of the time, we use Fermat's little theorem to compute the modulo inverse for $k!$.

## Applications

Missing

## References

I cannot find the original source of the algorithm that helped me understand it.

- [cp-algorithms](https://cp-algorithms.com/algebra/binary-exp.html)