---
title: "[Design] - The Observer Pattern"
date: "2021-05-10T22:40:32.169Z"
description: I can see you :)
---

How does it work ?  
An __observer__ _registers_ with a __subject__ (or __observable__) which would notify the observer when its state updates.

> This pattern is used when the change of state in one object would impact other objects.

## Theory - Use case

Simply put, you have an object that live its life, it's the **Observable**. At some point, it has some data that would interest other objects, the **Observers**.  
In order to become an observer of the observable, an object has to *register*. Then, the observable will send the data to the observers:  

![Observer pattern diagram](./ObserverDiagram.png) 


This defines a one-to-many dependency between objects so that when one of them (the observable) changes, all of its dependents (the observers) are notified and updated automatically.

![Observer pattern](./ObserverPatternClass.png)

The subject can register, remove or notify observers and the only purpose of the observer is to ... Observe. And **update** once it get notified.  
As we are aiming to get more flexibility, we can notice that we have loosely coupled objects: the subject only knows that the Observer implement the IObserver interface.  

## Implementation - Example

## To conclude - The key takeaways

An observer pattern defines a one-to-many dependency between objects so that when one of them (the observable) changes, all of its dependents (the observers) are notified and updated automatically.  
This is used when the change of state in one object would impact other objects.  
Put differently, it's only when the subject changes that it notifies the observers. You don't have to implement a method that continually fetch the data.  

- It's easy to add, remove or replace observers at the runtime
- Don't have to change or modify the observable to add new types of observers
- Observers and observable are reusable
- Loose coupling: a change of implementation in one of them doesn't affect the other one

> Great flexibility

- You could also check out my article on [design Patterns](../design-patterns/)
#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)

