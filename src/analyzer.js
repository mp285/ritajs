import Util from "./util";
import LetterToSound from "./rita_lts";
import { part } from "./rita_dict";

const SP = ' ', E = '';

class Analyzer {

  constructor(parent) {
    this.cache = {};
    this.RiTa = parent;
    this.lts = undefined;
  }

  analyze(text, opts) {
    let words = this.RiTa.tokenizer.tokenize(text, { keepHyphen: true });
    let tags = this.RiTa.pos(text, opts); // don't fail if no lexicon
    let features = {
      phones: E,
      stresses: E,
      syllables: E,
      pos: tags.join(SP),
      tokens: words.join(SP)
    }

    for (let i = 0; i < words.length; i++) {  
      let { phones, stresses, syllables } = this.analyzeWord(words[i], opts);
      features.phones += SP + phones;
      features.stresses += SP + stresses;
      features.syllables += SP + syllables;
    }
    Object.keys(features).forEach(k => features[k] = features[k].trim()); // trim

    return features;
  }

  computePhones(word, opts) {
    if (!this.lts) this.lts = new LetterToSound(this.RiTa);
    return this.lts.buildPhones(word, opts);
  }

  phonesToStress(phones) {
    if (!phones) return;
    let stress = E, syls = phones.split(SP);
    for (let j = 0; j < syls.length; j++) {
      if (!syls[j].length) continue;
      stress += syls[j].includes('1') ? '1' : '0';
      if (j < syls.length - 1) stress += '/';
    }
    return stress;
  }

  analyzeWord(word, opts = {}) {  

    let RiTa = this.RiTa;

    // check the cache first
    let result = RiTa.CACHING && this.cache[word];
    if (typeof result === 'undefined') {

      let slash = '/', delim = '-';
      let lex = this.RiTa.lexicon();
      let phones = word, syllables = word, stresses = word;
      let rawPhones = lex.rawPhones(word, { noLts: true });

      if (!rawPhones) {
        if (word.includes("-")) {
          rawPhones = "";
          let arr = word.split("-");
          arr.forEach(p => {
            let part = this._computeRawPhones(p, lex);
            if (part && part.length > 0) {
              rawPhones += part + "-"
            }
          });
          rawPhones = rawPhones.substring(0, -1);
        } else {
          rawPhones = this._computeRawPhones(word, lex);
        }
      }

      if (rawPhones) {
        // compute phones, syllables and stresses
        let sp = rawPhones.replace(/1/g, E).replace(/ /g, delim) + SP;
        phones = (sp === 'dh ') ? 'dh-ah ' : sp; // special case
        let ss = rawPhones.replace(/ /g, slash).replace(/1/g, E) + SP;
        syllables = (ss === 'dh ') ? 'dh-ah ' : ss;
        stresses = this.phonesToStress(rawPhones);
      }

      result = { phones, stresses, syllables }; 
      Object.keys(result).forEach(k => result[k] = result[k].trim());

      // add to cache if enabled
      if (RiTa.CACHING) this.cache[word] = result;
    }

    return result;
  }

  _computeRawPhones(word, lex) {
    // if its a simple plural ending in 's',
    // and the singular is in the lexicon, add '-z' to end
    let rawPhones = undefined, RiTa = this.RiTa;
    if (!word.endsWith('s')) {
      let sing = RiTa.singularize(word);
      rawPhones = lex.rawPhones(sing, { noLts: true });
      rawPhones && (rawPhones += '-z'); // add 's' phone
    }

    // TODO: what about verb forms here?? TestCase?

    let silent = RiTa.SILENT || RiTa.SILENCE_LTS || (opts && opts.silent);

    // if no phones yet, try the lts-engine
    if (!rawPhones) {
      let ltsPhones = this.computePhones(word, opts);
      if (ltsPhones && ltsPhones.length) {
        if (!silent && lex.size()) {// && word.match(HAS_LETTER_RE)) {
          console.log("[RiTa] Used LTS-rules for '" + word + "'");
        }
        rawPhones = Util.syllablesFromPhones(ltsPhones);
      }
    }

    return rawPhones;
  }
}

const HAS_LETTER_RE = /[a-zA-Z]+/;

export default Analyzer;