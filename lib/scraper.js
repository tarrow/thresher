// # Scraper
//
// > Scraper class in the Node.js Thresher package.
// >
// > author: [Richard Smith-Unna](http://blahah/net)
// > email: <richard@contentmine.org>
// > copyright: Shuttleworth Foundation (2014)
// > license: [MIT](https://github.com/ContentMine/thresher/blob/master/LICENSE-MIT)
//
// ---
//
// ## Description
//
// Scrapers can scrape DOMs (or URLs from which DOMs can be rendered). They are
// created from ScraperJSON definitions, and return scraped data as structured
// JSON. Scraping a provided DOM is synchronous, while scraping a URL is
// asynchronous. and can be monitored by subscribing to events.
//
// Scrapers emit the following events:
// * `error`: on any error. If not intercepted, these events will throw.
// * `elementCaptured` ***(data)***: when an element is successfully captured.
// * `elementCaptureFailed` ***(element)***: when element capture fails.
// * `downloadComplete`: when a download finished.
// * `done` ***(results)***: when the entire scraping process is finished
//
// ## Usage
//
// The Scraper class is created from a ScraperJSON definition:
//
//     var scraper = new Scraper(definition);
//
// The scraper is them executed on a DOM:
//
//     scraper.scrapeDoc(doc);
//

var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , file = require('./file.js')
  , Downloader = require('./download.js')
  , url = require('./url.js')
  , dom = require('./dom.js')
  , Ticker = require('./ticker.js')
  , request = require('request')
  , HeadlessRenderer = require('./renderer/headless.js')
  , BasicRenderer = require('./renderer/basic.js')
  , ElementTree = require('./elementTree.js').ElementTree;

var Scraper = function(definition, headless) {
  // EventEmitter.call(this);
  if (this.validate(definition)) {
    // The definition is laoded into the properties
    // of the scraper. Optional properties are set to
    // null if they are missing.
    this.url = definition.url;
    this.doi = definition.doi || null;
    this.name = definition.name;
    this.elements = definition.elements;
    this.followables = definition.followables || [];
    this.actions = definition.actions || null;

    // The renderer is chosen. Basic by default (see BasicRenderer),
    // but if the user specifies headless rendering, or if there are
    // any interactions to perform on the page, the renderer is Headless
    // (see HeadlessRenderer).
    if (headless || this.actions) {
      this.renderer = new HeadlessRenderer();
    } else {
      this.renderer = new BasicRenderer();
    }

    // Elements are processed into a queue. Because some elements
    // depend on following URLs specified by other elements, dependencies
    // are resolved into a tree. The scraping proceeds by starting at the
    // root of the tree and scraping all the child elements. Any with
    // dependents are then rendered and their children scraped, and so on.
    this.loadElements();
    this.tree = new ElementTree(this.elementsArray);
    this.follow_urls = {};
    this.results = {};

    // In order to resolve follows efficiently, we store rendered documents
    // in an object using their element name as the key. The starting URL
    // is stored with the key 'root'.
    this.docs = {};
  } else {
    return null;
  }
}

// Scraper inherits from EventEmitter
util.inherits(Scraper, EventEmitter);

// Validate a scraperJSON definition
//
Scraper.prototype.validate = function(def){
  var problems = [];
  // url key must exist
  if (!def.url) {
    problems.push('must have "url" key');
  }
  // elements key must exist
  if(!def.elements) {
    problems.push('must have "elements" key');
  } else {
    // there must be at least 1 element
    if (Object.keys(def.elements).length == 0) {
      problems.push('no elements were defined');
    } else {
      // each element must have a selector
      var elements = def.elements;
      for (k in elements) {
        var e = elements[k];
        if (!e.selector) {
          problems.push('element ' + k + ' has no selector');
        }
      }
    }
  }
  if (problems.length > 0) {
    this.emit('error', new Error('invalid ScraperJSON definition: \n' +
                       problems.join('\n')));
  }
  return true;
}

// Check if this scraper applies to a given URL
Scraper.prototype.matchesURL = function(theUrl) {
  var regex = new RegExp(this.url);
  return regex.test(theUrl);
}

// Load elements from a dictionary of nested objects
// to a dictionary of nested scrapers, also
// storing all elements in a flat array for rapid iteration
Scraper.prototype.loadElements = function() {
  this.elementsArray = getChildElements(this);
}

// Flatten an element tree by recursion
// add the key of each element to the element
// as name. Include followables.
function getChildElements(obj) {
  var elementsArray = [];
  // process followables first, they
  // will be excluded from results later
  if (obj.followables) {
    for (var key in obj.followables) {
      var element = obj.followables[key];
      element.name = key;
      elementsArray.push(element);
      elementsArray.concat(getChildElements(element));
    }
  }
  if (obj.elements) {
    for (var key in obj.elements) {
      var element = obj.elements[key];
      element.name = key;
      elementsArray.push(element);
      elementsArray.concat(getChildElements(element));
    }
  }
  return elementsArray;
}

// Restore scraping results to the structure of the
// input scraper
Scraper.prototype.structureResults = function() {
  var scraper = this;
  var cleanResults = {};
  fillChildResults(scraper, scraper.elements, cleanResults);
  return cleanResults;
}

// Recursively populate a results object with scraping results,
// following the structure of the scraper element tree by
// depth-first recursion
function fillChildResults(scraper, obj, newRes) {
  var baseKeys = ['selector', 'attribute', 'download', 'regex', 'follow', 'name'];
  for (var key in obj) {
    if (baseKeys.indexOf(key) >= 0) {
      // ignore base keys
      continue;
    }
    newRes[key] = {};
    // add any result value to the element
    if (scraper.results.hasOwnProperty(key)) {
      newRes[key].value = scraper.results[key];
    }
    // continue structuring child results
    var element = obj[key];
    fillChildResults(scraper, element, newRes[key]);
  }
}

// Scrape the provided URL
// Start at the root node.
// Render the root URL and save the document in the docs object.
// Iterate through the child elements scraping them.
// For each child element, recurse.
Scraper.prototype.scrapeUrl = function(theUrl, node) {
  var scraper = this;
  scraper.startTicker();
  scraper.results = {};
  node = node || scraper.tree.root;
  // render the base url and load the HTML into a DOM
  scraper.renderer.render(theUrl, this.actions);
  var binidx = 0;
  this.ticker.elongate();
  scraper.renderer.on('urlRendered', function(theUrl, html) {
    scraper.emit('urlRendered', theUrl);
    // the children of the root node have no dependencies, so we scrape
    // all the elements in it from the base URL
    var doc = dom.render(html);
    scraper.docs[theUrl] = doc;
    node.children.forEach(function(child) {
      var hasChildren = child.children.length > 0;
      scraper.scrapeElement(doc, child.element, theUrl, null, hasChildren);
      // climb down the tree for any children with children of their own
      if (hasChildren) {
        var nextUrl = scraper.follow_urls[child.element.name];
        nextUrl = url.cleanResourcePath(nextUrl, theUrl);
        scraper.scrapeUrl(nextUrl, child);
      }
    });
    scraper.ticker.tick();
  });
}

// Scrape a specific element
Scraper.prototype.scrapeElement = function(doc, element, scrapeUrl, key, follow_url) {
  var scraper = this;
  follow_url = typeof follow_url !== 'undefined' ? follow_url : false;
  // extract element
  key = key || element.name;
  var selector = element.selector;
  var attribute = element.attribute;
  var matches = dom.select(selector, doc);
  if (!scraper.results.hasOwnProperty(key)) {
    scraper.results[key] = [];
  }
  for (var i = 0; i < matches.length; i++) {
    var res = matches[i];
    if (res) {
      res = dom.getAttribute(res, attribute);

      // run regex if applicable
      if (element.regex) {
        res = scraper.runRegex(res, element.regex)
      }

      // save the result
      this.results[key].push(res);
      scraper.emit('elementCaptured', key, res);

      // if the element has followers, save the url
      if (follow_url) {
        this.follow_urls[key] = res;
      }

      // process downloads
      if (element.download) {
        scraper.downloadElement(element, res, scrapeUrl);
      }
    } else {
      scraper.emit('elementCaptureFailed', element);
    }
  }
  scraper.emit('elementResults', key, this.results[key]);
}

Scraper.prototype.startTicker = function() {
  var scraper = this;
  if (!scraper.ticker) {
    scraper.ticker = new Ticker(0, function() {
      var results = scraper.structureResults();
      scraper.emit('end', scraper.results, results);
    });
  }
}

// Download the resource specified by an element
Scraper.prototype.downloadElement = function(element, res, scrapeUrl) {
  if (!this.down) {
    this.down = new Downloader();
  }
  var scraper = this;
  // rename downloaded file?
  var rename = null;
  if (typeof element.download === 'object') {
    if (element.download.rename) {
      rename = element.download.rename;
    }
  }
  // set download running
  scraper.down.downloadResource(res, scrapeUrl, rename);
  // add it to the task ticker
  scraper.ticker.elongate();
  scraper.down.on('downloadComplete', function() {
    scraper.emit('downloadCompleted', res);
    scraper.ticker.tick();
  });
  scraper.down.on('error', function(err) {
    scraper.emit('downloadError', err);
    scraper.ticker.tick();
  });
}

// Run regular expression on a captured element
Scraper.prototype.runRegex = function(string, regex) {
  var re = new RegExp(regex);
  var match = re.exec(string);
  var matches = [];
  while (match != null) {
    var captures = match.slice(1);
    if (re.global) {
      matches.push(captures);
    } else {
      matches = captures;
      break;
    }
    match = re.exec(string);
  }
  return matches;
}

module.exports = Scraper;