const Util = require("./util");

class Lexicon {

  constructor(parent, dict) {
    this.RiTa = parent;
    this.data = dict;
    this.lexWarned = false;
    this.analyzer = parent.analyzer;
  }

  hasWord(word, fatal) {
    if (!word || !word.length) return false;
    return this._dict(fatal).hasOwnProperty(word.toLowerCase());
  }

  alliterations(theWord, opts = {}) {

    this.parseArgs(opts);

    // only allow consonant inputs
    if (this.RiTa.isVowel(theWord.charAt(0))) {
      if (!opts.silent && !this.RiTa.SILENT) console.warn
        ('Expects a word starting with a consonant, got: ' + theWord);
      return [];
    }

    const dict = this._dict(true), words = Object.keys(dict);
    const fss = this._firstStressedSyl(theWord);
    if (!fss) return [];

    const phone = this._firstPhone(fss), result = [];

    // make sure we parsed first phoneme
    if (!phone) {
      if (!opts.silent && !this.RiTa.SILENT) console.warn
        ('Failed parsing first phone in "' + theWord + '"');
      return result;
    }

    let _silent = opts.silent;
    opts.silent = true; // auto-silent

    //et analyzer = this.RiTa.analyzer();

    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      // check word length and syllables
      if (word === theWord || !this.checkCriteria(word, dict[word], opts)) {
        continue;
      }
      let data = dict[word];
      if (opts.targetPos) {
        word = this.matchPos(word, data, opts);
        if (!word) continue;
        // Note: we may have changed the word here (e.g. via conjugation)
        // and it is also may no longer be in the dictionary
        if (word !== words[i]) data = dict[word];
      }

      // TODO: use 'data' here unless we've changed 
      // to a new word not in dict
      let c2 = this._firstPhone(this._firstStressedSyl(word));
      if (phone === c2) result.push(word);

      if (result.length === opts.limit) break;
    }
    opts.silent = _silent;
    return result;
  }

  rhymes(theWord, opts = {}) {

    this.parseArgs(opts);

    if (!theWord || !theWord.length) return [];

    const dict = this._dict(true), words = Object.keys(dict);
    const phone = this._lastStressedPhoneToEnd(theWord);

    if (!phone) return [];

    let _silent = opts.silent;
    opts.silent = true;

    let result = [];
    //analyzer = this.RiTa.analyzer();

    for (let i = 0; i < words.length; i++) {

      let word = words[i];
      let data = dict[word];

      // check word length and syllables
      if (word === theWord || !this.checkCriteria(word, data, opts)) {
        continue;
      }

      if (opts.targetPos) {
        word = this.matchPos(word, data, opts);
        if (!word) continue;
        // Note: we may have changed the word here (e.g. via conjugation)
        // and it is also may no longer be in the dictionary
        if (word !== words[i]) data = dict[word];
      }

      // recompute phones if not in dict (see note above)
      let phones = data ? data[0] : this.rawPhones(word);

      // check for the rhyme
      if (phones.endsWith(phone)) result.push(word);

      if (result.length === opts.limit) break;
    }
    opts.silent = _silent;
    return result;
  }

  randomWord(opts = {}) {

    opts.minLength = opts.minLength || 4; // not 3
    this.parseArgs(opts);

    const dict = this._dict(true);
    const words = Object.keys(dict);
    const ran = Math.floor(this.RiTa.random(words.length));

    let _silent = opts.silent;
    opts.silent = true; // auto-silent

    for (let k = 0; k < words.length; k++) {
      let j = (ran + k) % words.length;
      let word = words[j], rdata = dict[word];
      if (!this.checkCriteria(word, rdata, opts)) continue;
      if (!opts.targetPos) return word // done if no pos to match

      let result = this.matchPos(word, rdata, opts, true);
      if (result) return result;
    }

    opts.silent = _silent; // reset

    throw Error('No random word with options: ' + JSON.stringify(opts));
  }

  spellsLike(word, opts = {}) {
    if (!word || !word.length) return [];
    opts.type = 'letter';
    return this.similarByType(word, opts);
  }

  soundsLike(word, opts = {}) {
    if (!word || !word.length) return [];
    opts.type = "sound";
    return (opts.matchSpelling) ?
      this.similarBySoundAndLetter(word, opts)
      : this.similarByType(word, opts);
  }

  search(regex, opts = {}) {  // SYNC:

    let dict = this._dict(true);
    let words = Object.keys(dict);

    if (typeof regex === 'string') {
      if (opts.type === 'stresses' && /^[01]+$/.test(regex)) {
        /* if we have a stress string without slashes, add them
           010 -> 0/1/0, ^010$ -> ^0/1/0$, etc. */
        regex = regex.replace(/(?<=[01])([01])/g, "/$1");
        //console.log(regex);
      }
      regex = new RegExp(regex);
    }
    else if (typeof regex === 'object' && (!(regex instanceof RegExp))) {
      opts = regex;  //single argument which is opts
      regex = undefined;
    }
    // else it is a regex object

    this.parseArgs(opts);

    let result = [], _silent = opts.silent;
    opts.silent = true;

    for (let i = 0; i < words.length; i++) {

      let word = words[i], data = dict[word];
      if (!this.checkCriteria(word, data, opts)) continue;

      if (opts.targetPos) {
        word = this.matchPos(word, data, opts);
        if (!word) continue;
        // Note: we may have changed the word here (e.g. via conjugation)
        // and it is also may no longer be in the dictionary
        if (word !== words[i]) data = dict[word];
      }

      if (regex) {
        if (opts.type === 'stresses') {
          let phones = data ? data[0] : this.rawPhones(word);
          let stresses = this.analyzer.phonesToStress(phones);
          if (regex.test(stresses)) {
            result.push(word);
          }
        }
        else if (opts.type === 'phones') { // TODO: Test *****
          let phones = data ? data[0] : this.rawPhones(word);
          phones = phones.replace(/1/g, '').replace(/ /g, '-');// + ' ';
          if (regex.test(phones)) result.push(word);
        }
        else {
          if (regex.test(word)) result.push(word);
        }
      }
      else {
        result.push(word);
      }

      if (result.length === opts.limit) break;
    }

    opts.silent = _silent; // reset
    return result;
  }

  isAlliteration(word1, word2) {
    this._dict(true); // throw if no lexicon
    if (!word1 || !word2 || !word1.length) return false;
    let c1 = this._firstPhone(this._firstStressedSyl(word1)),
      c2 = this._firstPhone(this._firstStressedSyl(word2));
    return c1 && c2 && !this.RiTa.isVowel(c1.charAt(0)) && c1 === c2;
  }

  isRhyme(word1, word2) {
    if (!word1 || !word2 || word1.toUpperCase() === word2.toUpperCase()) {
      return false;
    }
    this._dict(true); // throw if no lexicon
    if (this.rawPhones(word1) === this.rawPhones(word2)) {
      return false;
    }
    let p1 = this._lastStressedVowelPhonemeToEnd(word1),
      p2 = this._lastStressedVowelPhonemeToEnd(word2);
    return p1 && p2 && p1 === p2;
  }

  size() {
    let dict = this._dict(false);
    return dict ? Object.keys(dict).length : 0;
  }

  //////////////////////////// helpers /////////////////////////////////

  similarByType(theWord, opts) { // quite slow

    this.parseArgs(opts);

    const dict = this._dict(true);
    const words = Object.keys(dict);
    const input = theWord.toLowerCase();
    const matchSound = opts.type === 'sound'; // default: letter
    const variations = [input, input + 's', input + 'es'];
    const phonesA = matchSound ? this._toPhoneArray(this.rawPhones(input)) : input;
    //const analyzer = this.RiTa.analyzer();

    if (!phonesA) return result;

    let result = [], minVal = Number.MAX_VALUE;
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      let data = dict[word];
      if (!this.checkCriteria(word, data, opts)) continue;
      if (variations.includes(word)) continue;

      if (opts.targetPos) {
        word = this.matchPos(word, data, opts);
        if (!word) continue;
        // Note: we may have changed the word here (e.g. via conjugation)
        // and it is also may no longer be in the dictionary
        if (word !== words[i]) data = dict[word];
      }

      let phonesB = word;
      if (matchSound) {
        let phones = data ? data[0] : this.rawPhones(word);
        phonesB = phones.replace(/1/g, '').replace(/ /g, '-').split('-');
      }

      // TODO: optimise?
      let med = this.minEditDist(phonesA, phonesB);

      // found something even closer
      if (med >= opts.minDistance && med < minVal) {
        minVal = med;
        result = [word];
      }
      // another best to add
      else if (med === minVal && result.length < opts.limit) {
        result.push(word);
      }
    }

    return result.slice(0, opts.limit);
  }

  matchPos(word, rdata, opts, strict) {

    let posArr = rdata[1].split(' ');

    // check the pos here (based on strict flag)
    if (!posArr.includes(opts.targetPos) || (strict && opts.targetPos !== posArr[0])) {
      return;
    }

    // we've matched our pos, pluralize or inflect if needed
    let result = word;
    if (opts.pluralize) { // looking for an 'nns'
      if (word.endsWith("ness") || word.endsWith("ism")) return;

      result = this.RiTa.pluralize(word);
      if (!RiTa.isNoun(result)) return; // make sure its still a noun
    }
    else if (opts.conjugate) { // inflect
      result = this.reconjugate(word, opts.pos);
    }

    // verify we haven't changed syllable count
    if (result !== word) {
      if (opts.numSyllables) {

        // TODO: use rdata here if possible
        let syls = this.analyzer.analyzeWord(result, SILENT).syllables;
        let num = syls.split(this.RiTa.SYLLABLE_BOUNDARY).length;

        // reject if syllable count has changed
        if (num !== opts.numSyllables) return;
      }
      // reject if length no longer matches
      if (result.length < opts.minLength || result.length > opts.maxLength) {
        return;
      }
    }

    return result;
  }

  checkCriteria(word, rdata, opts) {

    // check word length
    if (word.length > opts.maxLength) return false;
    if (word.length < opts.minLength) return false;

    // match numSyllables if supplied
    if (opts.numSyllables) {
      let syls = rdata[0].split(' ').length;
      if (opts.numSyllables !== syls) return false;
    }
    return true;
  }

  // Handles: pos, limit, numSyllables, minLength, maxLength
  // potentially appends pluralize, conjugate, targetPos
  parseArgs(opts) {

    opts.minDistance = opts.minDistance || 1;
    opts.numSyllables = opts.numSyllables || 0;
    opts.maxLength = opts.maxLength || Number.MAX_SAFE_INTEGER;
    opts.minLength = opts.minLength || 3;
    opts.limit = opts.limit || 10;

    // handle part-of-speech
    let tpos = opts.pos || false;
    if (tpos && tpos.length) {
      opts.pluralize = (tpos === "nns");
      opts.conjugate = (tpos[0] === "v" && tpos.length > 2);
      if (tpos[0] === "n") tpos = "nn";
      else if (tpos[0] === "v") tpos = "vb";
      else if (tpos === "r") tpos = "rb";
      else if (tpos === "a") tpos = "jj";
    }

    opts.targetPos = tpos;
  }

  reconjugate(word, pos) {
    const RiTa = this.RiTa;
    switch (pos) {
      /*  VBD 	Verb, past tense
          VBG 	Verb, gerund or present participle
          VBN 	Verb, past participle
          VBP 	Verb, non-3rd person singular present
          VBZ 	Verb, 3rd person singular present */
      case 'vbd':
        return RiTa.conjugate(word, {
          number: RiTa.SINGULAR,
          person: RiTa.FIRST,
          tense: RiTa.PAST
        });
      case 'vbg':
        return RiTa.presentPart(word);
      case 'vbn':
        return RiTa.pastPart(word);
      case 'vbp':
        return word;
      case 'vbz':
        return RiTa.conjugate(word, {
          number: RiTa.SINGULAR,
          person: RiTa.THIRD,
          tense: RiTa.PRESENT
        });
      default: throw Error('Unexpected pos: ' + pos);
    }
  }

  similarBySoundAndLetter(word, opts) {

    //const actualLimit = opts.limit;

    opts.type = 'letter';
    //opts.limit = Number.MAX_SAFE_INTEGER;
    const simLetter = this.similarByType(word, opts);
    if (simLetter.length < 1) return [];

    opts.type = 'sound';
    //opts.limit = Number.MAX_SAFE_INTEGER;
    const simSound = this.similarByType(word, opts);
    if (simSound.length < 1) return [];

    return this._intersect(simSound, simLetter).slice(0, opts.limit);
  }

  isMassNoun(w, pos) {
    return w.endsWith("ness")
      || w.endsWith("ism")
      || pos.indexOf("vbg") > 0
      || Util.MASS_NOUNS.includes(w);
  }

  _toPhoneArray(raw) {
    return raw.replace(/[01]/g, '').replace(/ /g, '-').split('-');
  }

  _firstPhone(rawPhones) {
    if (rawPhones && rawPhones.length) {
      let phones = rawPhones.split(this.RiTa.PHONE_BOUNDARY);
      if (phones) return phones[0];
    }
  }

  _intersect(a1, a2) {
    return [a1, a2].reduce((a, b) => a.filter(e => b.includes(e)))
  }

  _lastStressedPhoneToEnd(word) {
    if (word && word.length) {
      let raw = this.rawPhones(word);
      if (raw) {
        let idx = raw.lastIndexOf(this.RiTa.STRESS);
        if (idx >= 0) {
          let c = raw.charAt(--idx);
          while (c != '-' && c != ' ') {
            if (--idx < 0) return raw; // single-stressed syllable
            c = raw.charAt(idx);
          }
        }
        return raw.substring(idx + 1);
      }
    }
  }

  _lastStressedVowelPhonemeToEnd(word) {
    if (word && word.length) {
      let raw = this._lastStressedPhoneToEnd(word);
      if (raw) {
        let idx = -1, syllables = raw.split(' ');
        let lastSyllable = syllables[syllables.length - 1];
        lastSyllable = lastSyllable.replace('[^a-z-1 ]', '');
        for (let i = 0; i < lastSyllable.length; i++) {
          let c = lastSyllable.charAt(i);
          if (this.RiTa.VOWELS.includes(c)) {
            idx = i;
            break;
          }
        }
        return lastSyllable.substring(idx);
      }
    }
  }

  _firstStressedSyl(word) {
    let raw = this.rawPhones(word);
    if (raw) {
      let idx = raw.indexOf(this.RiTa.STRESS);
      if (idx >= 0) {
        let c = raw.charAt(--idx);
        while (c != ' ') {
          if (--idx < 0) {  // single-stressed syllable
            idx = 0;
            break;
          }
          c = raw.charAt(idx);
        }
        let firstToEnd = idx === 0 ? raw : raw.substring(idx).trim();
        idx = firstToEnd.indexOf(' ');
        return idx < 0 ? firstToEnd : firstToEnd.substring(0, idx);
      }
    }
  }

  _posData(word, fatal) {
    let rdata = this._lookupRaw(word, fatal);
    if (rdata && rdata.length === 2) return rdata[1];
  }

  _posArr(word, fatal) {
    let rdata = this._lookupRaw(word, fatal);
    if (rdata && rdata.length === 2) return rdata[1].split(' ');
  }

  _lookupRaw(word, fatal) {
    word = word && word.toLowerCase();
    return this._dict(fatal)[word];
  }

  rawPhones(word, opts) {

    let noLts = opts && opts.noLts;
    let fatal = opts && opts.fatal;
    let rdata = this._lookupRaw(word, fatal);
    if (rdata && rdata.length) return rdata[0];

    if (!noLts) {
      let phones = this.RiTa.analyzer.computePhones(word);
      return Util.syllablesFromPhones(phones); // TODO: bad name
    }
  }

  _dict(fatal) {
    if (!this.data) {
      if (fatal) throw Error('This function requires a lexicon, make sure you'
        + ' are using the full version of rita (see ' + this.RiTa.CDN + ')');
      if (!this.lexWarned) {
        console.warn('[WARN] no lexicon was loaded, feature-analysis'
          + ' and POS-tagging may be incorrect.');
        this.lexWarned = true;
      }
    }
    return this.data || {};
  }

  // med for 2 strings (or 2 arrays)
  minEditDist(source, target) {

    let cost; // cost
    let i, j, matrix = []; // matrix
    let sI; // ith character of s
    let tJ; // jth character of t

    // Step 1 ----------------------------------------------

    for (i = 0; i <= source.length; i++) {
      matrix[i] = [];
      matrix[i][0] = i;
    }

    for (j = 0; j <= target.length; j++) {
      matrix[0][j] = j;
    }

    // Step 2 ----------------------------------------------

    for (i = 1; i <= source.length; i++) {
      sI = source[i - 1];

      // Step 3 --------------------------------------------

      for (j = 1; j <= target.length; j++) {
        tJ = target[j - 1];

        // Step 4 ------------------------------------------

        cost = (sI == tJ) ? 0 : 1;

        // Step 5 ------------------------------------------
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost);
      }
    }

    // Step 6 ----------------------------------------------

    return matrix[source.length][target.length];
  }
}

const SILENT = { silent: true };

module && (module.exports = Lexicon);
