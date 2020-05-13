

# RiTa v2 (javascript)

## Developing
To build the library and run tests:
```
$ yarn install 
$ yarn compile
$ yarn test
```
&nbsp;

## API

**RiTa**
RiTa.VERSION
RiTa.alliterations()
RiTa.concordance()
RiTa.conjugate()
RiTa.hasWord()
RiTa.env()
RiTa.pastParticiple()
RiTa.phonemes()
RiTa.posTags()
RiTa.posTagsInline()
RiTa.presentParticiple()
RiTa.stresses()
RiTa.syllables()
RiTa.isAbbreviation()
RiTa.isAdjective()
RiTa.isAdverb()
RiTa.isAlliteration()
RiTa.isNoun()
RiTa.isPunctuation()
RiTa.isQuestion()
RiTa.isRhyme()
RiTa.isVerb()
RiTa.kwic()
RiTa.pluralize()
RiTa.random()
RiTa.randomOrdering()
RiTa.randomSeed()
RiTa.randomWord()
RiTa.rhymes()
RiTa.evaluate()
RiTa.similarBy()
RiTa.singularize()
RiTa.sentences()
RiTa.stem()
RiTa.tokenize()
RiTa.untokenize()
RiTa.words()

**RiGrammar**
load()
addRule()
expand()
expandFrom()
removeRule()
toString()

**RiMarkov**
RiMarkov.fromJSON()
addText()
addSentences()
generate()
generateSentences()
completions()
probability()
probabilities()
toJSON()
size()
toString()


## RiTaScript

### Choice

```
The weather was (sad | gloomy | depressed).  ->  The weather was gloomy. 
| I'm (very | super | really) glad to ((meet | know) you | learn about you).  ->  I'm very glad to know you. 
```

### Weighted Choice
```
The weather was (sad | gloomy [2] | depressed[4]).  ->  The weather was depressed. 
```

### Assignment
Basic assignments do not have output, they simply create or update a symbol

```
$desc=wet and cold
The weather was $desc  ->  The weather was wet and cold 
```

### Inline Assignment

Inline assignments create/modify a symbol _and_ output its contents

```
Jane was from [$place=(New York | Berlin | Shanghai)]. $place is cold and wet. 
     ->  Jane was from Berlin. Berlin is cold and wet.

$place=(New York | Berlin | Shanghai)`<br/>`$place is cold and wet in winter. 
     ->  Berlin is cold and wet in the winter.
    
In [$place=(New York | Berlin | Shanghai)] it is cold and wet in winter. 
     ->  In Berlin it is cold and wet in the winter.
```

<!--
### Choice

| | | 
|-|-|
| The weather was (sad &#124; gloomy &#124; depressed). | The weather was depressed. |
| I'm (very &#124; super &#124; really) glad to ((meet &#124; know) you &#124; learn about you). | I'm very glad to know you. |


### Weighted Choice
| | | 
|-|-|
| The weather was (sad &#124; gloomy [2] &#124; depressed[4]). | The weather was gloomy. |

### Assignment

Basic assignments do not have output, they simply create/update a symbol
| | | 
|-|-|
|$desc=wet and cold||
|The weather was $desc|The weather was wet and cold|

### Inline Assignment

Inline assignments create/modify a symbol _and_ output its contents

| | | 
|-|-|
| `Jane was from [$place=(New York | Berlin | Shanghai)]. $place is cold and wet.` | `Jane was from Berlin. Berlin is cold and wet.` |
| `$place=(New York | Berlin | Shanghai)`<br/>`$place is cold and wet in winter.` | `Berlin is cold and wet in the winter.` |
| `In [$place=(New York | Berlin | Shanghai)] it is cold and wet in winter.` | `In Berlin it is cold and wet in the winter.` |


```
Jane was from [$place=(New York | Berlin | Shanghai)]. 
$place is cold and wet in the winter.

$place=(New York | Berlin | Shanghai) 
$place is cold and wet in the winter.

$place=(New York | Berlin | Shanghai) is cold and wet in the winter.

In [$place=(New York | Berlin | Shanghai)], it is cold and wet in winter.

In [$place=(New York | Berlin | Shanghai) it is cold and wet in winter].

```
-->
### Symbols

```
$desc=dark and gloomy
The weather was $desc
```
&nbsp;&nbsp;&nbsp;&nbsp;or 
```
/* 'desc' defined in JS */
The weather was $desc
```

### Transforms

```
The group of boys (to run).conjugate().
How many (tooth | menu | child).pluralize() do you have?
How many (tooth | menu | child).pluralize().toUpper() do you have?

// Resolves choice without repeating
How many (tooth | menu | child).norepeat() do you have?

// Resolves choice in sequence
How many (tooth | menu | child).seq() do you have?
```

### Conditionals

```
// 'desc' can be defined in JS or RS */
{desc='party'} The party was happening
{desc='party', user=$john} The party was happening and John was wearing $John.color.
```
<!--
### Conditionals: If-else

```
{adj='positive'} The party was happening :: The party was not happening.
```
&nbsp;&nbsp;&nbsp;&nbsp;or 
```
{adj='positive'} The party was happening.
{adj!='positive'} The party was not happening.
```
<!--
### Labels
```
#Opening {
 The Fellow will be expected to teach one course. Apart from focusing on their own research and \
 teaching one course, the Fellow will be expected to give a presentation of their scholarship at the \
 Institute. The Fellow will also be expected to participate in the intellectual life of the community.
}

$Opening=(
 The Fellow will be expected to teach one course. Apart from focusing on their own research and \
 teaching one course, the Fellow will be expected to give a presentation of their scholarship at the \
 Institute. The Fellow will also be expected to participate in the intellectual life of the community.
)
```
