---
title: "[JS] - Filter"
date: "2021-06-13T22:40:32.169Z"
description: 🕸

---

The purpose of the filter method is to apply a condition to an array and keep only the elements satisfying it.  

![Filter method in Javascript](/filter.png)

In this funny example, you have an array:

```ts
var food = [burger, frenchFries, chicken, popCorn];
```

By applying the filtering condition _"isVegetarian"_, you filter out every possible consumption of meat (burger and chicken), you end up with the filtered new array:

```ts
[frenchFries, popCorn];
```

## Example of use

Let's just use the example I used in in my <a href="../map" target="_blank" rel="nofollow noopener noreferrer">map</a> article.  
You work for LinkedIn and your manager need you to implement a function to filter out candidates with a particular profession.  
The data are:

```js
var candidates = [
  { firstName: "Chloe", lastName: "Ross", profession: "UX/UI Designer" },
  { firstName: "John", lastName: "Doe", profession: "Front End Engineer" },
  { firstName: "Jane", lastName: "Does", profession: "Back End Engineer" },
  { firstName: "Jill", lastName: "Hope", profession: "Back End Engineer" },
  { firstName: "Jake", lastName: "Guy", profession: "Back End Engineer" },
  { firstName: "Mike", lastName: "Gordon", profession: "QA Tester" },
];
```

So, let's filter the Back End Engineer candidates:

```js
var candidates = [
   { firstName: "Chloe", lastName: "Ross", profession: "UX/UI Designer" },
   { firstName: "John", lastName: "Doe", profession: "Front End Engineer" },
   { firstName: "Jane", lastName: "Does", profession: "Back End Engineer" },
   { firstName: "Jill", lastName: "Hope", profession: "Back End Engineer" },
   { firstName: "Jake", lastName: "Guy", profession: "Back End Engineer" },
   { firstName: "Mike", lastName: "Gordon", profession: "QA Tester" },
];

candidates = candidates.filter(candidate => candidate.profession === "Back End Engineer");

console.log(candidates);

```

Giving the following output (you can test it in your dev tool with F12 or <a href="https://playcode.io/new/" target="_blank" rel="nofollow noopener noreferrer">there</a>, by replacing the content of script.js):

```
[
  {
    "firstName": "Jane",
    "lastName": "Does",
    "profession": "Back End Engineer"
  },
  {
    "firstName": "Jill",
    "lastName": "Hope",
    "profession": "Back End Engineer"
  },
  {
    "firstName": "Jake",
    "lastName": "Guy",
    "profession": "Back End Engineer"
  }
]

```

The result is an array of objects following the condition providing in the filter method.  
You successfuly implemented the feature your manager asked for!

So, how do we implement filter?

> Contrary to <a href="../map" target="_blank" rel="nofollow noopener noreferrer">map</a>, you should not return anything in your callback since it's the condition that will filter the elements.



## Implementation
```js
function mapFunction(array, callback) {
  var newArray = [];

  for (let [index, value] of array.entries()) {
    if (callback(value, index, array)) {
      newArray.push(callback(value, index, array));
    }
  }

  return newArray;
}
```

Notice how the condition determine whether or not an element should be pushed in the array. This correspond to the filter.  


## To conclude - The key takeaways

- Filter filter each element of an array with a condition
- It takes in argument the current element of the array and the index/array are optionals
- If this paradigm intrigue you, check this article on [functional programming](../functional-programming)!


You can go on with my article on [reduce](../reduce) or check out this one on [map](../map).


#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)

