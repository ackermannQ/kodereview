---
title: "[C#] - A Concrete Strategy Pattern"
date: "2021-07-27T22:40:32.169Z"
description: 🧙


---

I tackled this issue [there](../strategy-pattern/).  
I'm having a side project were I need to implement a wizard that can cast some spells. These spells could be from different element (fire and ice for instance).  
I will show you how I can make a nice use of the strategy pattern to add this behaviour to my wizard.


## The interface corresponding to the strategy
A wizard should be able to cast different spells with different elements. However, I don't want to define *each* possible spell possible in the wizard class.  
Instead, I would create an interface **IElement** that would require to implement: CastSpell().  

**IElement:**  
```csharp
namespace Wizard
{
   interface IElement
   {
      public void CastSpell();
   }
}
```

## The classes implementing the wanted behaviour
Then, the two classes that implements this behaviour are Fire and Ice.  

**Fire:**
```csharp
using System;

namespace Wizard
{
   class Fire : IElement
   {
      public void CastSpell()
      {
         Console.WriteLine("Casting Fire tornado, makes great damage but cost a lot of mana");
      }
   }
}

```

**Ice:**
```csharp
using System;

namespace Wizard
{
   class Ice: IElement
   {
      public void CastSpell()
      {
         Console.WriteLine("Casting Ice spikes, makes little damage but cost 1 mana");
      }
   }
}

```

In these classes, particular behaviour can be designed: a fire spell that would do great damage but also cost more to the wizard.  
At the contrary, an ice spell would make less damage but cost less.  

## Wizard class

**Wizard:**
```csharp
namespace Wizard
{
   class Wizard
   {
      public string name;
      public int healthPoint;
      public int mana = 10;

      public Wizard(string name, int healthPoint)
      {
         this.name = name;
         this.healthPoint = healthPoint;
      }

      public void Castpell(IElement element)
      {
         element.CastSpell();
      }
   }
}

```

A wizard is a simple object with a name, life points and mana. As you can see, no particular implementation of CastSpell lives here, because it's a behaviour encapsulated elsewhere that is delegated with the:  

```csharp
element.CastSpell();
```

The pattern is successfully implemented!

## Main

**Program.cs:**
```csharp
namespace Wizard
{
   class Program
   {
      static void Main(string[] args)
      {
         Wizard Donyos = new Wizard("Donyos", 100);

         Donyos.Castpell(new Fire());
         Donyos.Castpell(new Ice());
      }
   }

}

```

Producing the following output:

```
Casting Fire tornado, makes great damage but cost a lot of mana
Casting Ice spikes, makes little damage but cost 1 mana
```



## Resources

- [Strategy Pattern](../strategy-pattern/)
- [Design Patterns](../design-patterns/)


## To conclude - The key takeaways

- You can find the full project <a href="https://github.com/ackermannQ/wizard" target="_blank" rel="nofollow noopener noreferrer">here</a>

#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)

