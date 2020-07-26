[![current version](https://img.shields.io/npm/v/redis-prebuilt.svg)](https://www.npmjs.com/package/redis-prebuilt)
[![Build Status](https://travis-ci.org/saiichihashimoto/redis-prebuilt.svg?branch=master)](https://travis-ci.org/saiichihashimoto/redis-prebuilt)
[![Coverage Status](https://coveralls.io/repos/github/saiichihashimoto/redis-prebuilt/badge.svg?branch=master)](https://coveralls.io/github/saiichihashimoto/redis-prebuilt?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


Install [redis](https://github.com/antirez/redis/) prebuilt binaries using npm. This module installs redis without having to compile anything.

Redis is an in-memory database that persists on disk.

# Installation

```bash
npm install redis-prebuilt

# Now run it!
redis-server

# Other available commands:
redis-benchmark
redis-check-aof
redis-check-rdb
redis-cli
redis-sentinel
```

# Usage

The latest version of Redis and ~/.redis-prebuilt are the defaults. You can set a desired version and download folder through environment variables:

```bash
REDIS_DOWNLOADDIR
REDIS_VERSION
```

For Example:

```bash
export REDIS_DOWNLOADDIR='./' REDIS_VERSION=5.0.3
redis --port 400
```

# Inspiration

This is a Redis version of [https://github.com/winfinit/mongodb-prebuilt](https://github.com/winfinit/mongodb-prebuilt)
