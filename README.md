# kompar

**Recursive file comparison utility.**

[![NPM Version](https://badge.fury.io/js/kompar.png)](http://badge.fury.io/js/kompar)
[![Dependency Status](https://gemnasium.com/AlphaHydrae/kompar.png)](https://gemnasium.com/AlphaHydrae/kompar)
[![Build Status](https://secure.travis-ci.org/AlphaHydrae/kompar.png)](http://travis-ci.org/AlphaHydrae/kompar)

## Usage

Install it globally to use it from the command line:

```bash
npm install -g kompar
```

Use it to compute the hash of files:

```bash
# hash one file
kompar /path/to/file

# hash multiple files
kompar /path/to/file1 /path/to/file2

# generate a JSON report
kompar --json /path/to/file1 /path/to/file2
```

## Meta

* **Author:** Simon Oulevay (Alpha Hydrae)
* **License:** MIT (see [LICENSE.txt](https://github.com/AlphaHydrae/kompar/blob/master/LICENSE.txt))
