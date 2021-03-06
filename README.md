Thresher
----

[![NPM version](https://badge.fury.io/js/thresher.svg)][npm]
[![license MIT](http://b.repl.ca/v1/license-MIT-brightgreen.png)][license]
[![Downloads](http://img.shields.io/npm/dm/thresher.svg)][downloads]
[![Build Status](https://secure.travis-ci.org/ContentMine/thresher.png?branch=master)][travis]
[![Dependency Status](https://gemnasium.com/ContentMine/thresher.png)][gemnasium]
[![Coverage Status](https://img.shields.io/coveralls/ContentMine/thresher.svg)][coveralls]
[![Code Climate](https://codeclimate.com/github/ContentMine/thresher.png)][codeclimate]

[npm]: http://badge.fury.io/js/thresher
[travis]: http://travis-ci.org/ContentMine/thresher
[coveralls]: https://coveralls.io/r/ContentMine/thresher
[gemnasium]: https://gemnasium.com/ContentMine/thresher
[license]: https://github.com/ContentMine/thresher/blob/master/LICENSE-MIT
[codeclimate]: https://codeclimate.com/github/ContentMine/thresher
[downloads]: https://nodei.co/npm/thresher

**Thresher** is a library for modern web scraping in Node.js. It is unique in that:

- it is *headless*: URLs are rendered in a GUI-less browser, meaning the version of the HTML you scrape is the same one visitors would see on their screen
- it is *declarative*: Scrapers are defined in separate JSON files. This means no programming required! It also means any other software supporting the same format could use the same scraper definitions.

Thresher was developed as part of the [ContentMine](http://contentmine.org) stack for mining the academic literature.


## Installation

```bash
npm install --save thresher
```

## Usage

See [quickscrape](https://github.com/ContentMine/quickscrape) for a thorough example of thresher in action.

## Contributing

We are not yet accepting contributions, if you'd like to help please drop me an email (richard@contentmine.org) and I'll let you know when we're ready for that.

## Release History

- ***0.0.1*** - fork thresher from quickscrape
- ***0.0.2*** - solve the dependency problem by exposing binaries from installed packages
- ***0.0.3*** - fix rendering issue on some websites
- ***0.0.4*** - automatic scraper selection
- ***0.0.5*** - fix bug in ScraperBox for multiple matches
- ***0.0.6*** - refactor, headless rendering optional, multiple URLs, automatic scraper selection
- ***0.0.7*** - support scraperJSON v0.0.2: add regex capability, remove all logging, move to event-based design
- ***0.0.8*** - resolve URLs with head-follow requests; refactor to have a Scraper class; supply cookies to downloader; use jsdom-lite to forestall some of the worst installation issues (thanks to @darobin).
- ***0.0.9*** - fix broken release
- ***0.1.0*** - complete rewrite to support scraperJSON v0.1
- ***0.1.1*** - fixes for regexes, definition checking, cleanup logging
- ***0.1.2*** - fix bug in resolving relative paths, update dependencies, bring xpath dependency into local control to avoid a namespace-related regression in the main fork, and fix follow-ons.
- ***0.1.3*** - fix broken release where a dependency was left out of package.json.

## License
Copyright (c) 2014 [Shuttleworth Foundation](https://www.shuttleworthfoundation.org/).
Licensed under the MIT license.
