---
title: "[JS] - Map"
date: "2021-05-12T22:40:32.169Z"
description: 🗺️

---

Map is used for transforming an array into an other array.  
You can think of it exactly the same as for a mathematical (bijective... Drop this notion if it is not familiar) function, you have a set of departure and a set of destination:  

<img src="https://upload.wikimedia.org/wikipedia/commons/6/64/Codomain2.SVG" alt="functions" width="600"/>

For each element from you departure set, you will associate an element of the destination set. The function (the arrow) is exactly the map function in Javascript.  

An other funny way to understand the use of map is:  

![map](./map.png)

To begin, you have raw material, but by applying a certain function (cook), you will have a transformed version of your array.  

> It's crucial to understand that map returns an array and you have to return each element to append them in this array.


## Example of use

Let say you work for LinkedIn and your manager need you to implement some kind of function to return only the last name and the current profession of candidates.  
We are working on an array of objects:

```js
var candidates = [
   { firstName: 'Chloe', lastName: 'Ross', profession: 'UX/UI Designer' },
   { firstName: 'John', lastName: 'Doe', profession: 'Front End Engineer' },
   { firstName: 'Jane', lastName: 'Does', profession: 'Back End Engineer' },
   { firstName: 'Mike', lastName: 'Gordon', profession: 'QA Tester' }
];

```

The implementation using map would look like:

```js
var candidates = [
  { firstName: "Chloe", lastName: "Ross", profession: "UX/UI Designer" },
  { firstName: "John", lastName: "Doe", profession: "Front End Engineer" },
  { firstName: "Jane", lastName: "Does", profession: "Back End Engineer" },
  { firstName: "Mike", lastName: "Gordon", profession: "QA Tester" },
];

var mapped_candidates = candidates.map((candidate) => {
   return candidate.lastName + ": " + candidate.profession;
});

console.log(mapped_candidates);

```


Giving the following output (you can test it in your dev tool with F12 or <a href="https://playcode.io/new/" target="_blank" rel="nofollow noopener noreferrer">there</a>, just replace the content of script.js):

```
["Ross: UX/UI Designer" ,
"Doe: Front End Engineer" ,
"Does: Back End Engineer" ,
"Gordon: QA Tester"]

```

There are some things to unpack concerning the map function applied to our candidates array. The syntax of map is:

```js
var newArray = array.map(callback [, thisArg]);
```


and the parameters of the callback:

```js
var newArray = array.map((currentValue, index, array) => {
   // Doing some operations, like getting the candidate name and profession
   
   return something; /* As I explained, map returns an array so this is MANDATORY */
});                  /* otherwise you would have a bunch of undefined elements */

```

- currentValue is the current value we are iterating on
- index is the index of this value (optional)
- array is the array on which the map method is called (optional)

The optionals arguments are sometimes used in particular situations.

In our case, we want our mapped array to be stored in mapped_candidates:

```js
var mapped_candidates = ...
```

Then, we call the map method on the array of objects:

```js
var mapped_candidates = candidates.map(...);
```

As explained, we have to create a callback to perform the operation, in our case getting the names and professions of our candidates:  
Each element (candidate) is accessible because the first argument precised is the current value of our candidates array.

```js
var mapped_candidates = candidates.map(candidate => {
  return candidate.lastName + ": " + candidate.profession; // We just concatenate strings
});

console.log(mapped_candidates);
```

Now, you should better understand **map** and now we are going to see the implementation (one at least) of this function.  
This is actually a very good way to be sure you understood the underlying concept of this method. 

## Implementation

```js
function mapFunction(array, callback) {
   var newArray = [];

   for(let [index, value] of array.entries()) {
      newArray.push(callback(value, index, array));
   }

   return newArray;
}

```

Do you see now the importance of returning in your callback?

The code itself is straightforward, mapFunction takes in argument an array and a callback.  
Then, we create the newArray to store the results of our callback and would be returned.  
Using the array.entries() method, we get the index and the value of the array we are performing the mapping on and we apply the callback on each element, then push it into the newArray.  
Finally, the newArray with the callback applied on each element is returned.

## To conclude - The key takeaways

- Map does a transformation on each element of an array
- When implementing the callback inside, don't forget to **return**
- It takes in argument the current element of the array and the index/array are optionals 
- You can go further with the [filter](../filter) and [reduce](../reduce) methods
- If this paradigm intrigue you, check this article on [functional programming](../functional-programming)!

#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)

