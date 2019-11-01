const RiTa = require('./rita_api');

// TODO:
// invertProbabilities arg
// allow for real-time weighting ala memo
// multiple tokens in startToken arg

const SSDLM = '<s/>';
const MI = Number.MAX_SAFE_INTEGER;
const MAX_GENERATION_ATTEMPTS = 500;

class Markov {

  constructor(n) {

    this.n = n;
    this.input = [];
    this.root = new Node(null, 'ROOT');
    this.maxLengthMatchingSequence = 0;
  }

  loadTokens(tokens) {

    this._treeify(tokens);
    this.input.push(...tokens);
  }

  loadSentences(sentences) {

    let tokens = [];

    // add a new token for each sentence start
    for (let i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].replace(/\s+/, ' ').trim();
      let words = RiTa.tokenize(sentence);
      tokens.push(SSDLM, ...words);
    }

    this._treeify(tokens);
    this.input.push(...tokens.filter(t => t !== SSDLM));
  }

  generateSentences(num, { minTokens = 5, maxTokens = 35, startToken, maxLengthMatch } = {}) {

    //console.log(num + " {" + minTokens + "," + maxTokens + "," + startToken + "}");

    let node, sent, tries = 0;
    let result = [];

    while (tries < MAX_GENERATION_ATTEMPTS) {

      if (result.length == num) return result;

      // choose a sentence start, according to probability
      sent = sent || [node = startToken ? this.root.child(SSDLM)
        .child(startToken) : this.root.child(SSDLM).select()];

      if (!node) throw Error(startToken ? "No start token"
        + " found: " + startToken : "Invalid state: " + this);

      if (node.isLeaf()) {
        node = this._search(sent);
        // we ended up at a another leaf
        if (!node || node.isLeaf()) {
          if (sent.length < minTokens || !this._validateSentence(result, sent)) {
            tries++;
          }
          sent = null;
          continue;
        }
      }

      // select the next child, according to probabilities
      node = node.select();

      // do we have a candidate for the next start?
      if (node.token === SSDLM) {

        // its a sentence, or we restart and try again
        if (sent.length < minTokens || !this._validateSentence(result, sent)) {
          tries++;
        }
        sent = null;
        continue;
      }

      // add new node to the sentence
      sent.push(node);

      // check if we've exceeded max-length
      if (sent.length > maxTokens) {
        //console.log("FAIL #"+tries+" (maxlen): " + this._flatten(sent));
        sent = null;
        tries++;
      }
      //console.log("tries="+tries);
    }

    throw Error('\nRiMarkov failed to complete after ' + tries +
      ' tries and ' + result.length + ' successful generation(s)' +
      ' - you may need to add more text to the model\n');
  }

  generateSentence({ minTokens = 5, maxTokens = 35, startToken = undefined, maxLengthMatch = MI } = {}) {

    return this.generateSentences(1, ...arguments)[0];
  }

  generateTokens(num, { startToken, maxLengthMatch } = {}) {

    let tokens, tries = 0;

    while (tries < MAX_GENERATION_ATTEMPTS) {

      tokens = tokens || [startToken ?
        this.root.child(startToken) : this.root.select()];

      let parent = this._search(tokens);

      if (!parent || parent.isLeaf()) { // try again

        tokens = null;
        tries++;  // give up
        continue;
      }

      //node = parent.select();
      let node = this._chooseChild(parent, tokens, maxLengthMatch);

      if (!node) {

        tokens = null;
        tries++; // give up
        continue;
      }

      if (tokens.push(node) >= num) {
        return this._nodesToTokens(tokens);
      }
    }

    let msg = '\n\nFailed after ' + tries + ' tries - ';
    msg += 'you may need to add more text to the model';
    if (maxLengthMatch) msg += " or reduce the maxLengthMatch parameter";
    throw Error(msg);
  }

  generateTokensX(num, { startToken, maxLengthMatch = Number.MAX_VALUE } = {}) {

    console.log('generateTokens.startToken', startToken);
    let tokens, tries = 0;

    // if (typeof startToken === 'string') {
    //   if (startToken.includes(' ')) {
    //     startToken = RiTa.untokenize(startToken);
    //   }
    //   else {
    //     startToken = [startToken];
    //   }
    // }

    while (tries < MAX_GENERATION_ATTEMPTS) {

      //tokens = tokens || [startToken ? this._search(startToken) : this.root.select()];

      // for (var i = 0; i < startToken.length - 1; i++) {
      //   console.log('startToken[' + i + ']=' + startToken[i]);
      //   tokens[tokens.length] = startToken[i];
      // }
      // console.log('generateTokens.tokens1:');
      // for (var i = 0; i < tokens.length; i++) {
      //   console.log('  #'+i, tokens[i].token);
      // }
      //
      // tokens.push(this._search(startToken));
      // console.log('generateTokens.tokens2', tokens);
      // return;
      console.log('generateTokens.tokens', this._nodesToTokens(tokens));
      //return;
      let parent = this._search(tokens);

      if (!parent || parent.isLeaf()) { // try again

        tokens = null;
        tries++;  // give up
        continue;
      }

      //node = parent.select();
      let node = this._chooseChild(parent, tokens, maxLengthMatch);

      if (!node) {
        tokens = null;
        tries++; // give up
        continue;
      }

      if (tokens.push(node) >= num) return this._nodesToTokens(tokens);
    }

    let msg = '\n\nFailed after ' + tries + ' tries - ';
    msg += 'you may need to add more text to the model';
    if (maxLengthMatch) msg += " or reduce the maxLengthMatch parameter";

    throw Error(msg);
  }

  // TODO: add-arg: start
  generateUntil(regex, { minLength = 1, maxLength = Number.MAX_VALUE } = {}) { // add-arg: start

    // minLength = minLength || 1;
    // maxLength = maxLength || Number.MAX_VALUE;
    let tries = 0;
    OUT: while (++tries < MAX_GENERATION_ATTEMPTS) {

      // generate the min number of tokens
      let tokens = this.generateTokens(minLength);

      // keep adding one and checking until we pass the max
      while (tokens.length < maxLength) {

        let mn = this._search(tokens);

        if (!mn || mn.isLeaf()) continue OUT; // hit a leaf, restart

        mn = mn.select();

        tokens.push(mn.token);

        // check against our regex
        if (mn.token.search(regex) > -1) return tokens;
      }
    }

    throw Error('\n' + "RiMarkov failed to complete after " + tries + " attempts." +
      "You may need to add more text to your model..." + '\n');
  }

  getCompletions(pre, post) {

    let tn, node, atest, nexts, result = [];

    if (post) { // fill the center

      if (pre.length + post.length > this.n) {
        err('Sum of pre.length && post.length must be < N, was ' +
          (pre.length + post.length));
      }

      if (!(tn = this._search(pre))) return;

      nexts = tn.childNodes();
      for (let i = 0; i < nexts.length; i++) {

        node = nexts[i];
        atest = pre.slice(0);
        atest.push(node.token);
        post.map(function(p) {
          atest.push(p);
        });

        if (this._search(atest)) result.push(node.token);
      }

      return result;

    } else { // fill the end

      let hash = this.getProbabilities(pre);
      return Object.keys(hash).sort(function(a, b) {
        return hash[b] - hash[a];
      });
    }
  }

  getProbabilities(path) {

    path = (typeof path === 'string') ? [path] : path;

    if (path.length > this.n) {
      path = path.slice(Math.max(0, path.length - (this.n - 1)), path.length);
    }

    let tn, probs = {};
    if (!(tn = this._search(path))) return {};

    let nexts = tn.childNodes();
    for (let i = 0; i < nexts.length; i++) {
      if (nexts[i]) {
        probs[nexts[i].token] = nexts[i].probability();
      }
    }

    return probs;
  }

  getProbability(data) {

    if (data && data.length) {
      let tn = (typeof data === 'string') ?
        this.root.child(data) : this._search(data);
      if (tn) return tn.probability();
    }

    return 0;
  }

  toString() {
    return this.root.asTree().replace(/{}/g, '');
  }

  size() {

    return this.root.childCount();
  }

  ////////////////////////////// end API ////////////////////////////////

  _treeify(tokens) {

    for (let i = 0; i < tokens.length; i++) {
      let node = this.root,
        words = tokens.slice(i, i + this.n);
      for (let j = 0; j < words.length; j++) {
        node = node.addChild(words[j]);
      }
    }
  }

  _flatten(nodes) {

    return RiTa.untokenize(this._nodesToTokens(nodes));
  }

  _validateSentence(result, nodes) {

    let sent = this._flatten(nodes);

    if (!sent || !sent.length) {
      console.log("Bad validate arg: ", nodes);
      return false;
    }

    if (sent[0] !== sent[0].toUpperCase()) {
      console.log("Skipping: bad first char in '" + sent + "'");
      return false;
    }

    if (!sent.match(/[!?.]$/)) {
      //console.log("Skipping: bad last char='"
      //+ sent[sent.length - 1] + "' in '" + sent + "'");
      return false;
    }

    if (result.indexOf(sent) > -1) {
      //console.log("Skipping: duplicate sentence: '" + sent + "'");
      return false;
    }

    result.push(sent);

    return true;
  }

  _nodesToTokens(nodes) {
    return nodes.map(n => n.token);
  }

  /*
   * Follows 'path' (using the last n-1 tokens) from root and returns
   * the node for the last element if it exists, otherwise undefined
   * @param  {String[]} path
   * @return {Node}
   */
  _search(path) {

    if (!path || !path.length) return this.root;

    let idx = Math.max(0, path.length - (this.n - 1)),
      node = this.root.child(path[idx++]);

    for (let i = idx; i < path.length; i++) {
      if (node) node = node.child(path[i]);
    }

    return node; // can be null
  }

  // LATER
  _chooseChild(parent, path, mlms) {

    // bail if we don't have maxLengthMatchingSequence
    if (!mlms || path.length < (mlms - 1)) return parent.select();

    let dbug = false;

    if (dbug) console.log('\nSo far: ', this._nodesToTokens(path)
      + ' with ' + parent.childNodes().length + ' nexts = ['
      + nodeStr(parent.childNodes()) + "]\n");

    let start = nodeStr(path, true);
    if (dbug) console.log("start: " + start);

    let child, nodes = path.slice(-(mlms - 1)),
      excludes = [];

    if (dbug) console.log('path: ', nodeStr(nodes));

    while (!child) {

      if (dbug) console.log('select: ', excludes, nodes.length);
      let candidate = parent.select(excludes);

      if (!candidate) {

        if (dbug) console.log('FAIL with excludes = [' + excludes + '], str="' + start + '"');
        return false // if no candidates left, return false;
      }

      //let check = nodes.slice(0).push(candidate)
      let check = this._nodesToTokens(nodes.slice());
      check.push(candidate.token);

      if (dbug) console.log('isSubArray?', check);

      if (isSubArray(check, this.input)) {
        if (dbug) console.log("Yes, excluding '" + candidate.token + "'");
        excludes.push(candidate.token);
        continue; // try again
      }

      if (dbug) console.log('No, done: ', candidate.token);
      child = candidate; // found a good one
    }

    return child;
  }
}

/////////////////////////////// Node //////////////////////////////////////////

class Node {

  constructor(parent, word) {

    this.children = {};
    this.parent = parent;
    this.token = word;
    this.count = 0;
  }

  /*
   * Find a (direct) child node with matching token, given a word or node
   * if word is undefined, then do prob-select
   */
  child(word) {
    let lookup = word;
    if (word.token) lookup = word.token;
    return this.children[lookup];
  }

  /*
   * increments count for a child node and returns it
   */
  addChild(word, count) {

    count = count || 1;
    let node = this.children[word];
    if (!node) {

      node = new Node(this, word);
      this.children[word] = node;
    }
    node.count += count;

    return node;
  }

  /*
   * Return a (direct) child node according to probability
   */
  select(filter) {

    function applyFilter(filter, nodes) {
      if (isFunction(filter)) {
        for (let i = nodes.length - 1; i >= 0; i--) {
          if (!filter(nodes[i].token)) nodes.splice(i, 1);
        }
      } else if (Array.isArray(filter)) {
        for (let i = nodes.length - 1; i >= 0; i--) {
          if (filter.indexOf(nodes[i].token) > -1) nodes.splice(i, 1);
        }
      } else {
        throw Error("Invalid filter: " + filter);
      }
      return nodes;
    }

    let selector, sum = 1,
      nodes = this.childNodes(),
      pTotal = 0;

    if (!nodes || !nodes.length)
      throw Error("Invalid arg to select(no children) " + this);

    if (filter) {

      nodes = applyFilter(filter, nodes);

      if (!nodes.length) return; // nothing left after filtering

      sum = nodes.reduce(function(total, n) {
        return total + n.probability();
      }, 0);
    }

    selector = Math.random() * sum;

    for (let i = 0; i < nodes.length; i++) {

      pTotal += nodes[i].probability();
      if (selector < pTotal) {
        // make sure we don't return a sentence start (<s/>) node
        let result = nodes[i].token === SSDLM ? nodes[i].select() : nodes[i];
        if (!result) throw Error('Unexpected state');
        return result
      }
    }

    throw Error(this + '\nno hit for select() with filter: ' + filter +
      "\nnodes(" + nodes.length + ") -> " + nodes);
  }

  isLeaf() {
    return this.childCount() < 1;
  }

  childNodes() {
    return Object.values(this.children);
  }

  childCount() {
    let sum = 0;
    for (let k in this.children) {
      if (k === SSDLM) continue;
      sum += this.children[k].count;
    }
    return sum;
  }

  probability() {
    return this.parent ? this.count / this.parent.childCount() : -1;
  }

  toString() {
    return this.parent ? this.token + '(' + this.count +
      '/' + this.probability().toFixed(3) + '%)' : 'Root'
  }

  stringify(theNode, str, depth, sort) {

    let i, j, k, node, mn = theNode,
      l = [],
      indent = '\n';

    sort = sort || false;

    for (k in theNode.children) l.push(theNode.children[k]);

    if (!l.length) return str;

    if (sort) l.sort();

    for (j = 0; j < depth; j++) indent += '    ';

    for (i = 0; i < l.length; i++) {

      node = l[i];
      if (!node) break;
      let tok = this._encode(node.token);
      str += indent + tok;

      if (!node.count)
        err("ILLEGAL FREQ: " + node.count + " " + mn.token + "," + node.token);

      if (node.parent) str += " [" + node.count + ",p=" +
        (node.probability().toFixed(3)) + "] {";

      str = !this.childCount() ? this.stringify(node, str, depth + 1, sort) : str + '}';
    }

    indent = '\n';
    for (j = 0; j < depth - 1; j++) indent += "    ";

    return str + indent + "}";
  }

  asTree(sort) {

    let s = this.token + ' ';
    if (this.parent) {
      s += '(' + this.count + ')->';
    }
    s += '{';
    return this.childCount() ? this.stringify(this, s, 1, sort) : s + '}';
  }

  _encode(tok) {

    if (tok === '\n') tok = '\\n';
    if (tok === '\r') tok = '\\r';
    if (tok === '\t') tok = '\\t';
    if (tok === '\r\n') tok = '\\r\\n';
    return tok;
  }
}

// --------------------------------------------------------------

function nodeStr(nodes, format) {
  if (format) {
    let a = [];
    for (let i = 0; i < nodes.length; i++)
      a.push(nodes[i].token);
    return RiTa.untokenize(a);
  }
  let s = '';
  for (let i = 0; i < nodes.length; i++) {
    s += nodes[i].token + ','
  }
  return s;
}

function isSubArray(find, arr) {
  OUT: for (let i = find.length - 1; i < arr.length; i++) {
    for (let j = 0; j < find.length; j++) {
      //console.log('check:', find[find.length - j -1] +' =? '+arr[i-j]);
      if (find[find.length - j - 1] !== arr[i - j]) {
        continue OUT;
      }
      if (j === find.length - 1)
        return true;
    }
  }
  return false;
}

function err() {
  let msg = "[RiTa] " + arguments[0];
  for (let i = 1; i < arguments.length; i++)
    msg += '\n' + arguments[i];
  throw Error(msg);
}

function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

RiTa.Markov = Markov;
module && (module.exports = Markov);
