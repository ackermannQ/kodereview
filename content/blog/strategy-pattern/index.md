---
title: The Strategy Pattern
date: "2021-05-30T22:40:32.169Z"
description: The Strategy pattern explained
---

This pattern is widely used in order to separate what may change in an application from what should stay the same.

# Theory - Use case

More detail on what I just said above

# Implementation - Example
## Bad implementation

Let’s say you work for Amazon, you are working on the backend, more specifically on the checkout part.  
You may have built an Article class looking like :  

![bad implementation](./badImpl_articleClass.png)

The article has a name, a price and you can’t get this attributes or pay.  
However you could encounter a problem if you would like to give to the customer the opportunity to pay with different means (Credit card or Paypal).  
One way to fix this issue would be to use inheritence, by making the Article class abstract (and the pay method) and implementing:  

![bad implementation](./badImpl_articleCardClass.png)

This implementation would work, the issue here is you would have to create the same amount of classes corresponding to each payment method with their own specificities. Besides, adding such things as expiration date or cryptogram not related to an Article is a bad practice.  

## Using the strategy pattern


# To conclude - The key takeaways
