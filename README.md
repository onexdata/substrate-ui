# substrate-ui
An ultra-simple universal substrate-based UI rendering system

A super simple successor to nano-var-template, a 6-year-old ultra simple, 42-line templating system that supports functions, variables and components and anything else you could ever imagine by simply building more and more complex substrates on top of completely separate ones.

While Nano-var-template requires templates to look something like this:

```text
Hello ${user.name}!
#{uppercase:welcome ${user.role}}
@{Button:label=Click Me,style=${theme.primary}}
@{Icon:type=star}
```

Substrate UI just does one more pre-step that builds that template from a standard vue-template syntax:

This (standard vue template syntax)...
```html
Hello {{user.name}}!!!!! {{ upper(`welcome to the demo ${var.user.role}`) }} <button label="Click Me" :style="theme.primary"/> <icon type="star"/?
```
becomes this (nano-var-template syntax)...

```text
Hello ${user.name}!!!!! #{uppercase:welcome to the demo ${user.role}} @{Button:label=Click Me,style=${theme.primary}} @{Icon:type=star} 
```

... which has a very clear and concise substrate references:

1. ${} are variables (processed 1st)
2. @{} are functions (processed 2nd)
3. #{} are components (processed 3rd)

Now, ANY vue <template> section that has the proper variables and functions and components provided, and avoids any standard html (i.e. uses <section> instead of span, and <row> instead of <div>, etc., and section and row components are also provided, can now be rendered, in full, completely, the same way, anywhere, as long as a super simple Substrate UI component, which is just nano-var-template with a single extra step, is implemented!

We're talking a full universal template render system that looks the same everywhere, with variables, methods and events, all in under 300 lines of nessisary code, and platforms that can't handle certain components will just render some pre-defined fallback.

Now, you can build your app in Substrate UI, and write your PWA in React, Vue, Svelt, raw HTML, even Swift, Kotlin or even BrightScrupt (Roku TVs) or your own simple embedded render system! It doesn't get any simpler than that!

You also have full separation of concerns:

Variables are isolated and injected into the view first, then functions only operate on raw injected data, as if they were hard-coded, then components only operate on the functions raw injected data that took in raw injected data... everything is now completely static, and your UI components don't need to worry about reactivity issues or anything else that may plague other UI framework paradigms.

## Trade offs

1. Pro: Completely static reasoning per rendered frame
2. Pro: Completely secure (because everything is reduced to static strings, there is no "living" substrate to mount an attack. The template takes nothing for granted at all)
3. Pro: Completely isolated (you could even allow your apps customers to build Substrate Templates - if you don't provide the variables/functions/components, they can't use them!)
4. Pro: Simple enough that even a 2b param local LLM can create substrate page layouts
5. Pro: Secure and isolated enough that you can fully implement Server-side-UI without forcing your developers to learn something new.
6. Pro: Lets complexities like component galeries, page builders, dashboards, AI-designed creatives, become one-line-of-code implementations.
7. Pro: Works everywhere a substrate UI renderer has been implemented (and these implementations are so simple, LLMs can do them for you - so even if it doesn't exist, an LLM can slap it together in 20 minutes for you).
8. Con: Slightly slower and less robust than native rendering (i.e., don't build your core components in Substrate, instead, use Substrate for layouts, pages, and high-level functionality. Substrate is not a full UI framework, it doesn't have syntax sugar, it doesn't have looping or slots, it is a framework to allow you to do incredibly advanced things you can't do, or can't securely do with any other template system, like server-side rendering, or fully AI generated rendering with orders of magnitude fewer errors), however, it is NOT a UI framework; just a substrate on top of your UI framework, hence the name substrate :)