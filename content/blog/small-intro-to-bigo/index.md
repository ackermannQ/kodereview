---
title: "[Data Structure] - Small intro to big O"
date: "2021-05-15T22:40:32.169Z"
description: Will you have the time to catch it all ? 
---

Time execution varies between computers, so instead of talking about seconds or miliseconds, we talk about complexity to describe how long or how much space would an algorithm take to be executed.

Big O notations are essentials because having performant algorithms means having a fast-responding software. Who knows, you might even get a [nice reward](https://www.pcgamer.com/rockstar-thanks-gta-online-player-who-fixed-poor-load-times-official-update-coming/) for optimizing an existing algorithm. [Full story there](https://nee.lv/2021/02/28/How-I-cut-GTA-Online-loading-times-by-70/).  

Just a bit of maths to get a feeling on big O meaning. It actually describes the limiting behavior of a function when the argument tends to a value or infinity.  
So, when you are saying O(N), you are actually saying, well my algorithm will take a number of steps that would be dominated by the linear function f(N) = N.  
Just another example an we will dive into big O notation applied to computer science.

```
f(x) = cos(x) 
g(x) = x
```

Now the cosinus function is taking values only between [-1; 1], whatever x is. At the contrary, when x grows toward infinity, it's taking larger values. So we can say that f is dominated by  g, written:

```
f(x) = O(g(x))
```

Here I will mainly focus on time complexity. I may update later this article to add the space complexities too.  

![Big O complexities](./complexity_chart.jpg)
*This graphic sum up common complexities of algorithms*
## O(1)
This is the basic big O notation, it corresponds to one operation.

``` java
int number = 0;
```

## O(N)
It correspond to N operations.  
Let say we have an array of length N:

```java

for (int i = 0; i < array.length; i++) {
   System.out.println(i);
}

```

The for loop iterates N times, thus this is a O(N) algorithm.

What would be the complexity of this algorithm ?  
We have two arrays (array1 and array2):

```java

for (int i = 0; i < array1.length; i++) {
   System.out.println(i);
}

for (int j = 0; j < array2.length; j++) {
   System.out.println(j);
}


```

Well, from the previous example, you would say that you have N operations for the array1 and N operations for the array2. Then the complexity would be O(2N).  
One rule of big O notation is to drop constants because they don't add any value to the global complexity, the complexity is then O(N).  

**Be careful!**: This reasoning is not entirely true. Here, we supposed that the two arrays were the same length (N) which is not necessarily the case!  

Actually, the best thing to do at a job interview is to suppose that the two arrays have a different lengths, lets call them N and M. Now, the complexity of this algorithm is O(N + M).  
Usually, the examiner will provide a information on N and M, like M < N. Thus, an other rule apply: only conserve the dominant term when additioning complexities.

Finally the complexity is O(N).

> Drop the constants

> Conserve the dominant term when additioning complexities

Exemple:

```java 
String[] names = {"Mike", "John", "Tim", "Mag"};

for (int i = 0; j < names.length; i++) {
   System.out.println(names[i]);
}


```
Mix of O(1) and O(N)
## O(log(N))
Details and example


## O(N²)
Details and example


## O(2^N)
Details and example


## O(N!)
Details and example


## To conclude - The key takeaways

#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)
