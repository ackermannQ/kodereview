---
title: "[Procedural Content Generation] - Introduction"
date: "2022-03-20T22:40:32.169Z"
description: A passioning matter
---

I've been astounded by the presentation [Kate Compton](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwiJrKHFsN_2AhXBzYUKHXFQAscQwqsBegQIBBAB&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DWumyfLEa6bU&usg=AOvVaw07wg2OV1K1dVOGEMYpZAFj) made at the 2017 GDC.

She explained very simply the classification of PCG algorithms with several examples that made me wonder about this area I didn't know at all.

Then, I came accross a [blog post](https://galaxykate0.tumblr.com/post/139774965871/so-you-want-to-build-a-generator) she mentioned at the conference and decided to dive into the references she gave at the end.

I will write a serie of posts where I will go through the chapters of the [PCG in Games](http://pcgbook.com/) which is an online book written by Noor Shaker, Julian Togelius, and Mark J. Nelson. I do like the academic approach of the book and it feels like science and game development are merging somewhere I can't really see yet.

Being curious by nature, I feel it could benefit me a lot to write about my experience along the way.

## PCG simply put

Procedural Content Generation (or PCG) is the field of using algorithms to randomize stuff, make them look realistic and put then in front of a player.

"Randomize" is a hudge approximation of "using a variaty of methods and algorithms, mostly based on nature behavior, to simulate what's happening in real-life".

"Stuff" actually means anything. A generator can be implemented for images, 3D, AI, terrains, music, story and so on.

"Make them look realistic" is the correlated of the previous assertions. The goal is to find balance between realistic and performance and this is where to me, mathematics, physics and biology intersect.

Then, we need to "Put them in front of the player", but also evaluate how credible they are and how much they benefit the user experience.

## Book summary

These are the book's chapters. For each one I will try to tackle the issue while explaining briefly the main idea:

1. ~~Introduction~~ -> Let's consider this one done here

- [The search-based approach](../pcg-searched-based)
- Constructive generation methods for dungeons and levels
- Fractals, noise and agents with applications to landscapes and textures
- Grammars and L-systems with applications to vegetation and levels
- Rules and mechanics
- Planning with applications to quests and story
- ASP with applications to mazes and levels
- Representations for search-based methods
- The experience-driven perspective
- Mixed-initiative content creation
- Evaluating content generators

## List of github repositories

- [The search-based approach](https://github.com/ackermannQ/DungeonGenerator)
- [Constructive generation methods for dungeons and levels]()
- [Fractals, noise and agents with applications to landscapes and textures]()
- [Grammars and L-systems with applications to vegetation and levels]()
- [Rules and mechanics]()
- [Planning with applications to quests and story]()
- [ASP with applications to mazes and levels]()
- [Representations for search-based methods]()
- [The experience-driven perspective]()
- [Mixed-initiative content creation]()
- [Evaluating content generators]()

#### Any remarks ?

Make a [pull request](https://github.com/ackermannQ/quentinackermann) or open an [issue](https://github.com/ackermannQ/quentinackermann/issues)!  
Don't know how to do it ? Check out this [very well explained tutorial](https://opensource.com/article/19/7/create-pull-request-github)
