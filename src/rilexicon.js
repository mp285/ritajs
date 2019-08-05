const Utils = require("./utils");

let RiTa;

class RiLexicon {

  constructor(parent, dict) {
    RiTa = parent;
    this.dict = dict;
  }

  alliterations(word) {
    return [];
  }

  hasWord(word) {
    word = word ? word.toLowerCase() : '';
    return this.dict.hasOwnProperty(word) || _isPlural(word);
  }

  rhymes(word) {
    return [];
  }

  similarBy(word) {
    return [];
  }

  words() {
    return Object.keys(this.dict);
  }

  randomWord() {

    let i, j, rdata, numSyls;
    let words = Object.keys(this.dict);
    let ran = Math.floor(RiTa.random(0, words.length));
    let pluralize = false;
    let found = false;
    let a = arguments;

    let isNNWithoutNNS = (w, pos) => (w.endsWith("ness") ||
      w.endsWith("ism") || pos.indexOf("vbg") > 0);

    if (typeof a[0] === "string") {

      a[0] = trim(a[0]).toLowerCase();

      pluralize = (a[0] === "nns");

      if (a[0] === "n" || a[0] === "nns") a[0] = "nn";
      else if (a[0] === "v") a[0] = "vb";
      else if (a[0] === "r") a[0] = "rb";
      else if (a[0] === "a") a[0] = "jj";

    }

    switch (a.length) {

    case 2: // a[0]=pos  a[1]=syllableCount

      for (i = 0; i < words.length; i++) {
        j = (ran + i) % words.length;
        rdata = this.data[words[j]];
        numSyls = rdata[0].split(SP).length;
        if (numSyls === a[1] && a[0] === rdata[1].split(SP)[0]) {
          if (!pluralize) return words[j];
          else if (!isNNWithoutNNS(words[j], rdata[1])) {
            return RiTa.pluralize(words[j]);
          }
        }
      }
      //warn("No words with pos=" + a[0] + " found");
      break;

    case 1:

      if (typeof a[0] === 'string') { // a[0] = pos

        for (i = 0; i < words.length; i++) {
          j = (ran + i) % words.length;
          rdata = this.data[words[j]];
          if (a[0] === rdata[1].split(SP)[0]) {
            if (!pluralize) return words[j];
            else if (!isNNWithoutNNS(words[j], rdata[1])) {
              return RiTa.pluralize(words[j]);
            }
          }
        }

        //warn("No words with pos=" + a[0] + " found");

      } else {

        // a[0] = syllableCount
        for (i = 0; i < words.length; i++) {
          j = (ran + i) % words.length;
          rdata = this.data[words[j]];
          if (rdata[0].split(SP).length === a[0]) {
            return words[j];
          }
        }
      }
      break;

    case 0:
      return words[ran];
    }

    return E;
  }
}

function _isPlural(word) {

  if (Utils.NULL_PLURALS.applies(word))
    return true;

  var stem = RiTa.stem(word);
  if (stem === word) {
    return false;
  }

  var sing = RiTa.singularize(word);
  var data = this.data[sing];

  if (data && data.length === 2) {
    var pos = data[1].split(SP);
    for (var i = 0; i < pos.length; i++) {
      if (pos[i] === 'nn')
        return true;
    }

  } else if (word.endsWith("ses") || word.endsWith("zes")) {

    sing = word.substring(0, word.length - 1);
    data = this.data[sing];
    if (data && data.length === 2) {
      var pos = data[1].split(SP);
      for (var i = 0; i < pos.length; i++) {
        if (pos[i] === 'nn')
          return true;
      }
    }
  }
  return false;
}

module && (module.exports = RiLexicon);
