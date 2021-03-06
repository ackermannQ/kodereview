---
title: "[Design Patterns] - The Strategy Pattern"
date: "2021-04-29T22:40:32.169Z"
description: Let's be strategic for a while!
---

As explained in the [Design Patterns](../design-patterns/) article, the purpose is for your system to be ready for changes. Tight coupling would require hard work to implement new features.  
The strategy pattern is widely used in order to separate what may change in an application from what should stay the same.  
It's also one of the simplest pattern to learn so let's get a grasp on it!

## Theory
### Main idea
The idea is to take what is going to change in your software, encapsulate and isolate it.  
This would help you have a hierarchy between your classes and objects, without duplicating code between similar ones.  
At the end of the day the methods that are similar but show different behaviours should vary independently than the other aspects of the client.  

_A client is anything, it could be objects, services ... whatever_ 


The main pitfall there is failing to identify the logic that should be separated from your clients. Worst case scenario, you use inheritence to create classes that are different but sharing common methods.  
This is called code duplication and this is bad, _bad_, __bad__.

### Use case
Let’s say you work for a company selling online articles - like Amazon. You are currently working on the backend, more specifically on the checkout part.  
You have built an Article class looking like:  

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

This would be unmaintainable and we would have to duplicate heavily our code.  
Let's see in practice how we could solve this problem using the strategy pattern.

## Implementation - Example
### Bad implementation

![bad implementation](./badImpl_articleCardClass.png)

As explained, the implementation would work, the issue here is you would have to create the same amount of classes corresponding to each payment method with their own specificities. Besides, adding such things as expiration date or cryptogram not related to an Article is a bad practice.  

### Using the strategy pattern

What was the principle of the strategy pattern ?  
"Defines a family of algorithms, encapsulate each one, and make them interchangeable."  

<img src="./goodImpl_diagram.png" alt="Using the strategy pattern" height="1200"/>

The interface IPayment and it implementation are thought as a family of algorithms.  
The client (Article and inherited classes) makes use of this family of algorithms.  

The key is using __composition__ instead of inheriting the "behaviour" payment because it ultimately gives more flexibility to your system.  


Let's see what would the implementation (in Java) looks like:  

__IPayment__:  
```java
public interface IPayment {
   void pay(float price);
}

```
Simple interface with a pay method. We will use it to define a family of algorithms.

__CardPayment__:
```java
public class CardPayment implements IPayment {

   private String cardNumber;
   private String cryptogram;
   private String expirationDate;

   public CardPayment(String cardNumber, String cryptogram, String expirationDate) {
      this.cardNumber = cardNumber;
      this.cryptogram = cryptogram;
      this.expirationDate = expirationDate;
   }

   @Override
   public void pay(float price) {
      System.out.println("Currently paying with a credit card: "+ price  + " $");
   }

}

```
This class implements the IPayment interface, and has all the specificities related to its specific behaviour (cardNumber, cryptogram, expirationDate). 

__PaypalPayment__
```java
public class PaypalPayment implements IPayment {

   private String id;
   private String password;

   public PaypalPayment(String id, String password) {
      this.id = id;
      this.password = password;

   }

   @Override
   public void pay(float price) {
      System.out.println("Currently paying with Paypal: " + price + " $");
   }

}

```

This class implements the IPayment interface, and has all the specificities related to its specific behaviour (id and password).

We took what would change in our system (the payment method) and encapsulated it. Now, it's going to be easier to chose the payment method we want, but first let's see how is implemented the Article class.

**Article**:
```java
public class Article {

   private String name;
   private float price;
   IPayment paymentBehaviour;

   public Article(String name, float price) {
      this.name = name;
      this.price = price;
   }

   public String getName() {
      return this.name;
   }

   public float getPrice() {
      return this.price;
   }

   public float setPaymentBehaviour(IPayment payment) {
      paymentBehaviour = payment;
   }


   public void performPayment() {
      float price = this.getPrice();
      paymentBehaviour.pay(price); /* This is called delegation.*/
   } /* It allows you to not precise here the method that would actually do the payment */

}

```


**Book**:
```java
public class Book extends Article {

    public Book(String name, float price) {
        super(name, price);
        paymentBehaviour = new CardPayment("12345678978975", "000", "01/01");
    }

}

```
This is in the Book class that the payment behaviour is described (here it's the CardPayment method). This is powerful, the paymentBehaviour is set in the class but the card payment behaviour is not currently set there, it lives somewhere else. Thus, you just need to implement as many new payment methods as you like and call them where you need too.


**Movie**:

```java
public class Movie extends Article {

    public Movie(String name, float price) {
        super(name, price);
        paymentBehaviour = new PaypalPayment("85211", "pass");
    }

}

```
If we wouldn't have used the strategy pattern and have wanted to pay with a card here too, we would have had to duplicate code or inherit it. Then we may have passed unnecessarily this method to childs classes that we should then have overrided it... and so. You probably now have the feeling that this would be very complicated and things should be well designed from the begining.  

If you wonder what is the method:  

```java
public float setPaymentBehaviour(IPayment payment) {
   paymentBehaviour = payment;
}

```

It actually allows you to set dynamically at the runtime a payment method.  
Finally, we have the following program running:

**Main**:
```java
public class Main {
   public static void main(String[] args) {

      Book book = new Book("Book", 35);
      Movie movie = new Movie("Movie", 9);

      System.out.println("I'm buying a: " + book.getName());
      book.performPayment();

      System.out.println("I'm buying a: " + movie.getName());
      movie.performPayment();

      book.setPaymentBehaviour(new PaypalPayment("85211", "pass"));
      System.out.println("I changed the payment method for buying a: " + book.getName());
      book.performPayment();
   }

}

```

Giving the following output:
```
I'm buying a: Book
Currently paying with a card: 35.0 $

I'm buying a: Movie
Currently paying with Paypal: 9.0 $

I changed the payment method for buying a: Book
Currently paying with Paypal: 35.0 $

```

## To conclude - The key takeaways
As we saw in this example, a bad implementation would have forced a developer to duplicate code and make future evolutions of the software very difficult.  
By encapsulating the behaviour in a family of algorithms, the changing part of the software remains independent from the client, providing great flexibility!  

- Identify the logic that should be separated from your clients
- Define a family of algorithms, encapsulate each one, and make them interchangeable
- You probably noticed the use of the word "_behaviour_" all along the article, that's because the strategy pattern is a __behavioral__ pattern
- When you have different algorithms or methods for the same task, it would be small hint to implement a strategy pattern
- Your program can decide the implementation to use at the runtime
- <a href="https://www.youtube.com/watch?v=v9ejT8FO-7I" target="_blank" rel="nofollow noopener noreferrer">This link</a> could show you a use of this pattern with Ducks (<a href="https://upload.wikimedia.org/wikipedia/commons/b/b1/Male_mallard_standing.jpg" target="_blank" rel="nofollow noopener noreferrer">yeah, ducks!</a>)
- Full project <a href="https://github.com/ackermannQ/design_patterns/tree/master/Strategy_Article/src" target="_blank" rel="nofollow noopener noreferrer">available here</a>
#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)
