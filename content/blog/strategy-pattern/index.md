---
title: The Strategy Pattern
date: "2021-05-04T22:40:32.169Z"
description: The Strategy pattern explained
---

As explained in the [Design Patterns](../design-patterns/) article, the purpose is for your system to be ready for changes. Tight coupling would require hard work to implement something that would satisfy your customer request.  
This pattern is widely used in order to separate what may change in an application from what should stay the same.  
And it's also one of the simplest pattern to learn so let's get a grasp on our first design pattern.

## Theory
### Main idea
The idea is to take what is going to change in your software, encapsulate and isolate it.  
This would help you have a hierarchy between your classes and object, and not duplicate code between similar objects.  
At the end of the day your methods, that are similar but show different behaviours should vary independently than the other aspects of the client.  

_A client is anything, it could be objects, services ... whatever_ 


The main pitfall there is failing to identify the logic that should be separated from your clients. Worst case scenario, you use inheritence to create classes that are different but sharing common method.  
This is called code duplication and this is _bad_, bad, __bad__.

### Use case
Let’s say you work for a company selling online articles - like Amazon. You are currently working on the backend, more specifically on the checkout part.  
You may have built an Article class looking like :  

![bad implementation](./badImpl_articleClass.png)

The article has a name, a price and you can get its attributes or pay. Great!  

Now, what would happen if you decide that you need an other means to pay. Let's say you want to give the opportunity to your customer to buy an article using Paypal, how would you implement this logic ?

Well, you could abstract the Article class, along with the pay() method. You would then have two classes ArticleCard and ArticlePaypal.
The pay method in ArticleCard should take in argument:
- cardNumber
- expirationDate
- cryptogram

The pay method in ArticlePaypal should take in argument:
- id
- password

What if now, you would have a brand new e-payment method coming on the market that would require:
- id
- password
- creditCard

What if now, you would have an other card payment method, not with a credit card, but taking the same arguments:
- giftCardNumber
- expirationDate
- cryptogram

This would be unmaintenable and we would have to duplicate heavily our code.  
Let's see in practice how we could solve this problem using the strategy pattern.

## Implementation - Example
### Bad implementation

![bad implementation](./badImpl_articleCardClass.png)

As explained, the implementation would work, the issue here is you would have to create the same amount of classes corresponding to each payment method with their own specificities. Besides, adding such things as expiration date or cryptogram not related to an Article is a bad practice.  

### Using the strategy pattern

What was the principle of the strategy pattern ?  
"Defines a family of algorithms, encapsulate each one, and make them interchangeable."  

![Using the pattern strategy](./goodImpl_diagram.png)



```java
Fly fly = new Fly();
```

## To conclude - The key takeaways
