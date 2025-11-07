---
sidebar_position: 3
---

# Interval Tree

## Description

Interval tree is a data structure that can be used to solve interval query problems.

- Query: returns the number of overlaps with the query interval

Complexity:

$O(\log n)$ for query, $O(n \log n)$ for build

## Codes

> [!WARNING]
>
> The implementation belows does not use the self-balancing property of the interval tree. Worst case time complexity is $O(n^2)$.

<Tabs>
<TabItem value="Python" label="Python">

```python

class Interval:
    """
    Structure to represent an interval
    """
    def __init__(self, low: int, high: int):
        """
        Initialize the interval
        :param low: the low value of the interval
        :param high: the high value of the interval
        """
        self.low = low
        self.high = high

class Node:
    """
    Structure to represent a node in Interval Search Tree
    """
    def __init__(self, i: Interval):
        """
        Initialize the node
        :param i: the interval of the node
        """
        self.i = i
        # the maximum value of the interval
        self.max = i.high
        self.left = None
        self.right = None
        # internal property maintained along with the interval tree
        # sections belows could be removed if not needed
        self.interval_count = 1

def newNode(i: Interval) -> Node:
    """
    Create a new Interval Search Tree Node
    :param i: the interval of the node
    :return: the new node
    """
    temp = Node(Interval(i.low, i.high))
    return temp

def insert(root: Node, i: Interval) -> Node:
    """
    Insert the interval into the interval tree
    This is similar to BST Insert.  
    Here the low value of interval is used to maintain BST property
    :param root: the root of the interval tree
    :param i: the interval to insert
    :return: the node that the interval is inserted into
    """
    # Base case: Tree is empty, new node becomes root
    if root is None:
        return newNode(i)
        
    # Get low value of interval at root
    l = root.i.low
    
    # If root's low value is smaller, 
    # then new interval goes to left subtree
    if i.low < l:
        root.left = insert(root.left, i)
        
    # Else, new node goes to right subtree.
    else:
        root.right = insert(root.right, i)
        
    # Update the max value of this ancestor if needed
    if root.max < i.high:
        root.max = i.high

    # additional property to maintain the interval tree, expected to be O(1)
    # sections belows could be removed if not needed
    root.interval_count += 1

    return root

def isOverlapping(i1: Interval, i2: Interval) -> bool:
    """
    Check if two intervals overlap
    :param i1: the first interval
    :param i2: the second interval
    :return: True if the intervals overlap, otherwise False
    """
    if i1.low <= i2.high and i2.low <= i1.high:
        return True
    return False

def overlapSearch(root: Node, i: Interval) -> Interval:
    """
    Search for the interval in the interval tree
    :param root: the root of the interval tree
    :param i: the interval to search for
    :return: the node that overlaps with the interval, otherwise None
    """
    # Base Case, tree is empty
    if root is None:
        return None
        
    # If given interval overlaps with root
    if isOverlapping(root.i, i) is True:
        return root.i
        
    # If left child of root is present and max of left child is
    # greater than or equal to given interval, then i may
    # overlap with an interval is left subtree
    if root.left is not None and root.left.max >= i.low:
        return overlapSearch(root.left, i)
        
    # Else interval can only overlap with right subtree
    return overlapSearch(root.right, i)

def inorder(root: Node):
    """
    Inorder traversal of the interval tree
    :param root: the root of the interval tree
    """
    if root is None:
        return
    inorder(root.left)
    print("[" + str(root.i.low) + ", " + str(root.i.high) + "]" + " max = " + str(root.max))
    inorder(root.right)

```
</TabItem>
</Tabs>

## References

- [GeeksforGeeks](https://www.geeksforgeeks.org/dsa/interval-tree/)