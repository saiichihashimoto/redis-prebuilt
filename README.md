[![current version](https://img.shields.io/npm/v/redis-prebuilt.svg)](https://www.npmjs.com/package/redis-prebuilt)
[![Build Status](https://travis-ci.org/saiichihashimoto/redis-prebuilt.svg?branch=master)](https://travis-ci.org/saiichihashimoto/redis-prebuilt)
[![codecov](https://codecov.io/gh/saiichihashimoto/redis-prebuilt/branch/master/graph/badge.svg)](https://codecov.io/gh/saiichihashimoto/redis-prebuilt)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Greenkeeper badge](https://badges.greenkeeper.io/saiichihashimoto/redis-prebuilt.svg)](https://greenkeeper.io/)

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
export REDIS_DOWNLOADDIR='./' REDIS_VERSION=3.4.10
mongod --port 27018 --dbpath ./mongodb --logpath /dev/stdout
```

# Inspiration

This is a Redis version of https://github.com/winfinit/mongodb-prebuilt
