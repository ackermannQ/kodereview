---
title: "[ReactJS] - Render props"
date: "2021-06-01T22:40:32.169Z"
description: Pass component as props to loosely-couple your application
---

If you don't know anything about react, I recommend you to read first my [Introduction to ReactJS](../introduction-to-reactjs/).  
By now you may have noticed that I'm sort of psycho when it comes to loosely-couple code. I'm sometimes a bit of an extremist but I know it so I'm trying to find a balance :).

## What's the idea?

In an application written in react, it happens that you want two similar components but with a slightly different behaviour. One way to address this is to use <a href="https://reactjs.org/docs/render-props.html" target="_blank" rel="nofollow noopener noreferrer">render props</a>.  
Basically, you will have a **base component** performing the general behaviour and the logic required, then you will pass inside a _props_ that would be an **other component**.  
At the end, you will have a base component, and two components based on this one but with two different render props used.  
Is it a bit blurry ? No worries, let's have an example!

## A Blog Example

Let's say you are designing a blog. The layout of the pages would be similar, like the header and the footer. However, the components used inside the body would be different.
Compare a Login and a Signing-up pages, they would share the header and footer but not their cores.

### Base component

```js
import React from "react"

interface ConnectionBaseProps {
  renderConnectionProps: JSX.Element;
}

export default function ConnectionBase(props: ConnectionBaseProps) {
  return (
    <>
      <Header />
      {props.renderConnectionProps}
      <Footer />
    </>
  )
}
```

The base component `ConnectionBase` will always render the header and the footer. The render props component allows to create the Login and SignUp component without duplicating most of the code.

### Login component

```js
import React from "react"
import ConnectionBase from "./ConnectionBase"

export default function Login() {
  return (
    <>
      <ConnectionBase renderConnectionProps={LoginForm} />
    </>
  )
}

function LoginForm() {
  /* Code to create a login form */
}
```

### SignUp component

```js
import React from "react"
import ConnectionBase from "./ConnectionBase"

export default function SignUp() {
  return (
    <>
      <ConnectionBase renderConnectionProps={SignUpForm} />
    </>
  )
}

function SignUpForm() {
  /* Code to create a login form */
}
```

## To conclude - The key takeaways

- Avoid code duplication by using render props
- Allows specialization easily
- The responsability is enclosed in each specialized component

#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)
