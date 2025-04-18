# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) (you find TL;DR at the end of this change log),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.12.0]
### Added
* `--publish` option to import command to publish automatically objects with status public
* `--with-internal` option to export command to persist information about object status for publication in import

## [2.11.0]
### Added
* import/export plugin settings objects #26641

### Changed
* We've come out of BETA!


--------------------------------------------------------------------

All versions should have at least one of this sections:
* ### Added
* ### Changed
* ### Deprecated
* ### Removed
* ### Fixed
* ### Security

Name of the version should have semver and date of production build. We DO NOT copy commit messages as changes! Before building production you have to add release in GitLab with tag matching new semver and changelog in it's description. After production build changelog must be copied to new Flotiq blog post and to email to our users.
New unreleased features must be added in [Unreleased] section on top of the Change log.
